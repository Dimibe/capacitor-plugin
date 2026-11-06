import { Capacitor } from '@capacitor/core';
import { nativeUIPlugin as plugin } from './host.js';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Optional Material roles enrich the theme; Ionic palettes remain sufficient on their own.
 * @experimental The role set may change in future releases.
 */
export const materialColorRoles = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceTint',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'scrim',
  'surfaceBright',
  'surfaceDim',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'surfaceContainerLow',
  'surfaceContainerLowest',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
] as const;
/** @experimental Material You role names may change in future releases. */
export type MaterialColorRole = (typeof materialColorRoles)[number];

/**
 * Six compatibility inputs; every additional Material role is optional.
 * @experimental The dynamic color payload may change in future releases.
 */
export interface MaterialColorScheme extends Partial<Record<MaterialColorRole, string>> {
  primary: string;
  secondary: string;
  tertiary: string;
  error: string;
  surface: string;
  onSurface: string;
}

/** @experimental Dynamic color acquisition and its payload may change in future releases. */
export type DynamicColorScheme =
  | { available: false; systemDark: boolean }
  | { available: true; systemDark: boolean; light: MaterialColorScheme; dark: MaterialColorScheme };

/** @experimental Native dynamic color methods and events may change in future releases. */
export interface DynamicColorPlugin {
  getDynamicColorScheme(): Promise<DynamicColorScheme>;
  addListener(name: 'dynamicColorSchemeChange', listener: () => void): Promise<PluginListenerHandle>;
}

/**
 * Independent of Native UI projection. No wallpaper or storage permission needed.
 * @experimental The API and returned color roles may change in future releases.
 */
export const getDynamicColorScheme = (): Promise<DynamicColorScheme> => {
  if (Capacitor.getPlatform() !== 'android') {
    return Promise.resolve({ available: false, systemDark: globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false });
  }
  return plugin.getDynamicColorScheme();
};

/**
 * Invalidates the cached schemes after native resume or configuration changes.
 * @experimental The listener API and notification behavior may change in future releases.
 */
export const addDynamicColorListener = async (listener: () => void): Promise<PluginListenerHandle> => {
  if (Capacitor.getPlatform() !== 'android') return { remove: async () => {} };
  return plugin.addListener('dynamicColorSchemeChange', listener);
};
