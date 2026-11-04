interface LayoutProvider {
  getBarPlacement?(): Promise<{ verticalBarEdge: 'leading' | 'trailing' | null; inset: number }>;
  getReservedRegions?(): Promise<{
    regions: readonly {
      x: number;
      y: number;
      width: number;
      height: number;
      kind: 'division' | 'occlusion';
      isActive: boolean;
    }[];
  }>;
}

/** Resolve Web layout values in viewport CSS pixels. Defaults belong to the applying theme. */
export const resolveVerticalBarsLayout = async (provider: LayoutProvider) => {
  const [placement, reserved] = await Promise.allSettled([
    Promise.resolve().then(() => provider.getBarPlacement?.()),
    Promise.resolve().then(() => provider.getReservedRegions?.()),
  ]);
  const bars = placement.status === 'fulfilled' ? placement.value : undefined;
  const regions = reserved.status === 'fulfilled' ? reserved.value?.regions : undefined;
  const edge = bars?.verticalBarEdge;
  let toolbarTop: number | undefined;
  if (edge && typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
    const root = typeof document === 'undefined' ? undefined : (document.querySelector('ion-app') ?? document.documentElement);
    const rtl = root?.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const left = (edge === 'leading') !== rtl;
    for (const { x, y, width, height, kind, isActive } of regions ?? []) {
      if (
        kind !== 'occlusion' ||
        !isActive ||
        ![x, y, width, height].every(Number.isFinite) ||
        width <= 0 ||
        height <= 0 ||
        y > 0 ||
        y + height <= 0 ||
        (left ? x > 0 || x + width <= 0 : x >= window.innerWidth || x + width < window.innerWidth)
      )
        continue;
      const bottom = Math.min(y + height, window.innerHeight);
      toolbarTop = toolbarTop === undefined ? bottom : Math.max(toolbarTop, bottom);
    }
  }
  return {
    edge,
    inset: Number.isFinite(bars?.inset) && bars!.inset >= 0 ? bars!.inset : undefined,
    toolbarTop,
  };
};
