import { observeVerticalBarsModals, movingModal, followingModal, modalRequestedPixels, modalMotionEvent } from '../src/native/shared/modal';
import { afterEach, expect, test, vi } from 'vitest';
import { coverOverlayBackground, usesCoveredBackground } from '../src/native/overlays/covered-overlay';
import type { CoveredSnapshots } from '../src/native/shared/covered-snapshot';

afterEach(() => document.body.replaceChildren());
test('presentation never waits for the bridge or changes Ionic visibility/animation', () => {
  const modal = document.createElement('ion-modal');
  document.body.append(modal);
  const begin = vi.fn(() => new Promise<void>(() => {}));
  const builder = vi.fn();
  const snapshots = { begin, retireRestoration: vi.fn() } as unknown as CoveredSnapshots;
  document.addEventListener('ionModalWillPresent', () => coverOverlayBackground(modal, snapshots), { capture: true, once: true });
  modal.addEventListener('ionModalWillPresent', () => {
    modal.enterAnimation = builder;
  });
  modal.dispatchEvent(new Event('ionModalWillPresent', { bubbles: true }));
  expect(begin).toHaveBeenCalledOnce();
  expect(modal.style.visibility).toBe('');
  expect(modal.enterAnimation).toBe(builder);
});
test.each(['interactive', 'no-backdrop'])('%s modal keeps its live Web background', (kind) => {
  const modal = document.createElement('ion-modal');
  if (kind === 'interactive') {
    modal.initialBreakpoint = 0.5;
    modal.backdropBreakpoint = 0.75;
  }
  if (kind === 'no-backdrop') modal.showBackdrop = false;
  const begin = vi.fn();
  const retireRestoration = vi.fn();
  coverOverlayBackground(modal, { begin, retireRestoration } as unknown as CoveredSnapshots);
  expect(retireRestoration).toHaveBeenCalledOnce();
  expect(begin).not.toHaveBeenCalled();
});

