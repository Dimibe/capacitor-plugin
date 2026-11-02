// Compatibility Ionic entrypoint. Standard HTML consumers can import /core without Ionic.
import { startNativeUI as activate } from './startup.js';
import type { NativeUIOptions, VerticalControlAreaOptions, VerticalControlAreaHandle } from './definitions.js';
import { setVerticalControlAreaPlacement } from './legacy-layout.js';
export { setVerticalControlAreaPlacement } from './legacy-layout.js';
export { configureNativeTransition, NativeUI } from './activation.js';
export { defineNativeUI } from './extensions.js';
export type { NativeUIExtension, NativeUIValue, NativeUIReadContext, NativeUIImageReference } from './extensions.js';
export type {
  NativeUIVerticalBarsOptions,
  NativeUIComponent,
  NativeUIControls,
  ControlProjection,
  IonicProjectionOptions,
  NativeUIHandle,
  NativeUIOptions,
  NativeUIStatus,
  NativeUISuspension,
  VerticalBarEdge,
  VerticalBarPlacement,
  VerticalControlAreaHandle,
  VerticalControlAreaOptions,
  WebViewMetrics,
} from './definitions.js';

export const enableNativeUI = (options: NativeUIOptions = {}) =>
  activate(options, async (...args) => (await import('./overlays/controller.js')).createOverlayController(...args));

export const enableVerticalControlArea = async (options: VerticalControlAreaOptions = {}): Promise<VerticalControlAreaHandle> => {
  const handle = await enableNativeUI({ ...options, controls: options.controls ?? 'verticalOnly' });
  return { ...handle, setPlacement: setVerticalControlAreaPlacement };
};
