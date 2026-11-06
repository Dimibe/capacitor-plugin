import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ getDynamicColorScheme: vi.fn(), addListener: vi.fn() }));
const platform = vi.hoisted(() => ({ value: 'android' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.value },
  registerPlugin: () => native,
}));
import { addDynamicColorListener, getDynamicColorScheme } from '../src/dynamic-colors';

beforeEach(() => {
  platform.value = 'android';
  vi.clearAllMocks();
});
describe('dynamic color bridge', () => {
  it('reads both schemes in one call without activating projection', async () => {
    const result = { available: true, systemDark: true, light: {}, dark: {} };
    native.getDynamicColorScheme.mockResolvedValue(result);
    expect(await getDynamicColorScheme()).toBe(result);
    expect(native.getDynamicColorScheme).toHaveBeenCalledTimes(1);
  });
  it.each(['ios', 'web'])('provides a no-bridge fallback on %s', async (value) => {
    platform.value = value;
    expect(await getDynamicColorScheme()).toEqual({ available: false, systemDark: false });
    const listener = await addDynamicColorListener(() => {});
    await listener.remove();
    expect(native.getDynamicColorScheme).not.toHaveBeenCalled();
    expect(native.addListener).not.toHaveBeenCalled();
  });
  it('subscribes to native invalidation events and propagates bridge failures', async () => {
    const callback = vi.fn();
    const handle = { remove: vi.fn() };
    native.addListener.mockResolvedValue(handle);
    expect(await addDynamicColorListener(callback)).toBe(handle);
    expect(native.addListener).toHaveBeenCalledWith('dynamicColorSchemeChange', callback);
    native.getDynamicColorScheme.mockRejectedValue(new Error('bridge failed'));
    await expect(getDynamicColorScheme()).rejects.toThrow('bridge failed');
  });
});
