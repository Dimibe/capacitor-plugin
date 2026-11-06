import { afterEach, expect, test } from 'vitest';
import {
  alignVerticalBarClone,
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

for (const themed of [false, true]) {
  test(`modal image targets share the dialog transform only when inert and theme metrics=${themed}`, () => {
    const modal = document.createElement('ion-modal');
    modal.attachShadow({ mode: 'open' }).innerHTML =
      '<div part="content" role="dialog" aria-modal="true" style="transform:translateY(100px)"><slot></slot></div>';
    const dialog = modal.shadowRoot!.querySelector('[role="dialog"]')!;
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
      expect(target.style.marginLeft).toBe('-8px');
      expect(target.style.marginRight).toBe('-8px');
      dialog.getBoundingClientRect = () => DOMRect.fromRect({ x: 30.5, y: 100, width: 405, height: 520.2 });
      placeModalRailTarget(target, modal);
      expect(target.style.marginLeft).toBe('-8px');
      expect(target.style.marginRight).toBe('-8px');
    } else {
      expect(target.assignedSlot?.parentElement).toBe(dialog);
      expect(target.style.top).toBe('174px');
    }

    target.remove();
    removeEmptyModalRailSlot(modal);
    expect(modal.shadowRoot!.querySelector('slot[data-native-ui-projection-node]')).toBeNull();
  });
}

test('Modal image frame keeps measured Native dimensions and corner radius', () => {
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
  expect(target.style.getPropertyValue('--native-ui-modal-rail-image-radius')).toBe('7px');
});
