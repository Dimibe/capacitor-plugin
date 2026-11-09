import { Capacitor } from '@capacitor/core';
import { nativeUIPlugin as plugin } from './host.js';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Optional Material roles enrich the theme; Ionic palettes remain sufficient on their own.
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
/** Material role names exposed by the native color scheme. */
export type MaterialColorRole = (typeof materialColorRoles)[number];

/**
 * Opaque #RRGGBB colors. Six required inputs; every additional Material role is optional.
 */
export interface MaterialColorScheme extends Partial<Record<MaterialColorRole, string>> {
  primary: string;
  secondary: string;
  tertiary: string;
  error: string;
  surface: string;
  onSurface: string;
}

/** Availability and system appearance, with both schemes when supported. */
export type DynamicColorScheme =
  | { available: false; systemDark: boolean }
  | { available: true; systemDark: boolean; light: MaterialColorScheme; dark: MaterialColorScheme };

/** Native bridge contract used by the public getter and listener. */
export interface DynamicColorPlugin {
  getDynamicColorScheme(): Promise<DynamicColorScheme>;
  addListener(name: 'dynamicColorSchemeChange', listener: () => void): Promise<PluginListenerHandle>;
}

/**
 * Independent of Native UI projection. No wallpaper or storage permission needed.
 */
export const getDynamicColorScheme = (): Promise<DynamicColorScheme> => {
  if (Capacitor.getPlatform() !== 'android') {
    return Promise.resolve({ available: false, systemDark: globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false });
  }
  return plugin.getDynamicColorScheme();
};

/**
 * Notifies consumers after Android resume or configuration changes.
 * The callback carries no palette; call getDynamicColorScheme() again.
 * Returns a removable no-op handle on other platforms.
 */
export const addDynamicColorListener = async (listener: () => void): Promise<PluginListenerHandle> => {
  if (Capacitor.getPlatform() !== 'android') return { remove: async () => {} };
  return plugin.addListener('dynamicColorSchemeChange', listener);
};
