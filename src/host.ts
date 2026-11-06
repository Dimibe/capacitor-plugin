import { Capacitor, registerPlugin } from '@capacitor/core';
import { installNativeUIHost } from '../packages/native-ui-core/dist/host.js';
import type { NativeUIPlugin as NativeUICorePlugin } from '../packages/native-ui-core/dist/native/definitions.js';

import type { DynamicColorPlugin } from './dynamic-colors.js';

type NativeUIPlugin = NativeUICorePlugin & DynamicColorPlugin;
export const nativeUIPlugin = registerPlugin<NativeUIPlugin>('NativeUI');

installNativeUIHost({
  plugin: nativeUIPlugin,
  getPlatform: () => Capacitor.getPlatform(),
  isPluginAvailable: (name) => Capacitor.isPluginAvailable(name),
});
