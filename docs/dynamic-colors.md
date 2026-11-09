---
title: Android dynamic colors
---

# Android dynamic colors

Dynamic colors are a supported, opt-in API. Read the device's Material You palette
without enabling Native UI projection, changing the Activity theme, or requesting
wallpaper/storage permissions. Ionic is not required to read colors. App-local
SwiftUI/Compose extensions remain experimental; their status is separate.

## Install and import

Install the plugin as a direct application dependency, sync, then rebuild the
Android app. Updating JavaScript alone cannot add a native method to an installed APK.

```sh
npm install @rdlabo/capacitor-native-ui
npx cap sync android
npx cap run android
```

Use the package root for functions and types:

```ts
import {
  getDynamicColorScheme,
  addDynamicColorListener,
  materialColorRoles,
  type DynamicColorScheme,
  type MaterialColorScheme,
  type MaterialColorRole,
} from '@rdlabo/capacitor-native-ui';
```

The native getter and root exports are included in 2.1.3. Older installations such
as 2.1.1 need an update and native rebuild. This guide describes the current source
API; removing the experimental designation takes effect in the release containing
this change. Do not use the former `/dynamic-colors` plugin subpath.

## Read a scheme

```ts
const result = await getDynamicColorScheme();
if (result.available) {
  const colors = result.systemDark ? result.dark : result.light;
  console.log(colors.primary, colors.onPrimary);
}
```

`getDynamicColorScheme(): Promise<DynamicColorScheme>` reads both appearances in
one native call. It returns a snapshot, does not cache it, and does not apply CSS.

| Platform               | Result                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| Android 12+ (API 31+)  | `{ available: true, systemDark, light, dark }`                   |
| Android 11 and earlier | `{ available: false, systemDark }`                               |
| iOS / Web              | `{ available: false, systemDark }`, without a native bridge read |

`systemDark` is the Android configuration's night-mode flag. On iOS/Web it comes
from `prefers-color-scheme: dark`, or is false when `matchMedia` is unavailable.
When `available` is false, there are no `light` or `dark` properties. Keep your
application's existing palette. Native read failures reject the promise; they are
not converted to `available: false`.

### Color contract

Each `MaterialColorScheme` contains opaque six-digit `#RRGGBB` strings. Hexadecimal
letter casing is not significant. `primary`, `secondary`, `tertiary`, `error`,
`surface`, and `onSurface` are required; other roles are optional in the public
type so consumers can accept partial schemes. The current Android implementation
returns all 46 names in `materialColorRoles` for each appearance:

- Accent and foreground roles, including primary/secondary/tertiary containers.
- Error and error-container pairs.
- Surface, surface-container levels, and surface foregrounds.
- Outline, outline variant, scrim, inverse and fixed roles.

Use `MaterialColorRole` for a role name and `materialColorRoles` to enumerate the
supported names. Preserve background/foreground pairs such as `primary` and
`onPrimary` when rendering them. The values come from AndroidX Material 3's dynamic
light/dark schemes; the plugin does not regenerate a palette from one seed color
or expose raw tonal palettes. Values depend on the device's system palette.

## Observe changes and clean up

`addDynamicColorListener(listener: () => void)` returns a promise for a
`PluginListenerHandle` with `remove(): Promise<void>`.

Android notifies on Activity resume and configuration changes. A notification
means **read again**, not that the colors necessarily changed. It contains no
scheme and is not a continuous wallpaper-change subscription. On iOS/Web the
function returns a removable no-op handle; observe browser appearance separately
when implementing your own controller.

Register before the initial read so a change during startup is not missed:

```ts
const refresh = async () => {
  const result = await getDynamicColorScheme();
  // Apply or store result here, retaining your fallback when unavailable.
  console.log(result);
};
const handle = await addDynamicColorListener(() => {
  void refresh().catch(console.error);
});
try {
  await refresh();
} catch (error) {
  await handle.remove();
  throw error;
}

// During application teardown:
await handle.remove();
```

For a custom controller, coalesce concurrent reads and retain the last working
palette if a refresh fails. The Ionic controller below handles those details.

## Apply to Ionic

The plugin acquires colors; the theme owns conversion and CSS lifecycle. No call
to `enableNativeUI()` or other projection setup is needed.

```ts
import { getDynamicColorScheme, addDynamicColorListener } from '@rdlabo/capacitor-native-ui';
import { enableDynamicColors } from '@rdlabo/ionic-theme-md3/dynamic-colors';

const theme = await enableDynamicColors({
  getScheme: getDynamicColorScheme,
  listen: addDynamicColorListener,
  mode: 'system',
  onError: console.error,
});

// On a user appearance preference change:
theme.setMode('dark'); // 'light' and 'system' are also supported.

// During application teardown:
await theme.destroy();
```

Install the MD3 theme and import Ionic's `dark.class.css` in the global stylesheet.
Do not combine it with `dark.system.css` or `dark.always.css`. Initialize one
controller per browser document, after the DOM is available; do not run it during
server rendering. See the [theme setup and mapping guide](https://github.com/webview-native-ui/ionic-theme-md3/blob/main/docs/dynamic-colors.md)
for the complete stylesheet setup, fallback rules, errors and appearance control.

Ionic palettes remain sufficient without this feature. Material roles enrich
optional tokens while retaining explicit Ionic color choices, default white
surfaces and the separate light/medium/dark palettes. Success and warning keep
their Ionic values.

## Troubleshooting

- **Native method not implemented:** update the plugin dependency, run Capacitor
  sync, rebuild and reinstall the Android app. Check the native binary as well as
  the JavaScript version.
- **No colors on iOS/Web/older Android:** `available: false` is expected; keep the
  existing palette. It is not a failed installation.
- **Wallpaper changes do not appear immediately:** read again after returning to
  the app, or request an explicit refresh. Notifications are lifecycle/configuration
  invalidations, not a guarantee of an immediate wallpaper event.
- **Colors are read but the UI is unchanged:** this API does not write CSS. Connect
  a theme controller or apply the values in your own renderer.
