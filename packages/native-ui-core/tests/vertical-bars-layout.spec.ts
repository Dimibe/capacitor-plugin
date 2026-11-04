import { afterEach, expect, test, vi } from 'vitest';
import { resolveVerticalBarsLayout } from '../src/native-integration';

const region = (height: number) => ({
  kind: 'occlusion' as const,
  isActive: true,
  x: 382,
  y: 0,
  width: 84,
  height,
  margins: { top: 0, right: 0, bottom: 20, left: 0 },
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('dir');
});
const viewport = (width = 466, height = 678) => vi.stubGlobal('window', { innerWidth: width, innerHeight: height });

test('returns only device values, preserving the provider receiver and included margins', async () => {
  viewport();
  const provider = {
    inset: 84,
    async getBarPlacement() {
      return { verticalBarEdge: 'trailing' as const, inset: this.inset };
    },
    async getReservedRegions() {
      return { regions: [region(120), region(174)] };
    },
  };
  expect(await resolveVerticalBarsLayout(provider)).toEqual({ edge: 'trailing', inset: 84, toolbarTop: 174 });
});

test('failed or unavailable reads leave defaults to the applying theme', async () => {
  viewport();
  expect(await resolveVerticalBarsLayout({})).toEqual({ edge: undefined, inset: undefined, toolbarTop: undefined });
  expect(
    await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 84 }),
      getReservedRegions: () => {
        throw Error('Unsupported');
      },
    }),
  ).toEqual({ edge: 'trailing', inset: 84, toolbarTop: undefined });
  expect(
    await resolveVerticalBarsLayout({
      getBarPlacement: async () => {
        throw Error('Unavailable');
      },
      getReservedRegions: async () => ({ regions: [region(174)] }),
    }),
  ).toEqual({ edge: undefined, inset: undefined, toolbarTop: undefined });
});

test('uses document direction and accepts already normalized CSS coordinates', async () => {
  viewport(932, 1356);
  document.documentElement.dir = 'rtl';
  expect(
    await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 168 }),
      getReservedRegions: async () => ({ regions: [{ ...region(348), x: 0, width: 168 }] }),
    }),
  ).toEqual({ edge: 'trailing', inset: 168, toolbarTop: 348 });
});

test('only active top reservations on the rail affect the result, with no fixed fallback', async () => {
  viewport();
  const getBarPlacement = async () => ({ verticalBarEdge: 'trailing' as const, inset: 84 });
  const regions = [
    { ...region(300), isActive: false },
    { ...region(678), kind: 'division' as const },
    { ...region(37), y: 29 },
    { ...region(174), x: 0 },
    { ...region(174), height: NaN },
  ];
  expect((await resolveVerticalBarsLayout({ getBarPlacement, getReservedRegions: async () => ({ regions }) })).toolbarTop).toBeUndefined();
  expect(
    (await resolveVerticalBarsLayout({ getBarPlacement, getReservedRegions: async () => ({ regions: [...regions, region(120)] }) }))
      .toolbarTop,
  ).toBe(120);
});

test('without a browser it resolves placement without inventing a toolbar position', async () => {
  vi.stubGlobal('window', undefined);
  expect(
    await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 84 }),
      getReservedRegions: async () => ({ regions: [region(174)] }),
    }),
  ).toEqual({ edge: 'trailing', inset: 84, toolbarTop: undefined });
});
