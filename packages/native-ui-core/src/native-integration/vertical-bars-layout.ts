import { reservedVerticalBarBoundary, type NativeUIReservedRegion } from '@webview-native-ui/engine/integration';

/** Structural source: no dependency on a specific device plugin. */
export interface VerticalBarsLayoutProvider {
  getBarPlacement?(): Promise<{ verticalBarEdge: 'leading' | 'trailing' | null; inset: number }>;
  getReservedRegions?(): Promise<{ regions: readonly NativeUIReservedRegion[] }>;
}

export interface ResolvedVerticalBarsLayout {
  edge?: 'leading' | 'trailing' | null;
  inset?: number;
  toolbarTop?: number;
  reservedRegions?: readonly NativeUIReservedRegion[];
}

/** Optional browser-independent context for SSR or a differently directed root. */
export interface VerticalBarsLayoutContext {
  viewport?: { width: number; height: number };
  rtl?: boolean;
}

/** Read one device snapshot. Missing values retain the applying layout's defaults. */
export const resolveVerticalBarsLayout = async (
  provider: VerticalBarsLayoutProvider,
  context: VerticalBarsLayoutContext = {},
): Promise<ResolvedVerticalBarsLayout> => {
  const [placement, reserved] = await Promise.allSettled([
    Promise.resolve().then(() => provider.getBarPlacement?.()),
    Promise.resolve().then(() => provider.getReservedRegions?.()),
  ]);
  const bars = placement.status === 'fulfilled' ? placement.value : undefined;
  const regions = reserved.status === 'fulfilled' ? reserved.value?.regions : undefined;
  const edge = bars?.verticalBarEdge;
  const metrics: ResolvedVerticalBarsLayout = {
    edge,
    inset: Number.isFinite(bars?.inset) && bars!.inset >= 0 ? bars!.inset : undefined,
    reservedRegions: regions?.map((region) => ({ ...region })),
  };
  const viewport =
    context.viewport ?? (typeof window === 'undefined' ? undefined : { width: window.innerWidth, height: window.innerHeight });
  if (edge && viewport) {
    const rtl = context.rtl ?? (typeof document !== 'undefined' && document.documentElement.dir === 'rtl');
    const physicalEdge = (edge === 'leading') !== rtl ? 'left' : 'right';
    metrics.toolbarTop = reservedVerticalBarBoundary(regions, physicalEdge, viewport.width, viewport.height);
  }
  return metrics;
};
