import { expect, test, vi, afterEach } from 'vitest';
import { resolveVerticalBarsLayout } from '../src/native-integration/vertical-bars-layout';
import { reservedVerticalBarBoundary, type NativeUIReservedRegion } from '../src/native-integration/reserved-regions';
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
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  vi.restoreAllMocks();
});
test('device metrics combine placement and active regions without supplying Web defaults', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 466 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 678 });
  const source = {
    getBarPlacement: vi.fn(async () => ({ verticalBarEdge: 'trailing' as const, inset: 84 })),
    getReservedRegions: vi.fn(async () => ({ regions: [region(174)] })),
  };
  expect(await resolveVerticalBarsLayout(source)).toEqual({
    edge: 'trailing',
    inset: 84,
    toolbarTop: 174,
  });
  expect(source.getBarPlacement).toHaveBeenCalledTimes(1);
  expect(source.getReservedRegions).toHaveBeenCalledTimes(1);
  source.getReservedRegions.mockResolvedValue({ regions: [] });
  expect((await resolveVerticalBarsLayout(source)).toolbarTop).toBeUndefined();
});

test('missing, rejected and synchronously throwing device APIs leave defaults to the applying layout', async () => {
  expect(await resolveVerticalBarsLayout({})).toEqual({ edge: undefined, inset: undefined });
  const metrics = await resolveVerticalBarsLayout({
    getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 80 }),
    getReservedRegions: () => {
      throw new Error('Unavailable');
    },
  });
  expect(metrics).toEqual({ edge: 'trailing', inset: 80, toolbarTop: undefined });
  expect(
    await resolveVerticalBarsLayout({
      getBarPlacement: async () => {
        throw new Error('Unavailable');
      },
      getReservedRegions: async () => ({ regions: [region(174)] }),
    }),
  ).toEqual({ edge: undefined, inset: undefined });
});

test('logical placement resolves the physical occlusion in RTL and respects a horizontal device layout', async () => {
  document.documentElement.dir = 'rtl';
  try {
    const metrics = await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 84 }),
      getReservedRegions: async () => ({ regions: [{ ...region(230), x: 0 }] }),
    });
    expect(metrics.toolbarTop).toBe(230);
    const horizontal = await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({ verticalBarEdge: null, inset: 0 }),
      getReservedRegions: async () => ({ regions: [region(174)] }),
    });
    expect(horizontal.edge).toBeNull();
    expect(horizontal.toolbarTop).toBeUndefined();
  } finally {
    document.documentElement.removeAttribute('dir');
  }
});

test('explicit context supports custom roots and SSR without querying Ionic markup', async () => {
  const query = vi.spyOn(document, 'querySelector').mockImplementation(() => {
    throw new Error('No Ionic dependency');
  });
  const metrics = await resolveVerticalBarsLayout(
    {
      getBarPlacement: async () => ({ verticalBarEdge: 'trailing', inset: 84 }),
      getReservedRegions: async () => ({ regions: [{ ...region(230), x: 0 }] }),
    },
    { rtl: true, viewport: { width: 600, height: 800 } },
  );
  expect(metrics.toolbarTop).toBe(230);
  expect(query).not.toHaveBeenCalled();
});

test('method receivers and independent API failures work for custom and Android providers', async () => {
  const provider = {
    inset: 90,
    async getBarPlacement() {
      return { verticalBarEdge: 'leading' as const, inset: this.inset };
    },
    async getReservedRegions() {
      return { regions: [{ ...region(120), x: 0 }] };
    },
  };
  expect(await resolveVerticalBarsLayout(provider, { rtl: false, viewport: { width: 600, height: 800 } })).toMatchObject({
    edge: 'leading',
    inset: 90,
    toolbarTop: 120,
  });
  provider.getReservedRegions = async () => {
    throw new Error('Unsupported');
  };
  expect(await resolveVerticalBarsLayout(provider)).toMatchObject({ edge: 'leading', inset: 90 });
  expect((await resolveVerticalBarsLayout(provider)).toolbarTop).toBeUndefined();
});

test('SSR can resolve explicit geometry without browser or native SDK globals', async () => {
  const provider = {
    getBarPlacement: async () => ({ verticalBarEdge: 'trailing' as const, inset: 84 }),
    getReservedRegions: async () => ({ regions: [region(174)] }),
  };
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    expect((await resolveVerticalBarsLayout(provider)).toolbarTop).toBeUndefined();
    expect((await resolveVerticalBarsLayout(provider, { viewport: { width: 466, height: 678 }, rtl: false })).toolbarTop).toBe(174);
  } finally {
    vi.unstubAllGlobals();
  }
});

test('custom providers can normalize points into the context CSS coordinate space', async () => {
  const native = {
    getBarPlacement: async () => ({ verticalBarEdge: 'trailing' as const, inset: 84 }),
    getReservedRegions: async () => ({ regions: [region(174)] }),
  };
  const context = { viewport: { width: 932, height: 1356 }, rtl: false };
  // Context is a coordinate contract, not an implicit native-point conversion.
  expect((await resolveVerticalBarsLayout(native, context)).toolbarTop).toBeUndefined();
  const normalized = {
    async getBarPlacement() {
      const placement = await native.getBarPlacement();
      return { ...placement, inset: placement.inset * 2 };
    },
    async getReservedRegions() {
      const { regions } = await native.getReservedRegions();
      return {
        regions: regions.map((r) => ({
          ...r,
          x: r.x * 2,
          y: r.y * 2,
          width: r.width * 2,
          height: r.height * 2,
          margins: r.margins && {
            top: r.margins.top * 2,
            right: r.margins.right * 2,
            bottom: r.margins.bottom * 2,
            left: r.margins.left * 2,
          },
        })),
      };
    },
  };
  const layout = await resolveVerticalBarsLayout(normalized, context);
  expect(layout.inset).toBe(168);
  expect(layout.toolbarTop).toBe(348);
});

test('the boundary helper ignores margins, unusable inputs and non-rail regions without reading globals', () => {
  const top = (regions?: readonly NativeUIReservedRegion[]) => reservedVerticalBarBoundary(regions, 'right', 466, 678);
  expect(top()).toBeUndefined();
  expect(top([])).toBeUndefined();
  expect(reservedVerticalBarBoundary([region(174)], 'right', Number.NaN, 678)).toBeUndefined();
  expect(reservedVerticalBarBoundary([region(174)], 'right', 466, 0)).toBeUndefined();
  expect(top([region(174)])).toBe(174);
  expect(top([region(120)])).toBe(120);
  expect(top([region(174), region(230)])).toBe(230);
  const irrelevant = [
    { ...region(300), isActive: false },
    { ...region(678), kind: 'division' as const },
    { ...region(78), y: 600 },
    { ...region(37), y: 29 },
    { ...region(174), x: 0, width: 84 },
    { ...region(200), height: Number.NaN },
  ];
  expect(top(irrelevant)).toBeUndefined();
  expect(top([...irrelevant, region(174)])).toBe(174);
});
