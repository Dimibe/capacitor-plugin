import { expect, test, vi } from 'vitest';

test('Core works without an installed host and rejects accidental host replacement', async () => {
  const { nativeUIHost, installNativeUIHost, nativeUIPlugin } = await import('../src/host');
  const { enableNativeUI } = await import('../src/core');
  expect(nativeUIHost.getPlatform()).toBe('web');
  const fallback = await enableNativeUI({ controls: false });
  expect(fallback.getStatus().state).toBe('web');
  await fallback.destroy();
  const plugin = {
    marker: 42,
    getWebViewMetrics() {
      return Promise.resolve({ radius: this.marker });
    },
  };
  const host = {
    plugin: plugin as unknown as Parameters<typeof installNativeUIHost>[0]['plugin'],
    getPlatform: () => 'ios',
    isPluginAvailable: () => true,
  };
  installNativeUIHost(host);
  installNativeUIHost(host);
  expect(await nativeUIPlugin.getWebViewMetrics()).toEqual({ radius: 42 });
  installNativeUIHost({ ...host, getPlatform: () => 'unexpected-replacement' });
  expect(nativeUIHost.getPlatform()).toBe('ios');
  expect(() => installNativeUIHost({ ...host, plugin: {} as typeof host.plugin })).toThrow('already installed');
});

test('host listener teardown still runs after registration times out', async () => {
  vi.useFakeTimers();
  try {
    const { boundedListener } = await import('../src/native/shared/bridge');
    let complete!: (value: { remove(): Promise<void> }) => void;
    const pending = new Promise<{ remove(): Promise<void> }>((resolve) => {
      complete = resolve;
    });
    const result = expect(boundedListener(pending)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(5001);
    await result;
    const remove = vi.fn(async () => {});
    complete({ remove });
    await vi.advanceTimersByTimeAsync(0);
    expect(remove).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
