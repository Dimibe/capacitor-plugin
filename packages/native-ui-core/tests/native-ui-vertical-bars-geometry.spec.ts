import { afterEach, expect, test } from 'vitest';
import {
  alignVerticalBarClone,
  createModalRailLayout,
  rememberVerticalBarFrame,
  placeModalRailTarget,
  removeEmptyModalRailSlot,
} from '../src/native/shared/vertical-bars-geometry';

afterEach(() => document.body.replaceChildren());

for (const border of [0, 1 / 3, 1]) {
  test(`rail fallback preserves viewport coordinates with a ${border}px group border`, () => {
    const parent = document.createElement('div');
    const source = document.createElement('ion-button');
    const clone = document.createElement('ion-button');
    parent.style.border = `${border}px solid black`;
    parent.append(clone);
    document.body.append(parent, source);
    parent.getBoundingClientRect = () => DOMRect.fromRect({ x: 394, y: 170, width: 48, height: 100 });
    rememberVerticalBarFrame(source, { x: 394, y: 222, width: 48, height: 48 });
    alignVerticalBarClone(clone, source, parent);
    expect(394 + border + parseFloat(clone.style.left)).toBeCloseTo(394, 5);
    expect(170 + border + parseFloat(clone.style.top)).toBeCloseTo(222, 5);
    expect(clone.style.width).toBe('48px');
    expect(clone.style.height).toBe('48px');
  });
}

for (const [themed, border] of [
  [false, 1 / 3],
  [true, 0],
  [true, 1 / 3],
  [true, 1],
] as const) {
  test(`modal image targets share the dialog transform only when inert and theme metrics=${themed}, border=${border}px`, () => {
    const modal = document.createElement('ion-modal');
    modal.attachShadow({ mode: 'open' }).innerHTML =
      '<div part="content" role="dialog" aria-modal="true" style="transform:translateY(100px)"><slot></slot></div>';
    const dialog = modal.shadowRoot!.querySelector<HTMLElement>('[role="dialog"]')!;
    dialog.style.borderTop = `${border}px solid black`;
    Object.defineProperty(modal, 'clientWidth', { value: 466 });
    Object.defineProperties(dialog, { offsetLeft: { value: 8 }, offsetWidth: { value: 450 } });
    modal.getBoundingClientRect = () => DOMRect.fromRect({ width: 466, height: 678 });
    dialog.getBoundingClientRect = () => DOMRect.fromRect({ x: 8, y: 100, width: 450, height: 578 });
    const target = document.createElement('ion-button');
    target.style.cssText = 'position:absolute;top:174px';
    modal.append(target);
    document.body.append(modal);
    if (themed) modal.style.setProperty('--ios-theme-vertical-bars-modal-toolbar-top', '32px');

    placeModalRailTarget(target, modal);
    expect(target.assignedSlot?.parentElement).toBe(dialog);
    expect(target.style.top).toBe('174px');
    target.inert = true;
    placeModalRailTarget(target, modal);
    if (themed) {
      expect(target.assignedSlot?.parentNode).toBe(dialog);
      expect(target.style.position).toBe('absolute');
      expect(target.style.top).not.toContain('modal-offset-top');
      expect(100 + border + 32 + parseFloat(target.style.marginTop)).toBeCloseTo(132, 5);
      expect(target.style.marginLeft).toBe('-8px');
      expect(target.style.marginRight).toBe('-8px');
      dialog.getBoundingClientRect = () => DOMRect.fromRect({ x: 30.5, y: 100, width: 405, height: 520.2 });
      placeModalRailTarget(target, modal);
      expect(target.style.marginLeft).toBe('-8px');
      expect(target.style.marginRight).toBe('-8px');
      expect(100 + border + 32 + parseFloat(target.style.marginTop)).toBeCloseTo(132, 5);
    } else {
      expect(target.assignedSlot?.parentElement).toBe(dialog);
      expect(target.style.top).toBe('174px');
    }

    target.remove();
    removeEmptyModalRailSlot(modal);
    expect(modal.shadowRoot!.querySelector('slot[data-native-ui-projection-node]')).toBeNull();
  });
}

test('Modal image frame keeps measured Native dimensions', () => {
  const modal = document.createElement('ion-modal');
  const source = document.createElement('ion-button');
  const target = document.createElement('ion-button');
  modal.append(source, target);
  document.body.append(modal);
  modal.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 100, width: 466, height: 578 });
  rememberVerticalBarFrame(source, { x: 390, y: 220, width: 60, height: 40, cornerRadius: 7 });
  alignVerticalBarClone(target, source, modal);
  expect(target.style.width).toBe('60px');
  expect(target.style.height).toBe('40px');
});

