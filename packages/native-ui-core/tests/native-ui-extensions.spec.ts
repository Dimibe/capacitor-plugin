import { expect, test, vi } from 'vitest';
import { createRuntime } from '../src/native/runtime';
import type { NativeUIPlugin, NativeUISnapshot } from '../src/native/definitions';
import { defineNativeUI, enableNativeUI } from '../src/native';

const counter = () => defineNativeUI({ name: 'app.counter', selector: '[data-counter]', read: () => ({ props: { count: 0 } }) });

test('local extensions are stable configuration and require teardown before replacement', async () => {
  const extension = counter();
  const first = await enableNativeUI({ extensions: [extension] });
  try {
    expect(await enableNativeUI({ extensions: [extension] })).toBe(first);
    await expect(enableNativeUI({ extensions: [counter()] })).rejects.toThrow('different controls');
    await expect(enableNativeUI()).rejects.toThrow('different controls');
  } finally {
    await first.destroy();
  }
  const replacement = await enableNativeUI({ extensions: [counter()] });
  await replacement.destroy();
});

test('duplicate names and invalid selectors reject before acquiring shell resources', async () => {
  await expect(enableNativeUI({ extensions: [counter(), counter()] })).rejects.toThrow('unique');
  await expect(enableNativeUI({ extensions: [{ ...counter(), selector: '[' }] })).rejects.toThrow();
  const handle = await enableNativeUI({ extensions: [counter()] });
  await handle.destroy();
});

test('a temporarily unresolved native scroll owner preserves its accepted extension until explicit opt-out', async () => {
  document.body.innerHTML = '<main><div id="scroll"><div data-counter><button>Count</button></div></div></main>';
  const scroller = document.querySelector<HTMLElement>('#scroll')!;
  const source = document.querySelector<HTMLElement>('[data-counter]')!;
  const action = source.querySelector('button')!;
  const click = vi.fn();
  action.addEventListener('click', click);
  for (const element of document.querySelectorAll<HTMLElement>('*')) {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none', overflow: 'visible' });
    element.getBoundingClientRect = () => DOMRect.fromRect({ x: 10, y: 10, width: 100, height: 100 });
  }
  scroller.style.overflowY = 'auto';
  Object.defineProperties(scroller, {
    scrollWidth: { value: 100 },
    scrollHeight: { value: 600 },
    clientWidth: { value: 100 },
    clientHeight: { value: 100 },
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as MediaQueryList);
  let ready = true;
  let optedOut = false;
  const scrollElement = vi.fn(() => (ready ? scroller : null));
  const extension = defineNativeUI({
    name: 'app.counter',
    selector: '[data-counter]',
    scrollElement,
    read: () => (optedOut ? null : { props: { count: 1 }, actions: { increment: action } }),
  });
  const snapshots: NativeUISnapshot[] = [];
  let activate!: (event: { id: string; revision: number; sequence: number }) => void;
  const plugin = {
    addListener: async (name: string, callback: typeof activate) => {
      if (name === 'activate') activate = callback;
      return { remove: async () => {} };
    },
    update: async (snapshot: NativeUISnapshot) => {
      snapshots.push(snapshot);
      return { revision: snapshot.revision };
    },
    clear: async () => {},
  } as unknown as NativeUIPlugin;
  const runtime = await createRuntime(document, plugin, { source: 'extensions', extensions: [extension], nativeScroll: true });
  try {
    await vi.waitFor(() => expect(source.hasAttribute('data-native-ui-projected')).toBe(true));
    expect(snapshots.at(-1)?.controls[0].scroll).toBeDefined();
    const ownershipChanges: boolean[] = [];
    source.addEventListener('nativeUIChange', () => ownershipChanges.push(source.hasAttribute('data-native-ui-projected')));
    const reads = scrollElement.mock.calls.length;
    ready = false;
    runtime.markForCheck();
    await vi.waitFor(() => expect(scrollElement.mock.calls.length).toBeGreaterThan(reads));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(source.hasAttribute('data-native-ui-projected')).toBe(true);
    expect(snapshots.at(-1)?.controls).toHaveLength(1);
    expect(ownershipChanges).not.toContain(false);
    action.setAttribute('aria-disabled', 'true');
    const snapshot = snapshots.at(-1)!;
    activate({ id: snapshot.controls[0].extension!.actions.increment, revision: snapshot.revision, sequence: 1 });
    expect(click).not.toHaveBeenCalled();
    action.removeAttribute('aria-disabled');
    // The old scroller can stay connected after this source changes its binding.
    document.querySelector('main')!.append(source);
    runtime.markForCheck();
    await vi.waitFor(() => expect(snapshots.at(-1)?.controls).toHaveLength(0));
    scroller.append(source);
    ready = true;
    optedOut = true;
    runtime.markForCheck();
    await vi.waitFor(() => expect(source.hasAttribute('data-native-ui-projected')).toBe(false));
    await vi.waitFor(() => expect(snapshots.at(-1)?.controls).toHaveLength(0));
  } finally {
    await runtime.destroy();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});
