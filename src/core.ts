/** Standard native UI and app-local SwiftUI and Compose extensions. No Ionic runtime import. */
export { enableNativeUI } from './native/startup.js';
export { defineNativeUI } from './native/extensions.js';
export type { NativeUIExtension, NativeUIValue, NativeUIReadContext, NativeUIImageReference } from './native/extensions.js';
export type {
  NativeUIOptions,
  NativeUIVerticalBarsOptions,
  NativeUIControls,
  ControlProjection,
  IonicProjectionOptions,
  NativeUIHandle,
  NativeUIStatus,
  NativeUISuspension,
} from './native/definitions.js';