for (const grouped of [false, true]) {
  for (const centerY of [381.328125, 46.328125]) {
    test(`Modal image and Native toolbar share a measured center (${centerY}, grouped=${grouped})`, async () => {
      const { modalToolbarAlignment } = await import('../src/native/shared/modal');
      const app = document.createElement('ion-app');
      app.style.setProperty('--ios-theme-vertical-bars-toolbar-top', '174px');
      const modal = document.createElement('ion-modal');
      modal.style.setProperty('--ios-theme-vertical-bars-modal-toolbar-top', '24px');
      modal.innerHTML = '<ion-header><ion-toolbar><ion-title>Modal</ion-title></ion-toolbar></ion-header>';
      app.append(modal);
      document.body.append(app);
      const content = document.createElement('div');
      content.setAttribute('part', 'content');
      modal.attachShadow({ mode: 'open' }).append(content);
      const top = centerY > 200 ? 343 : 8;
      content.getBoundingClientRect = () => DOMRect.fromRect({ x: 8, y: top, width: 450, height: 670 });
      modal.querySelector('ion-title')!.getBoundingClientRect = () => DOMRect.fromRect({ x: 20, y: centerY - 32, width: 300, height: 64 });
      const target = document.createElement(grouped ? 'ion-buttons' : 'ion-button');
      target.inert = true;
      target.getBoundingClientRect = () => DOMRect.fromRect({ x: 394, y: top + 24, width: 48, height: grouped ? 108 : 48 });
      if (grouped) {
        const child = document.createElement('ion-button');
        child.getBoundingClientRect = () => DOMRect.fromRect({ width: 48, height: 48 });
        target.append(child, document.createElement('ion-button'));
      }
      modal.append(target);
      expect(modalToolbarAlignment(modal)).toEqual({ centerY, minimumTop: 174 });
      placeModalRailTarget(target, modal);
      const localTop = centerY - top - 24;
      expect(target.style.top).toBe(
        `calc(max(calc(var(--ios-theme-vertical-bars-toolbar-top) - var(--ios-theme-vertical-bars-modal-offset-top, 0px)), ${localTop}px) + var(--ios-theme-vertical-bars-toolbar-offset, 0px))`,
      );
      // Position stays reactive while image visibility prevents rebuilding the target.
      const anchor = target.style.top;
      app.style.setProperty('--ios-theme-vertical-bars-toolbar-top', '200px');
      modal.style.setProperty('--ios-theme-vertical-bars-modal-offset-top', '8px');
      expect(modalToolbarAlignment(modal)?.minimumTop).toBe(200);
      expect(target.style.top).toBe(anchor);
    });
  }
}

for (const x of [24, 394]) {
  for (const center of [170, 381]) {
    test(`modal image layout uses measured group anchors (x=${x}, center=${center})`, () => {
      document.body.innerHTML =
        '<ion-app class="ios-theme-vertical-bars" style="--ios-theme-vertical-bars-toolbar-top:174px"><ion-modal><ion-header><ion-toolbar><ion-title>Modal</ion-title></ion-toolbar></ion-header><ion-buttons class="ios-theme-vertical-bars-toolbar-projection"></ion-buttons><ion-button class="ios-theme-vertical-bars-toolbar-projection"></ion-button><ion-tab-bar></ion-tab-bar></ion-modal></ion-app>';
      const modal = document.querySelector<HTMLElement>('ion-modal')!;
      modal.querySelector('ion-title')!.getBoundingClientRect = () => DOMRect.fromRect({ y: center - 20, width: 200, height: 40 });
      const group = modal.querySelector<HTMLElement>('ion-buttons')!;
      const done = modal.querySelector<HTMLElement>('ion-button')!;
      const tab = modal.querySelector<HTMLElement>('ion-tab-bar')!;
      group.getBoundingClientRect = () => DOMRect.fromRect({ x, y: 500, width: 48, height: 0 });
      done.getBoundingClientRect = () => DOMRect.fromRect({ x, y: 900, width: 48, height: 48 });
      const targets = new Map([
        ['group', group],
        ['done', done],
        ['tabs', tab],
      ]);
      const parts = [
        {
          ids: ['tabs'],
          url: 'file:///tabs.png',
          x: 0,
          y: 0,
          width: 72,
          height: 72,
          anchorBounds: { x: 12, y: 12, width: 48, height: 48 },
        },
        {
          ids: ['group'],
          url: 'file:///group.png',
          x: 330,
          y: 500,
          width: 84,
          height: 132,
          anchorBounds: { x: 12, y: 12, width: 60, height: 40 },
        },
        {
          ids: ['done'],
          url: 'file:///done.png',
          x: 336,
          y: 612,
          width: 72,
          height: 72,
          anchorBounds: { x: 12, y: 12, width: 48, height: 48 },
        },
      ];
      const layout = createModalRailLayout(modal, (id) => targets.get(id));
      const top = Math.max(174, center - 20);
      expect(layout(group, parts[1], parts)).toEqual({ x: x - 6, y: top, width: 60, height: 40 });
      expect(layout(done, parts[2], parts)).toEqual({ x, y: top + 112, width: 48, height: 48 });
      expect(layout(tab, parts[0], parts)).toBeUndefined();
      expect(group.style.getPropertyValue('--native-ui-toolbar-anchor-height')).toBe('40px');
    });
  }
}