test.each(['sheet', 'card'])('%s motion spans dragging and settling, without treating a tap as movement', async (kind) => {
  vi.useFakeTimers();
  document.body.innerHTML = '<ion-app class="ios-theme-vertical-bars"><ion-modal></ion-modal></ion-app>';
  const modal = document.querySelector('ion-modal')!;
  if (kind === 'sheet') modal.breakpoints = [0, 0.5, 0.8];
  else modal.presentingElement = document.body;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('part', 'content');
  modal.attachShadow({ mode: 'open' }).append(wrapper);
  let y = 136;
  let running = false;
  wrapper.getBoundingClientRect = () => DOMRect.fromRect({ y, width: innerWidth, height: innerHeight });
  wrapper.getAnimations = () => (running ? [{ playState: 'running' } as Animation] : []);
  Object.defineProperty(wrapper, 'offsetWidth', { value: innerWidth });
  const events: boolean[] = [];
  const listener = (event: Event) => {
    events.push((event as CustomEvent).detail.moving);
    if (!(event as CustomEvent).detail.moving)
      expect(modal.style.getPropertyValue('--ios-theme-vertical-bars-modal-offset-top')).toBe(`${y}px`);
  };
  window.addEventListener(modalMotionEvent, listener);
  const stop = observeVerticalBarsModals(document);
  try {
    modal.dispatchEvent(new CustomEvent('ionModalDidPresent', { bubbles: true }));
    expect(modalRequestedPixels(modal)).toBe('native');
    events.length = 0; // Initial surface selection is separate from the gesture's motion events.
    modal.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    modal.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(20);
    expect(movingModal(document)).toBeUndefined();
    y = 200;
    await vi.advanceTimersByTimeAsync(20);
    expect(movingModal(document)).toBe(modal);
    y = 300;
    await vi.advanceTimersByTimeAsync(20);
    expect(events).toEqual([true]);
    modal.dispatchEvent(new Event('pointercancel', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(40);
    expect(movingModal(document)).toBe(modal);
    expect(events).toEqual([true]);
    running = true;
    modal.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
    modal.dispatchEvent(new Event('pointerup', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(20);
    expect(movingModal(document)).toBe(modal);
    running = false;
    y = 136;
    vi.advanceTimersToNextFrame();
    expect(movingModal(document)).toBe(modal);
    vi.advanceTimersToNextFrame();
    expect(events).toEqual([true, false]);
    expect(movingModal(document)).toBeUndefined();
  } finally {
    stop();
    window.removeEventListener(modalMotionEvent, listener);
    vi.useRealTimers();
  }
});

test.each([
  [136, false, 'ion-button'],
  [220, false, 'ion-button'],
  [136, true, 'ion-button'],
  [220, true, 'ion-button'],
  [136, false, 'ion-buttons'],
  [220, false, 'ion-buttons'],
] as const)('rail reversal follows only below the boundary: y=%s, dismissing=%s, target=%s', async (initial, dismissing, tag) => {
  vi.useFakeTimers();
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars" style="--ios-theme-vertical-bars-toolbar-top:174px"><ion-modal><${tag} class="ios-theme-vertical-bars-toolbar-projection"></${tag}></ion-modal></ion-app>`;
  const modal = document.querySelector('ion-modal')!;
  const target = modal.querySelector(tag)!;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('part', 'content');
  Object.defineProperty(wrapper, 'offsetWidth', { value: innerWidth });
  wrapper.getAnimations = () => [];
  let y = initial;
  let railY = initial > 150 ? 244 : 174;
  wrapper.getBoundingClientRect = () => DOMRect.fromRect({ y, width: innerWidth, height: innerHeight });
  // Concealing a group's children can collapse its height without moving its anchor.
  target.getBoundingClientRect = () => DOMRect.fromRect({ y: railY, width: 48, height: tag === 'ion-buttons' ? 0 : 48 });
  modal.attachShadow({ mode: 'open' }).append(wrapper);
  const stop = observeVerticalBarsModals(document);
  try {
    modal.dispatchEvent(new CustomEvent('ionModalDidPresent', { bubbles: true }));
    if (dismissing) modal.dispatchEvent(new CustomEvent('ionModalWillDismiss', { bubbles: true }));
    modal.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(20);
    expect(followingModal(document)).toBeUndefined(); // A stationary touch is not motion.
    expect(modalRequestedPixels(modal)).toBe(dismissing ? 'image' : 'native');
    y -= 10;
    railY = initial > 150 ? 234 : 174;
    await vi.advanceTimersByTimeAsync(20);
    expect(movingModal(document)).toBe(modal);
    expect(followingModal(document)).toBe(dismissing || initial > 150 ? modal : undefined);
    for (const [nextY, nextRailY, follows] of [
      [100, 174, false],
      [200, 224, true],
      [80, 174, false],
      [230, 254, true],
    ] as const) {
      y = nextY;
      railY = nextRailY;
      await vi.advanceTimersByTimeAsync(20);
      expect(movingModal(document)).toBe(modal);
      expect(followingModal(document)).toBe(dismissing || follows ? modal : undefined);
      expect(modalRequestedPixels(modal)).toBe(dismissing || follows ? 'image' : 'native');
      expect(modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(follows);
    }
    modal.dispatchEvent(new Event('pointerup', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(40);
    expect(followingModal(document)).toBeUndefined();
    expect(modalRequestedPixels(modal)).toBe(dismissing ? 'image' : 'native');
  } finally {
    stop();
    vi.useRealTimers();
  }
});

test('non-interactive presentation and dismissal request images even while stationary above the boundary', () => {
  document.body.innerHTML =
    '<ion-app class="ios-theme-vertical-bars" style="--ios-theme-vertical-bars-toolbar-top:174px"><ion-modal><ion-button class="ios-theme-vertical-bars-toolbar-projection"></ion-button></ion-modal></ion-app>';
  const modal = document.querySelector('ion-modal')!;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('part', 'content');
  wrapper.getBoundingClientRect = () => DOMRect.fromRect({ y: 100, width: innerWidth, height: innerHeight - 100 });
  wrapper.getAnimations = () => [];
  Object.defineProperty(wrapper, 'offsetWidth', { value: innerWidth });
  modal.attachShadow({ mode: 'open' }).append(wrapper);
  modal.querySelector('ion-button')!.getBoundingClientRect = () => DOMRect.fromRect({ y: 174, width: 48, height: 48 });
  const stop = observeVerticalBarsModals(document);
  try {
    modal.dispatchEvent(new CustomEvent('ionModalWillPresent', { bubbles: true }));
    expect(movingModal(document)).toBeUndefined();
    expect(modalRequestedPixels(modal)).toBe('image');
    modal.dispatchEvent(new CustomEvent('ionModalDidPresent', { bubbles: true }));
    expect(modalRequestedPixels(modal)).toBe('native');
    modal.dispatchEvent(new CustomEvent('ionModalWillDismiss', { bubbles: true }));
    expect(movingModal(document)).toBeUndefined();
    expect(modalRequestedPixels(modal)).toBe('image');
    modal.dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
    expect(modalRequestedPixels(modal)).toBe('native');
  } finally {
    stop();
  }
});

test.each(['popover', 'alert', 'action-sheet', 'loading', 'picker'])('%s shares the blocking background handoff', (name) => {
  const overlay = document.createElement(`ion-${name}`);
  const snapshots = { begin: vi.fn(), retireRestoration: vi.fn() } as unknown as CoveredSnapshots;
  coverOverlayBackground(overlay, snapshots);
  expect(snapshots.begin).toHaveBeenCalledOnce();
  Object.assign(overlay, { showBackdrop: false });
  expect(usesCoveredBackground(overlay)).toBe(false);
});
test.each(['toast', 'menu'])('%s keeps its existing live route', (name) => {
  expect(usesCoveredBackground(document.createElement(`ion-${name}`))).toBe(false);
});

test('card modal uses the same prepared background handoff', () => {
  const modal = document.createElement('ion-modal');
  modal.presentingElement = document.body;
  const snapshots = { begin: vi.fn(), retireRestoration: vi.fn() } as unknown as CoveredSnapshots;
  coverOverlayBackground(modal, snapshots);
  expect(snapshots.begin).toHaveBeenCalledWith(document.body);
});

test.each([
  ['outer portrait right', 466, 8, 450, false, 84, true],
  ['outer landscape left', 678, 8, 662, true, 84, true],
  ['inner floating right', 951, 149, 653, false, 84, false],
  ['inner floating left', 951, 149, 653, true, 84, false],
  ['touching right boundary', 951, 214, 653, false, 84, false],
  ['touching left boundary', 951, 84, 653, true, 84, false],
  ['no side inset', 466, 8, 450, false, 0, false],
] as const)('%s selects the rail using logical dialog bounds', async (_name, viewport, x, width, left, inset, expected) => {
  vi.useFakeTimers();
  vi.stubGlobal('innerWidth', viewport);
  document.body.innerHTML = '<ion-app class="ios-theme-vertical-bars"><ion-modal></ion-modal></ion-app>';
  const app = document.querySelector('ion-app')!;
  if (left) app.classList.add('ios-theme-vertical-bars-left');
  app.style.setProperty(`--ios-theme-vertical-bars-safe-area-${left ? 'left' : 'right'}-resolved`, `${inset}px`);
  // An explicit zero must override the legacy native inset.
  app.style.setProperty('--ios-theme-vertical-bars-native-inset', '84px');
  const modal = document.querySelector('ion-modal')!;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('part', 'content');
  modal.attachShadow({ mode: 'open' }).append(wrapper);
  Object.defineProperties(wrapper, { offsetLeft: { value: x }, offsetWidth: { value: width } });
  wrapper.getAnimations = () => [];
  // Presentation transforms must not change rail eligibility.
  wrapper.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 8, width: 100, height: 300 });
  const stop = observeVerticalBarsModals(document);
  try {
    modal.dispatchEvent(new CustomEvent('ionModalDidPresent', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(40);
    expect(modal.classList.contains('ios-theme-vertical-bars-modal')).toBe(expected);
    app.classList.remove('ios-theme-vertical-bars');
    await vi.advanceTimersByTimeAsync(40);
    expect(modal.classList.contains('ios-theme-vertical-bars-modal')).toBe(false);
    expect(modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(false);
  } finally {
    stop();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});

test.each(['custom source', 'unmeasured target', 'unknown boundary'])(
  '%s retains dismissal images without assuming they are below the boundary',
  (kind) => {
    document.body.innerHTML =
      '<ion-app class="ios-theme-vertical-bars"><ion-modal><ion-button class="ios-theme-vertical-bars-toolbar-projection"></ion-button></ion-modal></ion-app>';
    const app = document.querySelector('ion-app')!;
    if (kind !== 'unknown boundary') app.style.setProperty('--ios-theme-vertical-bars-toolbar-top', '174px');
    const modal = document.querySelector('ion-modal')!;
    Object.assign(modal, { presented: true, overlayIndex: 1 });
    const content = document.createElement('div');
    content.setAttribute('part', 'content');
    Object.defineProperty(content, 'offsetWidth', { value: innerWidth });
    content.getBoundingClientRect = () => DOMRect.fromRect({ y: 100, width: innerWidth, height: innerHeight });
    content.getAnimations = () => [];
    modal.attachShadow({ mode: 'open' }).append(content);
    modal.querySelector('ion-button')!.getBoundingClientRect = () =>
      DOMRect.fromRect({ y: 174, width: kind === 'unmeasured target' ? 0 : 48, height: 48 });
    if (kind === 'custom source') {
      const custom = document.createElement('div');
      custom.setAttribute('data-native-ui-vertical-bars', '');
      modal.append(custom);
    }
    const stop = observeVerticalBarsModals(document);
    try {
      modal.dispatchEvent(new Event('ionModalDidPresent', { bubbles: true }));
      modal.dispatchEvent(new Event('ionModalWillDismiss', { bubbles: true }));
      expect(modalRequestedPixels(modal)).toBe('image');
      expect(modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(false);
    } finally {
      stop();
    }
  },
);

test.each([false, true])('a covered Modal keeps below-boundary image clipping with nested DOM=%s', (nested) => {
  document.body.innerHTML = '<ion-app class="ios-theme-vertical-bars" style="--ios-theme-vertical-bars-toolbar-top:174px"></ion-app>';
  const app = document.querySelector('ion-app')!;
  const create = (index: number, y: number) => {
    const modal = document.createElement('ion-modal');
    Object.assign(modal, { presented: true, overlayIndex: index });
    const content = document.createElement('div');
    content.setAttribute('part', 'content');
    Object.defineProperty(content, 'offsetWidth', { value: innerWidth });
    content.getBoundingClientRect = () => DOMRect.fromRect({ y: y - 24, width: innerWidth, height: innerHeight });
    content.getAnimations = () => [];
    modal.attachShadow({ mode: 'open' }).append(content);
    const target = document.createElement('ion-button');
    target.className = 'ios-theme-vertical-bars-toolbar-projection';
    target.setAttribute('data-native-ui-snapshot-visible', '');
    target.getBoundingClientRect = () => DOMRect.fromRect({ y, width: 48, height: 48 });
    modal.append(target);
    app.append(modal);
    return { modal, target };
  };
  const parent = create(1, 244);
  const stop = observeVerticalBarsModals(document);
  try {
    parent.modal.dispatchEvent(new Event('ionModalDidPresent', { bubbles: true }));
    expect(parent.modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(true);
    const child = create(2, 174);
    if (nested) {
      parent.modal.append(child.modal);
      const custom = document.createElement('div');
      custom.setAttribute('data-native-ui-vertical-bars', '');
      child.modal.append(custom);
    }
    child.modal.dispatchEvent(new Event('ionModalWillPresent', { bubbles: true }));
    expect(parent.target.hasAttribute('data-native-ui-snapshot-visible')).toBe(true);
    expect(parent.modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(true);
    expect(child.modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(false);
  } finally {
    stop();
  }
  expect(parent.modal.hasAttribute('data-native-ui-modal-rail-clip')).toBe(false);
});
