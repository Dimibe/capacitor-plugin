import { afterEach, expect, test, vi } from 'vitest';
import { createTabBarWidths, tabWidthMeasuring } from '../src/native/shared/tab-bar-width';

let widths: ReturnType<typeof createTabBarWidths> | undefined;
afterEach(() => {
  widths?.clear();
  document.body.replaceChildren();
  document.head.querySelectorAll('[data-tab-width-test]').forEach((style) => style.remove());
  vi.restoreAllMocks();
});
const fixture = (boxSizing = 'border-box') => {
  const style = document.createElement('style');
  style.setAttribute('data-tab-width-test', '');
  style.textContent = `ion-tab-bar { width: 240px; box-sizing: ${boxSizing}; padding: 0 10px; border: 2px solid; }`;
  document.head.append(style);
  document.body.innerHTML = '<ion-app><ion-tab-bar><ion-tab-button>Journal</ion-tab-button></ion-tab-bar></ion-app>';
  const bar = document.querySelector<HTMLElement>('ion-tab-bar')!;
  widths = createTabBarWidths(document);
  widths.apply(bar, 180);
  return { bar, style, widths, width: () => getComputedStyle(bar).width };
};

test('measures source CSS without disabling stylesheets or feeding acknowledged width back into layout', () => {
  const { bar, widths, width } = fixture();
  const sheets = Array.from(document.styleSheets);
  const disabled = sheets.map((sheet) => {
    const set = vi.fn();
    Object.defineProperty(sheet, 'disabled', { configurable: true, get: () => false, set });
    return set;
  });
  expect(width()).toBe('180px');
  for (let i = 0; i < 5; i++) {
    expect(
      widths.measure(() => {
        expect(bar.hasAttribute(tabWidthMeasuring)).toBe(true);
        return width();
      }),
    ).toBe('240px');
    expect(width()).toBe('180px');
    expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
    widths.apply(bar, 180);
  }
  disabled.forEach((spy) => expect(spy).not.toHaveBeenCalled());
});

test('restores width overrides after a failed reader, including nested reads', () => {
  const { bar, widths, width } = fixture();
  expect(() =>
    widths.measure(() => {
      expect(widths.measure(width)).toBe('240px');
      expect(width()).toBe('240px');
      throw new Error('reader failed');
    }),
  ).toThrow('reader failed');
  expect(width()).toBe('180px');
  expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
});

test('restores measurement state when computed-style validation throws', () => {
  const { bar, widths, width } = fixture();
  vi.spyOn(window, 'getComputedStyle').mockImplementationOnce(() => {
    throw new Error('style failed');
  });
  expect(() => widths.measure(width)).toThrow('style failed');
  expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
  expect(width()).toBe('180px');
});

for (const change of ['label', 'viewport', 'theme', 'source-width']) {
  test(`invalidates an acknowledged width after a ${change} change`, () => {
    const { bar, style, widths, width } = fixture();
    if (change === 'label') bar.firstElementChild!.textContent = 'Long journal label';
    if (change === 'viewport') vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(900);
    if (change === 'theme') bar.closest('ion-app')!.classList.add('ios-theme-vertical-bars');
    if (change === 'source-width') style.textContent = 'ion-tab-bar { width: 300px; box-sizing: border-box; }';
    const sourceWidth = change === 'source-width' ? '300px' : '240px';
    expect(widths.measure(width)).toBe(sourceWidth);
    expect(width()).toBe(sourceWidth);
    expect(bar.hasAttribute('data-native-tab-width')).toBe(false);
    expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
    widths.apply(bar, 200);
    expect(width()).toBe('200px');
  });
}

test('cleans up disconnected bars and clear during a measurement', () => {
  const { bar, widths } = fixture();
  bar.remove();
  widths.measure(() => {});
  expect(bar.hasAttribute('data-native-tab-width')).toBe(false);
  expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
  document.querySelector('ion-app')!.append(bar);
  widths.apply(bar, 180);
  widths.measure(() => widths.clear());
  expect(bar.hasAttribute('data-native-tab-width')).toBe(false);
  expect(bar.hasAttribute(tabWidthMeasuring)).toBe(false);
});

test('preserves content-box compensation', () => {
  const { widths, width } = fixture('content-box');
  expect(width()).toBe('156px');
  expect(widths.measure(width)).toBe('240px');
  expect(width()).toBe('156px');
});
