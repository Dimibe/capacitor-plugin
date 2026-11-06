import { createTabBarWidths } from '../src/native/shared/tab-bar-width';
import { mockSnapshotOwnership } from './snapshot-scope-fixture';
import { beforeEach } from 'vitest';
import { observeVerticalBarsModals } from '../src/native/shared/modal';
import { prehideVerticalBarsToolbarSources } from '../src/native/prehide';
import { expect, test, vi } from 'vitest';
import { createVerticalBarsWebProjection } from '../src/native/vertical-bars-web';
import { getProjectionState } from '../src/native/shared/covered-source';
const projectionState = getProjectionState(document);
const { sourcesChangedEvent } = projectionState;
import { setVerticalBarsPlacement } from '../src/native/shared/dom';

let owners: Set<HTMLElement>, visibleOwners: Set<HTMLElement>, preparedOwners: Set<HTMLElement>, nativeOwners: Set<HTMLElement>;
beforeEach(() => {
  ({ owners, visibleOwners, preparedOwners } = mockSnapshotOwnership(projectionState));
  nativeOwners = new Set();
  vi.spyOn(projectionState, 'nativeOwns').mockImplementation((source) => nativeOwners.has(source));
});

const mountEligibleBackButton = () => {
  document.body.innerHTML = `
    <ion-app class="ios-theme-vertical-bars">
      <main class="ion-page">
        <ion-header><ion-toolbar class="ios"><ion-back-button class="ios"></ion-back-button></ion-toolbar></ion-header>
      </main>
    </ion-app>`;
  const button = document.querySelector('ion-back-button') as HTMLElement;
  button.style.display = 'block';
  button.style.visibility = 'visible';
  button.getBoundingClientRect = () => ({ width: 44, height: 44 }) as DOMRect;
  // Eligibility requires prehide's per-page placement capture; mark it directly.
  setVerticalBarsPlacement(button, true);
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

test('disabling Ionic discovery leaves an otherwise eligible verticalBars back button under application ownership', async () => {
  mountEligibleBackButton();
  const enabled = createVerticalBarsWebProjection(document, {});
  await nextFrame();
  expect(enabled.getStatus().projected).toBe(1);
  expect(document.querySelector('.ios-theme-vertical-bars-back-button-projection')).not.toBeNull();
  const source = document.querySelector<HTMLElement>('ion-back-button')!;
  await enabled.destroy();
  expect(projectionState.getTarget(source)).toBeUndefined();

  mountEligibleBackButton();
  const handle = createVerticalBarsWebProjection(document, { ionic: { auto: false } });
  await nextFrame();

  expect(handle.getStatus()).toEqual({ state: 'web', projected: 0, updates: 0 });
  expect(document.querySelector('ion-back-button')?.hasAttribute('data-native-ui-projected')).toBe(false);
  expect(document.querySelector('.ios-theme-vertical-bars-back-button-projection')).toBeNull();

  await handle.destroy();
});

test('a back button inside an ion-buttons group is projected only through the back slot', async () => {
  document.body.innerHTML = `
    <ion-app class="ios-theme-vertical-bars">
      <main class="ion-page">
        <ion-header><ion-toolbar class="ios"><ion-buttons slot="start" class="ios"><ion-back-button class="ios"></ion-back-button></ion-buttons></ion-toolbar></ion-header>
      </main>
    </ion-app>`;
  const button = document.querySelector('ion-back-button') as HTMLElement;
  button.style.display = 'block';
  button.style.visibility = 'visible';
  button.getBoundingClientRect = () => ({ width: 44, height: 44 }) as DOMRect;
  setVerticalBarsPlacement(button, true);

  const handle = createVerticalBarsWebProjection(document, {});
  try {
    await nextFrame();
    expect(handle.getStatus().projected).toBe(1);
    expect(document.querySelectorAll('.ios-theme-vertical-bars-back-button-projection')).toHaveLength(1);
    expect(document.querySelector('.ios-theme-vertical-bars-toolbar-projection')).toBeNull();
  } finally {
    await handle.destroy();
  }
});

test('explicit standalone text action projects, forwards clicks and restores its source', async () => {
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars"><main class="ion-page">
    <ion-header><ion-toolbar><ion-button data-vertical-bars="true">Save</ion-button></ion-toolbar></ion-header>
    </main></ion-app>`;
  const source = document.querySelector<HTMLElement>('ion-button')!;
  source.style.display = 'block';
  source.style.visibility = 'visible';
  source.getBoundingClientRect = () => ({ width: 44, height: 44 }) as DOMRect;
  let clicks = 0;
  source.addEventListener('click', () => clicks++);
  const prehide = prehideVerticalBarsToolbarSources(document, undefined, undefined, { controls: { button: false } });
  const handle = createVerticalBarsWebProjection(document, {});
  try {
    await nextFrame();
    const clone = document.querySelector<HTMLElement>('.ios-theme-vertical-bars-toolbar-projection')!;
    expect(clone).not.toBeNull();
    expect(clone.textContent).toBe('Save');
    clone.click();
    expect(clicks).toBe(1);
    expect(source.getAttribute('aria-hidden')).toBe('true');
  } finally {
    await handle.destroy();
    prehide.stop();
  }
  expect(source.hasAttribute('aria-hidden')).toBe(false);
  expect(document.querySelector('.ios-theme-vertical-bars-toolbar-projection')).toBeNull();
});

test.each(['Save', '<ion-icon name="save"></ion-icon>', '<svg><path d="M0 0"></path></svg>'])(
  'unchanged action content keeps its node, while source changes still synchronize: %s',
  async (content) => {
    document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars"><main class="ion-page">
      <ion-header><ion-toolbar><ion-button data-vertical-bars="true">${content}</ion-button></ion-toolbar></ion-header>
      </main></ion-app>`;
    const source = document.querySelector<HTMLElement>('ion-button')!;
    source.style.display = 'block';
    source.style.visibility = 'visible';
    source.getBoundingClientRect = () => ({ width: 44, height: 44 }) as DOMRect;
    const prehide = prehideVerticalBarsToolbarSources(document);
    const handle = createVerticalBarsWebProjection(document, {});
    try {
      await nextFrame();
      const target = projectionState.getTarget(source)!;
      const initial = target.firstChild;
      handle.markForCheck();
      await nextFrame();
      expect(target.firstChild).toBe(initial);

      const icon = source.querySelector('ion-icon, svg');
      if (icon?.matches('ion-icon')) icon.setAttribute('name', 'close');
      else if (icon) icon.querySelector('path')!.setAttribute('d', 'M1 1');
      else source.textContent = 'Changed';
      handle.markForCheck();
      await nextFrame();
      expect(target.firstChild).not.toBe(initial);
      if (icon) expect(target.querySelector('ion-icon, svg')!.outerHTML).toBe(icon.outerHTML.replace('>', ' slot="icon-only">'));
      else expect(target.textContent).toBe('Changed');
      const changed = target.firstChild;
      handle.markForCheck();
      await nextFrame();
      expect(target.firstChild).toBe(changed);

      source.innerHTML = icon ? 'Text instead' : '<ion-icon name="add"></ion-icon>';
      handle.markForCheck();
      await nextFrame();
      expect(!!target.querySelector('ion-icon')).toBe(!icon);
      if (icon) expect(target.textContent).toBe('Text instead');
    } finally {
      await handle.destroy();
      prehide.stop();
    }
  },
);

test('a shared action target stays concealed until native/image ownership returns to Web', async () => {
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars"><main class="ion-page">
    <ion-header><ion-toolbar><ion-buttons><ion-button data-vertical-bars="true">Save</ion-button></ion-buttons></ion-toolbar></ion-header>
    </main></ion-app>`;
  const group = document.querySelector<HTMLElement>('ion-buttons')!;
  const source = document.querySelector<HTMLElement>('ion-button')!;
  for (const element of [group, source]) {
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.getBoundingClientRect = () => ({ width: 44, height: 44 }) as DOMRect;
  }
  source.setAttribute('data-native-ui-projected', '');
  preparedOwners.add(source);
  const prehide = prehideVerticalBarsToolbarSources(document);
  let webEnabled = false;
  const handle = createVerticalBarsWebProjection(document, {}, () => webEnabled);
  try {
    await nextFrame();
    const clone = document.querySelector<HTMLElement>('.ios-theme-vertical-bars-toolbar-projection');
    expect(clone).not.toBeNull();
    expect(projectionState.getTarget(group)).toBe(clone);
    expect(projectionState.getTarget(source)).toBe(clone);
    expect(clone?.hasAttribute('data-native-ui-proxy-prepared')).toBe(true);
    clone!.setAttribute('data-native-ui-snapshot-content', '');
    clone!.setAttribute('data-native-ui-snapshot-positioned', '');
    // Popover/background reacquisition must not destroy an already decoded target.
    window.dispatchEvent(new CustomEvent('nativeUIVerticalBarsAcquire', { detail: { instant: true } }));
    expect(clone?.isConnected).toBe(true);
    await nextFrame();
    expect(projectionState.getTarget(source)).toBe(clone);
    expect(clone!.hasAttribute('data-native-ui-snapshot-content')).toBe(true);
    expect(clone!.hasAttribute('data-native-ui-snapshot-positioned')).toBe(true);
    // Keep the Web visual concealed while image ownership awaits the cover acknowledgement.
    preparedOwners.delete(source);
    owners.add(source);
    owners.add(group);
    window.dispatchEvent(new Event(sourcesChangedEvent));
    await nextFrame();
    expect(clone?.hasAttribute('data-native-ui-proxy-prepared')).toBe(true);
    owners.delete(source);
    owners.delete(group);
    webEnabled = true;
    window.dispatchEvent(new Event(sourcesChangedEvent));
    await nextFrame();
    expect(clone?.hasAttribute('data-native-ui-proxy-prepared')).toBe(false);
    expect(clone?.style.visibility).toBe('visible');
    // A grouped native owner also conceals the action without a prepared image.
    nativeOwners.add(group);
    window.dispatchEvent(new Event(sourcesChangedEvent));
    await nextFrame();
    expect(clone?.hasAttribute('data-native-ui-proxy-prepared')).toBe(true);
    nativeOwners.delete(group);
    window.dispatchEvent(new Event(sourcesChangedEvent));
    await nextFrame();
    expect(clone?.hasAttribute('data-native-ui-proxy-prepared')).toBe(false);
  } finally {
    preparedOwners.delete(source);
    owners.delete(source);
    owners.delete(group);
    await handle.destroy();
    prehide.stop();
  }
});

test('a covered back-only rail survives native reacquisition while dragging a sheet', async () => {
  mountEligibleBackButton();
  const source = document.querySelector<HTMLElement>('ion-back-button')!;
  owners.add(source);
  const stop = observeVerticalBarsModals(document);
  const handle = createVerticalBarsWebProjection(document, {}, () => false);
  try {
    await nextFrame();
    const clone = projectionState.getTarget(source)!;
    expect(clone?.isConnected).toBe(true);
    expect(clone.inert).toBe(true);
    expect(clone.hasAttribute('aria-hidden')).toBe(false);
    clone.setAttribute('data-native-ui-snapshot', 'prepared-back');
    clone.setAttribute('data-native-ui-snapshot-visible', '');
    const modal = document.createElement('ion-modal');
    document.querySelector('ion-app')!.append(modal);
    modal.dispatchEvent(new CustomEvent('ionModalWillPresent', { bubbles: true }));
    for (let n = 0; n < 3; n++) {
      window.dispatchEvent(new CustomEvent('nativeUIVerticalBarsAcquire', { detail: { instant: true } }));
      expect(clone.isConnected).toBe(true);
      expect(clone.getAttribute('data-native-ui-snapshot')).toBe('prepared-back');
      await nextFrame();
      expect(projectionState.getTarget(source)).toBe(clone);
    }
  } finally {
    owners.delete(source);
    await handle.destroy();
    stop();
  }
});

test.each([false, true])('modal image targets survive dismissal before/after cover acknowledgement: visible=%s', async (visible) => {
  mountEligibleBackButton();
  const app = document.querySelector('ion-app')!;
  const source = document.querySelector<HTMLElement>('ion-back-button')!;
  owners.add(source);
  visibleOwners.add(source);
  const stop = observeVerticalBarsModals(document);
  const handle = createVerticalBarsWebProjection(document, {}, () => false);
  try {
    await nextFrame();
    const first = projectionState.getTarget(source)!;
    first.setAttribute('data-native-ui-snapshot', 'background');
    const modal = document.createElement('ion-modal');
    modal.innerHTML =
      '<main class="ion-page"><ion-header><ion-toolbar class="ios"><ion-button class="ios" data-vertical-bars="true">Close</ion-button></ion-toolbar></ion-header></main>';
    const wrapper = document.createElement('div');
    wrapper.setAttribute('part', 'content');
    Object.defineProperty(wrapper, 'offsetWidth', { value: window.innerWidth });
    wrapper.getAnimations = () => [];
    modal.attachShadow({ mode: 'open' }).append(wrapper);
    modal.style.setProperty('--ios-theme-vertical-bars-modal-toolbar-top', '32px');
    app.append(modal);
    const close = modal.querySelector<HTMLElement>('ion-button')!;
    close.style.display = 'block';
    close.style.visibility = 'visible';
    preparedOwners.add(close);
    close.getBoundingClientRect = () => DOMRect.fromRect({ width: 48, height: 48 });
    setVerticalBarsPlacement(close, true);
    modal.dispatchEvent(new CustomEvent('ionModalWillPresent', { bubbles: true }));
    await nextFrame();
    await nextFrame();
    expect(projectionState.getTarget(source)).toBe(first);
    expect(first.getAttribute('data-native-ui-snapshot')).toBe('background');
    expect(projectionState.getTarget(source)?.isConnected).toBe(true);
    expect(app.classList.contains('ios-theme-vertical-bars-toolbar-ready')).toBe(true);
    expect(modal.classList.contains('ios-theme-vertical-bars-toolbar-ready')).toBe(true);
    const outgoing = projectionState.getTarget(close)!;
    expect(outgoing.isConnected).toBe(true);
    expect(outgoing.inert).toBe(true);
    expect(outgoing.hasAttribute('aria-hidden')).toBe(false);
    expect(outgoing.assignedSlot?.parentNode).toBe(wrapper);
    preparedOwners.delete(close);
    owners.add(close);
    if (visible) visibleOwners.add(close);
    modal.dispatchEvent(new CustomEvent('ionModalWillDismiss', { bubbles: true }));
    close.closest('.ion-page')!.dispatchEvent(new CustomEvent('ionViewWillLeave', { bubbles: true }));
    await nextFrame();
    expect(outgoing.isConnected).toBe(true);
    modal.dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
    // Ionic may keep the host in the DOM until the next microtask. No outgoing
    // clone may survive the loss of the Modal's positioning class for a frame.
    expect(modal.isConnected).toBe(true);
    expect(outgoing.isConnected).toBe(false);
    expect(modal.querySelector('.ion-cloned-element')).toBeNull();
    owners.delete(close);
    visibleOwners.delete(close);
    expect(projectionState.getTarget(source)).toBe(first);
    expect(first.isConnected).toBe(true);
    expect(first.getAttribute('data-native-ui-snapshot')).toBe('background');
  } finally {
    preparedOwners.clear();
    owners.delete(source);
    visibleOwners.delete(source);
    await handle.destroy();
    stop();
  }
});

test('native acquisition updates existing image targets without measuring or creating Web controls', async () => {
  mountEligibleBackButton();
  const source = document.querySelector<HTMLElement>('ion-back-button')!;
  preparedOwners.add(source);
  let web = false;
  const handle = createVerticalBarsWebProjection(document, {}, () => web);
  try {
    await nextFrame();
    const clone = projectionState.getTarget(source)!;
    const incoming = document.createElement('ion-button');
    incoming.className = 'ios';
    incoming.textContent = 'Save';
    incoming.setAttribute('data-vertical-bars', 'true');
    incoming.style.visibility = 'visible';
    incoming.getBoundingClientRect = () => DOMRect.fromRect({ width: 44, height: 44 });
    source.parentElement!.append(incoming);
    setVerticalBarsPlacement(incoming, true);
    web = true;
    const measure = vi.spyOn(source, 'getBoundingClientRect');
    source.setAttribute('data-native-ui-vertical-bars', '');
    nativeOwners.add(source);
    window.dispatchEvent(new CustomEvent('nativeUIVerticalBarsAcquire', { detail: { instant: true } }));
    expect(projectionState.getTarget(source)).toBe(clone);
    expect(clone.hasAttribute('data-native-ui-vertical-bars')).toBe(true);
    expect(source.getAttribute('aria-hidden')).toBeNull();
    // Native records the original ARIA, then takes ownership in the same update.
    source.setAttribute('aria-hidden', 'true');
    expect(clone.isConnected).toBe(true);
    expect(measure).not.toHaveBeenCalled();
    expect(!!projectionState.getTarget(incoming)).toBe(false);
    expect(incoming.getAttribute('aria-hidden')).toBeNull();
    measure.mockRestore();
  } finally {
    preparedOwners.delete(source);
    await handle.destroy();
    expect(source.hasAttribute('data-native-ui-projected')).toBe(true);
    expect(source.getAttribute('aria-hidden')).toBe('true');
  }
});

test.each([
  { surface: 'page', grouped: true },
  { surface: 'modal', grouped: true },
  { surface: 'modal', grouped: false },
  { surface: 'page', grouped: false },
  { surface: 'page', grouped: true, partial: true },
  { surface: 'modal', grouped: true, partial: true },
])(
  'native $surface actions (grouped=$grouped) have hidden image targets before the first capture',
  async ({ surface, grouped, partial }) => {
    vi.spyOn(projectionState, 'snapshotsEnabled', 'get').mockReturnValue(true);
    document.body.innerHTML = `<style>[data-native-ui-projected], [data-native-ui-projected] * { visibility: hidden !important; }</style><ion-app class="ios-theme-vertical-bars">${surface === 'modal' ? '<ion-modal>' : ''}
    <main class="ion-page"><ion-header><ion-toolbar class="ios"><ion-buttons slot="end" class="${grouped ? '' : 'ios-theme-disabled'}">
    ${partial ? '<ion-back-button class="ios"></ion-back-button>' : ''}<ion-button class="ios" data-vertical-bars="true">Close</ion-button>
    <ion-button class="ios" data-vertical-bars="true">Done</ion-button>
    </ion-buttons></ion-toolbar></ion-header></main>${surface === 'modal' ? '</ion-modal>' : ''}</ion-app>`;
    const modal = document.querySelector('ion-modal');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('part', 'content');
    Object.defineProperty(wrapper, 'offsetWidth', { value: innerWidth });
    wrapper.getAnimations = () => [];
    wrapper.innerHTML = '<slot></slot>';
    wrapper.style.transform = 'translateY(100px)';
    modal?.attachShadow({ mode: 'open' }).append(wrapper);
    modal?.style.setProperty('--ios-theme-vertical-bars-modal-toolbar-top', '32px');
    const group = document.querySelector<HTMLElement>('ion-buttons')!;
    const actions = Array.from(group.querySelectorAll<HTMLElement>('ion-button'));
    for (const element of [group, ...actions]) {
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.getBoundingClientRect = () => DOMRect.fromRect({ width: 44, height: 44 });
      setVerticalBarsPlacement(element, true);
    }
    group.setAttribute('data-native-ui-vertical-bars', '');
    if (grouped && !partial) {
      nativeOwners.add(group);
      group.setAttribute('data-native-ui-projected', '');
      group.setAttribute('aria-hidden', 'true');
    }
    actions.forEach((action) => {
      if (!grouped || partial) {
        nativeOwners.add(action);
        if (!partial) action.setAttribute('data-native-ui-vertical-bars', '');
        action.setAttribute('data-native-ui-projected', '');
        action.setAttribute('aria-hidden', 'true');
      }
      action.setAttribute('data-native-ui-vertical-bars-member', '');
    });
    const stop = observeVerticalBarsModals(document, () => true);
    modal?.dispatchEvent(new CustomEvent('ionModalWillPresent', { bubbles: true }));
    const handle = createVerticalBarsWebProjection(document, {}, () => false);
    try {
      await nextFrame();
      if (modal) {
        expect(projectionState.getTarget(group)).toBeUndefined();
        for (const source of actions) expect(projectionState.getTarget(source)).toBeUndefined();
        modal.dispatchEvent(new CustomEvent('ionModalDidPresent', { bubbles: true }));
        await nextFrame();
      }
      const target = projectionState.getTarget(group)!;
      expect(target?.isConnected).toBe(true);
      expect(target.hasAttribute('data-native-ui-proxy-prepared')).toBe(true);
      if (modal) {
        expect(target.closest('ion-modal')).toBe(modal);
        expect(target.assignedSlot?.parentNode).toBe(wrapper);
        expect(wrapper.contains(target.assignedSlot)).toBe(true);
        actions[0].setAttribute('aria-label', 'Updated close');
        await nextFrame();
        expect(projectionState.getTarget(group)).toBe(target);
        expect(target.assignedSlot?.parentNode).toBe(wrapper);
      }
      for (const source of actions) expect(projectionState.getTarget(source)?.isConnected).toBe(true);
      expect(projectionState.getTarget(actions[0])).not.toBe(projectionState.getTarget(actions[1]));
      // Native may release a source before its prepared proxy is retired.
      nativeOwners.delete(actions[0]);
      actions[0].removeAttribute('data-native-ui-vertical-bars');
      actions[0].removeAttribute('data-native-ui-vertical-bars-member');
      actions[0].removeAttribute('data-native-ui-projected');
      actions[0].removeAttribute('aria-hidden');
    } finally {
      await handle.destroy();
      for (const source of [group, ...actions]) expect(projectionState.getTarget(source)).toBeUndefined();
      expect(modal?.shadowRoot?.querySelector('slot[data-native-ui-projection-node]')).toBeFalsy();
      expect(actions[0].hasAttribute('aria-hidden')).toBe(false);
      expect(actions[1].hasAttribute('data-native-ui-projected')).toBe(!grouped || !!partial);
      stop();
    }
  },
);

test('tab width measurement does not refresh the Web rail, but source changes still do', async () => {
  document.body.innerHTML =
    '<ion-app class="ios-theme-vertical-bars"><ion-tab-bar style="width:240px;box-sizing:border-box"></ion-tab-bar></ion-app>';
  const bar = document.querySelector<HTMLElement>('ion-tab-bar')!;
  const widths = createTabBarWidths(document);
  widths.apply(bar, 180);
  const handle = createVerticalBarsWebProjection(document, {});
  let schedule: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await nextFrame();
    await nextFrame();
    schedule = vi.spyOn(window, 'requestAnimationFrame');
    widths.measure(() => {});
    await Promise.resolve();
    expect(schedule).not.toHaveBeenCalled();

    widths.measure(() => {});
    bar.setAttribute('aria-label', 'Updated tabs');
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledTimes(1);
  } finally {
    schedule?.mockRestore();
    await handle.destroy();
    widths.clear();
    document.body.replaceChildren();
  }
});

test('destroy does not remove a target registered by another renderer', async () => {
  mountEligibleBackButton();
  const source = document.querySelector<HTMLElement>('ion-back-button')!;
  const handle = createVerticalBarsWebProjection(document, {});
  await nextFrame();
  expect(projectionState.getTarget(source)?.isConnected).toBe(true);
  const replacement = document.createElement('ion-back-button');
  projectionState.setTarget(source, replacement);
  await handle.destroy();
  expect(projectionState.getTarget(source)).toBe(replacement);
  projectionState.deleteTarget(source);
});
