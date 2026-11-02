import type { NativeUIPlugin } from './native/definitions.js';

export interface PluginListenerHandle {
  remove(): Promise<void>;
}

/** The embedding framework owns platform detection, registration and transport. */
export interface NativeUIHost {
  plugin: NativeUIPlugin;
  getPlatform(): string;
  isPluginAvailable(name: string): boolean;
}
let host: NativeUIHost | undefined;

/** Install before starting a session; repeated adapters may share the same transport. */
export const installNativeUIHost = (value: NativeUIHost): void => {
  if (host && host.plugin !== value.plugin) throw new Error('A Native UI host is already installed');
  host ??= value;
};
export const nativeUIHost = {
  getPlatform: () => host?.getPlatform() ?? 'web',
  isPluginAvailable: (name: string) => host?.isPluginAvailable(name) ?? false,
};
export const nativeUIPlugin = new Proxy({} as NativeUIPlugin, {
  get(_target, key) {
    if (!host) throw new Error('Install a Native UI host before accessing the native plugin');
    const member = Reflect.get(host.plugin, key);
    return typeof member === 'function' ? member.bind(host.plugin) : member;
  },
});
