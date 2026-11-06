import { afterEach, expect, test, vi } from 'vitest';
import { prehideVerticalBarsToolbarSources } from '../src/native/prehide';
import { createVerticalBarsWebProjection } from '../src/native/vertical-bars-web';
import { getProjectionState } from '../src/native/shared/covered-source';
import type { NativeUIPlugin } from '../src/native/definitions';
import { createRuntime } from '../src/native/runtime';
import { suspendNativeUI } from '../src/native-integration';
import { setVerticalBarsPlacement } from '../src/native/shared/dom';

const projectionState = getProjectionState(document);

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const emit = (page: HTMLElement, type: string) => page.dispatchEvent(new CustomEvent(type, { bubbles: true }));

const size = (element: Element, x: number) => {
  (element as HTMLElement).getBoundingClientRect = () =>
    ({ x, y: 10, left: x, top: 10, right: x + 80, bottom: 54, width: 80, height: 44 }) as DOMRect;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Issue #347: pushing a tabs shell whose back button lives in a nested tab page.
// During the outer push Ionic emits no lifecycle events for the nested page.
test('the web back clone is not re-created or painted while native owns the rail', async () => {
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars">
    <main class="ion-page" id="root">
      <ion-header><ion-toolbar><ion-buttons slot="end"><ion-button id="gear" data-vertical-bars="true">Gear</ion-button></ion-buttons></ion-toolbar></ion-header>
    </main>
    <main class="ion-page ion-page-hidden" id="shell">
      <ion-tabs><ion-router-outlet><main class="ion-page" id="tab">
        <ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button id="back" data-vertical-bars="true"></ion-back-button></ion-buttons></ion-toolbar></ion-header>
      </main></ion-router-outlet></ion-tabs>
    </main>
  </ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none', fontSize: '16px', color: 'rgb(0,0,0)' });
    size(element, 10);
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const back = document.querySelector<HTMLIonBackButtonElement>('#back')!;
  back.attachShadow({ mode: 'open' }).innerHTML = '<button part="native"><span class="button-inner"></span></button>';

  // Bridge stub: acknowledge every snapshot immediately.
  const plugin = {
    addListener: async () => ({ remove: async () => {} }),
    update: async (snapshot: any) => {
      return { revision: snapshot.revision };
    },
    clear: async () => {},
  } as unknown as NativeUIPlugin;

  const prehide = prehideVerticalBarsToolbarSources(document, () => true);
  const native = await createRuntime(document, plugin, { controls: 'verticalOnly' }, () => true);
  const web = createVerticalBarsWebProjection(
    document,
    { controls: 'verticalOnly' },
    () => native.getStatus().projected === 0,
    projectionState.isTransitionActive,
  );
  const created: HTMLElement[] = [];
  const creations = new MutationObserver((records) => {
    for (const record of records)
      for (const node of Array.from(record.addedNodes))
        if (node instanceof HTMLElement && node.matches('.ios-theme-vertical-bars-back-button-projection')) created.push(node);
  });
  creations.observe(document.body, { subtree: true, childList: true });
  try {
    // Wait for a real Native ACK; Web clones use the same source marker.
    await vi.waitFor(() => expect(native.getStatus().projected).toBeGreaterThan(0));

    const shell = document.querySelector<HTMLElement>('#shell')!;
    const root = document.querySelector<HTMLElement>('#root')!;
    // Push begins: the destination mounts invisible, then WillEnter/WillLeave fire.
    shell.classList.replace('ion-page-hidden', 'ion-page-invisible');
    emit(shell, 'ionViewWillEnter');
    emit(root, 'ionViewWillLeave');
    const release = await suspendNativeUI([shell, root], { navigation: true, direction: 'forward' });

    // The transition runs for ~300ms. Simulate per-frame rect movement + mutations.
    for (let frameIndex = 0; frameIndex < 20; frameIndex++) {
      document.querySelectorAll<HTMLElement>('#shell, #shell *').forEach((element) => size(element, 10 + frameIndex * 10));
      shell.setAttribute('data-frame', String(frameIndex)); // mutation traffic like class/style churn
      await nextFrame();
      await nextFrame();
    }
    shell.classList.remove('ion-page-invisible');
    release(false);
    emit(root, 'ionViewDidLeave');
    emit(shell, 'ionViewDidEnter');
    await nextFrame();
    await nextFrame();

    expect(created.length).toBe(0);
  } finally {
    creations.disconnect();
    await web.destroy();
    await native.destroy();
    prehide.stop();
  }
});

// The suppression must hold existing Web ownership mid-epoch, not just block
// new clones: a native sources gap must not strip an existing projection.
test('suppression keeps an existing projection through the epoch', async () => {
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars">
    <main class="ion-page"><ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button id="back" data-vertical-bars="true"></ion-back-button></ion-buttons></ion-toolbar></ion-header></main>
  </ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1' });
    size(element, 10);
  });
  const back = document.querySelector<HTMLIonBackButtonElement>('#back')!;
  back.attachShadow({ mode: 'open' });
  setVerticalBarsPlacement(back, true);
  let enabledFlag = true;
  let suppressedFlag = false;
  const web = createVerticalBarsWebProjection(
    document,
    { controls: 'verticalOnly' },
    () => enabledFlag,
    () => suppressedFlag,
  );
  const cloneSelector = '.ios-theme-vertical-bars-back-button-projection';
  try {
    await vi.waitFor(() => expect(document.querySelector(cloneSelector)).toBeTruthy());
    // Epoch opens while native owns nothing: enabled() flips false mid-epoch.
    enabledFlag = false;
    suppressedFlag = true;
    back.setAttribute('data-churn', '1');
    await nextFrame();
    await nextFrame();
    expect(document.querySelector(cloneSelector)).toBeTruthy();
    // Epoch closes: normal ownership release resumes.
    suppressedFlag = false;
    back.setAttribute('data-churn', '2');
    await vi.waitFor(() => expect(document.querySelector(cloneSelector)).toBeNull());
  } finally {
    await web.destroy();
  }
});
