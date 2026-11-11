import { afterEach, expect, test, vi } from 'vitest';
import { installNativeUIHost } from '../src/host';
import { contentPressOnlyMutation, marker } from '../src/native/shared/dom';
import { createRuntime } from '../src/native/runtime';
import type {
  NativeUIOptions,
  NativeUIPlugin,
  NativeUISnapshot,
  NativeUIRuntimeHandle,
  NativeUIRuntimeOptions,
} from '../src/native/definitions';

const bridge = vi.hoisted(() => ({
  configure: vi.fn(async () => ({ supported: true })),
  getWebViewMetrics: vi.fn(async () => ({ radius: 48 })),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
  update: vi.fn(async (snapshot: NativeUISnapshot) => ({ revision: snapshot.revision })),
  clear: vi.fn(async () => {}),
}));
installNativeUIHost({
  plugin: bridge as unknown as NativeUIPlugin,
  getPlatform: () => 'ios',
  isPluginAvailable: () => true,
});
import { enableNativeUI } from '../src/native';

let handle: NativeUIRuntimeHandle | undefined;
afterEach(async () => {
  await handle?.destroy();
  handle = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

const mutation = (element: Element, className: string) => {
  const observer = new MutationObserver(() => {});
  observer.observe(element, { attributes: true, attributeOldValue: true });
  element.setAttribute('class', className);
  const record = observer.takeRecords()[0];
  observer.disconnect();
  return record;
};

for (const tag of ['ion-item', 'ion-card']) {
  test(`${tag} press/release is ignored, but real class changes are retained`, () => {
    document.body.innerHTML = `<ion-content><${tag} class="ios row"></${tag}></ion-content>`;
    const row = document.querySelector(tag)!;
    expect(contentPressOnlyMutation(mutation(row, 'ios row ion-activated'))).toBe(true);
    expect(contentPressOnlyMutation(mutation(row, 'ios row'))).toBe(true);
    expect(contentPressOnlyMutation(mutation(row, 'ios row selected ion-activated'))).toBe(false);
    expect(contentPressOnlyMutation(mutation(row, 'ios row'))).toBe(false);
    const record = mutation(row, 'ios row ion-activated');
    row.classList.add('hidden');
    expect(contentPressOnlyMutation(record)).toBe(false);
  });
}

for (const markup of [
  '<ion-button></ion-button>',
  '<ion-content><ion-item data-native-ui="button"></ion-item></ion-content>',
  '<ion-content><ion-item><ion-button data-native-ui="button"></ion-button></ion-item></ion-content>',
  '<ion-item></ion-item>',
  '<ion-content><div data-native-ui="button"><ion-item></ion-item></div></ion-content>',
  `<ion-content><div ${marker}><ion-item></ion-item></div></ion-content>`,
  '<ion-content><ion-item><ion-segment></ion-segment></ion-item></ion-content>',
  `<ion-content><ion-item><div ${marker}></div></ion-item></ion-content>`,
]) {
  test(`keeps mutations for controls, non-content rows and native descendants: ${markup}`, () => {
    document.body.innerHTML = markup;
    const row = document.querySelector('ion-item, ion-button')!;
    expect(contentPressOnlyMutation(mutation(row, 'ion-activated'))).toBe(false);
  });
}

const fixture = async (options: NativeUIRuntimeOptions = {}, publicEntry = false) => {
  document.body.innerHTML =
    '<ion-app><main class="ion-page"><ion-header><ion-toolbar><ion-button class="ios">Sort</ion-button></ion-toolbar></ion-header><ion-content><ion-item class="ios">Bean</ion-item></ion-content><ion-tabs><ion-tab-bar class="ios"><ion-tab-button><ion-label>Journal</ion-label></ion-tab-button></ion-tab-bar></ion-tabs></main></ion-app>';
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none', fontSize: '16px', color: 'rgb(0,0,0)' });
    element.getBoundingClientRect = () => ({ x: 10, y: 10, left: 10, top: 10, right: 90, bottom: 54, width: 80, height: 44 }) as DOMRect;
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
  const config = { verticalBars: { enabled: false }, ...options };
  handle = publicEntry
    ? await enableNativeUI(config)
    : await createRuntime(document, bridge as unknown as NativeUIPlugin, config, () => false);
  if (publicEntry) expect(handle.getStatus().reason).toBeUndefined();
  const button = document.querySelector('ion-button')!;
  const row = document.querySelector('ion-item')!;
  const tabs = document.querySelector('ion-tab-bar')!;
  const controls = typeof options.controls === 'object' ? options.controls : undefined;
  await vi.waitFor(() => {
    expect(button.hasAttribute(marker)).toBe(controls?.button !== false);
    expect(tabs.hasAttribute(marker)).toBe(controls?.tabs !== false);
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const remove = vi.spyOn(button, 'removeAttribute');
  const removeTabs = vi.spyOn(tabs, 'removeAttribute');
  return { button, row, remove, removeTabs };
};

test('tab photo load and same-URL reload update the selected native item without changing its action ID', async () => {
  await fixture();
  const tab = document.querySelector('ion-tab-button')!;
  Object.assign(tab, { selected: true });
  const photo = document.createElement('img');
  photo.src = '/profile.jpg';
  Object.assign(photo.style, { visibility: 'visible', opacity: '1', transform: 'none' });
  let loaded = false;
  Object.defineProperties(photo, {
    complete: { get: () => loaded },
    naturalWidth: { get: () => (loaded ? 64 : 0) },
    naturalHeight: { get: () => (loaded ? 64 : 0) },
  });
  photo.getBoundingClientRect = () => new DOMRect(10, 10, 24, 24);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage() {} } as unknown as CanvasRenderingContext2D);
  const encoded = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
  tab.prepend(photo);
  const item = () => bridge.update.mock.calls.at(-1)?.[0].controls.find((control) => control.kind === 'tab-bar')?.items[0];
  await vi.waitFor(() => expect(item()).toMatchObject({ selected: true, label: 'Journal' }));
  const id = item()!.id;
  expect(item()?.icon).toBeUndefined();
  loaded = true;
  for (const icon of ['first', 'reloaded']) {
    encoded.mockReturnValue(`data:image/png;base64,${icon}`);
    photo.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(item()).toMatchObject({ id, selected: true, icon }));
  }
});

test.each<NativeUIRuntimeOptions>([{}, { source: 'auto' }])(
  'pressing a content row does not reveal the projected toolbar; real updates still refresh it (%j)',
  async (options) => {
    const { row, button, remove } = await fixture(options);
    for (const pressed of [true, false]) {
      row.classList.toggle('ion-activated', pressed);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(remove.mock.calls.filter(([name]) => name === marker)).toHaveLength(0);
    }
    row.classList.add('selected');
    await vi.waitFor(() => expect(remove.mock.calls.some(([name]) => name === marker)).toBe(true));
    expect(button.hasAttribute(marker)).toBe(true);
  },
);

test('public startup retains press-sensitive observation for custom extensions', async () => {
  const { row, remove } = await fixture({ extensions: [{ name: 'custom', selector: '[data-custom]', read: () => ({ props: {} }) }] }, true);
  row.classList.add('ion-activated');
  await vi.waitFor(() => expect(remove.mock.calls.some(([name]) => name === marker)).toBe(true));
});

test.each<NativeUIOptions>([
  { controls: { tabs: true, button: true } },
  { controls: { tabs: true, button: false, buttonGroup: false, backButton: false } },
  { controls: { tabs: false, button: true } },
])('public startup preserves projected sources during row presses with %j', async (options) => {
  const { row, remove, removeTabs } = await fixture(options, true);
  const remeasured = () => [...remove.mock.calls, ...removeTabs.mock.calls].some(([name]) => name === marker);
  for (const pressed of [true, false]) {
    row.classList.toggle('ion-activated', pressed);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(remeasured()).toBe(false);
    expect(row.classList.contains('ion-activated')).toBe(pressed);
  }
  row.classList.add('selected');
  await vi.waitFor(() => expect(remeasured()).toBe(true));
});

test.each(['label', 'class'])('public startup processes a real %s update in the same batch as press feedback', async (change) => {
  const { row, button, remove } = await fixture({}, true);
  row.classList.add('ion-activated');
  if (change === 'label') button.textContent = 'Updated';
  else row.classList.add('selected');
  await vi.waitFor(() => expect(remove.mock.calls.some(([name]) => name === marker)).toBe(true));
  if (change === 'label') {
    await vi.waitFor(() =>
      expect(bridge.update.mock.calls.at(-1)?.[0].controls.some((control) => control.items.some((item) => item.label === 'Updated'))).toBe(
        true,
      ),
    );
  }
  expect(row.classList.contains('ion-activated')).toBe(true);
});
