import { Capacitor, registerPlugin } from '@capacitor/core';
import { installNativeUIHost } from '../packages/native-ui-core/dist/host.js';
import type { NativeUIPlugin } from '../packages/native-ui-core/dist/native/definitions.js';

installNativeUIHost({
  plugin: registerPlugin<NativeUIPlugin>('NativeUI'),
  getPlatform: () => Capacitor.getPlatform(),
  isPluginAvailable: (name) => Capacitor.isPluginAvailable(name),
});
