---
title: Migration
---

# Migration

## Simplify an existing iOS setup

Earlier guide examples included application scaffolding that is unnecessary for the standard setup. Follow [the current installation guide](setup.md) when starting a new application.

| Earlier guide approach                                                               | Standard setup                                                                                                                         |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Module-global `mountNativeUI()` lifecycle queue or native startup in page components | Start one default `enableNativeUI()` runtime from the application owner and dispose it with that owner.                                |
| Handwritten page switches or a second navigation wrapper                             | Keep the application's Ionic routes; `ios27ThemeConfig` supplies the coordinated transition.                                           |
| `controls: 'verticalOnly'` as installation boilerplate                               | Omit the option to enable ordinary controls and Vertical Bars together. Keep it only for an intentional rail-only selection.           |
| Direct `getBarPlacement()` mapping with `barPlacementChange` alone                   | Connect `layoutChange` through `resolveVerticalBarsLayout(Foldable)` in the [device module](device-layout.md), including `toolbarTop`. |
| Fixed `edge: 'trailing'` in device setup                                             | Use device-reported placement. Fixed placement is for an intentional browser preview.                                                  |

Keep existing state and business handlers in the application. When replacing guide scaffolding, stop its old runtime and remove its device listener before starting the new owner. Keep a single device connection and a single Native UI runtime. Applications retaining a custom Web theme use [the existing-theme guide](ionic-vertical-bars.md).

The selection, suspension and custom-navigation APIs remain available for applications that need them; they are reference APIs rather than installation prerequisites. The device-provider APIs remain valid; the resolver composes them instead of treating an edge-only notification as a complete layout update.

## Upgrading from 2.1.0

This section covers the same upgrade in both the theme and Native UI guides; following either one is sufficient. Keep existing theme imports, stylesheets and animation setup. Native UI remains optional. If enabled, keep your existing `enableNativeUI()` call, control selection and application-root runtime. The older package-separation migration below does not need to be repeated.

### Update dependencies

For theme-only applications, update the theme:

```sh
npm install @rdlabo/ionic-theme-ios27@latest
```

For applications using device rail geometry or Native UI, update all three packages, including Foldable. They are versioned independently; use compatible versions according to the theme's peer dependency:

```sh
npm install @rdlabo/ionic-theme-ios27@latest @rdlabo/capacitor-native-ui@latest @erkamyaman/capacitor-foldable@latest
```

The resolver import below supplies layout values without enabling native projection. Theme-only applications without a device rail can skip the device geometry step.

### Update device geometry

If your app maps `getBarPlacement()` directly into `setVerticalBarsLayout({ edge, inset })`, use the resolver to include the toolbar origin from reserved regions:

```diff
- import { Foldable, type BarPlacement } from '@erkamyaman/capacitor-foldable';
+ import { Foldable } from '@erkamyaman/capacitor-foldable';
+ import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';
 import { setVerticalBarsLayout } from '@rdlabo/ionic-theme-ios27';

- const applyPlacement = ({ verticalBarEdge, inset }: BarPlacement) =>
-   setVerticalBarsLayout({ edge: verticalBarEdge, inset });
- const listener = await Foldable.addListener('barPlacementChange', applyPlacement);
- applyPlacement(await Foldable.getBarPlacement());
+ const updateLayout = async () => {
+   setVerticalBarsLayout(await resolveVerticalBarsLayout(Foldable));
+ };
+ const listener = await Foldable.addListener('layoutChange', () => void updateLayout());
+ await updateLayout();
```

Replace the old placement listener rather than adding a second update path. Keep `await listener.remove()` in the existing application teardown. If you already have a `layoutChange` handler, put the resolver call there. Keep existing `foldStateChange` / `applyFoldStateClasses` wiring for posture; the resolver only supplies rail geometry.

Use the reported rail layout directly, without gating it on `isDeviceFoldable()`, a device name or viewport-size heuristics. Remove fixed toolbar-top workarounds used to imitate device geometry. Intentional application CSS overrides remain supported. Defaults stay in the theme's `setVerticalBarsLayout`, not the resolver. The theme's outer-display default is 174px; reported device geometry can supply the inner-display origin, 124px. See [layout values and fallback behavior](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/vertical-bars-layout#apply-device-layout-values).

### Modal fixes and submit appearance

Floating cards and sheets now use measured bounds to avoid overlapping the Duo rail, and Native UI correctly recognizes floating dialogs that overlap the rail. This fixes the modal layout and native-control handling; no application code change is required. If you added forced-full-width CSS specifically to work around this bug, you can remove that workaround. Keep explicit full-screen sizing when it is a product requirement. With `ios-theme-vertical-bars` or `ios-theme-fold-expanded` on `ion-app`, floating cards and sheets leave at least 8px at each side. Viewports at least 600px high cap their width at 653px; shorter viewports use the available width minus 16px. Top clearance follows the safe area, with an 8px minimum. Sheet breakpoints still control visible height. Application sizing via `--width`, `--max-width` and `--height` remains supported. Ordinary phone and tablet defaults are unchanged when neither layout class is active.

Solid Ionic submit buttons use prominent native glass automatically:

```html
<ion-button type="submit" fill="solid">Save</ion-button>
```

The same appearance applies to existing `.button-submit` actions with solid fill. That class supplies styling, not form submission. Clear and outline fills do not gain submit emphasis. Existing explicit `data-native-ui="button-submit"` declarations remain supported.

Native controls keep ownership during navigation, modal animations and image handoffs. An image shown in the WebView is still the native projection's presentation, not a return to the original Web button. Retest and remove transition-specific workarounds that force those controls back to Web. Keep intentional opt-outs and handling for unsupported controls or native failures; no additional animation flags or second runtime are needed.

Check both rail edges, rail disappearance, fold/rotation, card/sheet/full-screen presentation, and solid submit actions. Also check ordinary iPhone and browser fallback. For Cordova, use the [bundled integration](https://github.com/webview-native-ui/cordova-plugin); its pinned theme and native changes arrive through a Cordova plugin release rather than these Capacitor installation commands.

## Upgrading from 1.2.1

This guide is for applications using `@rdlabo/ionic-theme-ios27` **1.2.1**, including its Native UI Shell Preview and standalone Vertical Control Area.

- **Theme only:** update the theme package. Existing theme imports, CSS/Sass paths and animation imports remain valid; no native startup is needed.
- **Native UI or Vertical Control Area:** install the native package directly, replace imports and startup settings below, then sync Capacitor and rebuild the native app.

Native UI graduates from Preview to official support in 2.0.0. Experimental Extensions are documented in the [current extension guide](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui-extensions); this guide covers the published 1.2.1 controls and setup.

## Native UI package separation

For a new native integration, follow [Native UI setup](https://webview-native-ui.com/projects/capacitor-native-ui/docs/setup) or, if you already use the iOS theme, [Add Native UI to your theme](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/add-native-ui). The steps below cover existing applications migrating package names and native projects.

The theme and native controls now live in separate packages. Choose dependencies by the behavior your app uses:

| App behavior                                           | Package to use directly       |
| ------------------------------------------------------ | ----------------------------- |
| Theme styles, Ionic Web behavior, and theme animations | `@rdlabo/ionic-theme-ios27`   |
| Native UI or standalone Vertical Control Area          | `@rdlabo/capacitor-native-ui` |
| Theme styling together with native controls            | Both packages                 |

The theme owns the appearance and behavior of Ionic's Web elements. Native UI owns projecting supported controls into native iOS views and coordinating their lifecycle with Web navigation. Native UI can be used without the iOS 27 theme; installing it does not apply theme styles. Standard controls on Android and browsers retain Web presentation; Android can render [app-local Compose extensions](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui-extensions#2b-register-compose-content-on-android).

The theme uses the native package's shared transition/search integration internally. This dependency does not enable native controls automatically. Apps using native controls must declare the native package directly so Capacitor can discover the plugin.

### 1. Update application dependencies

The theme and Native UI are versioned independently. When using both, choose a Native UI version compatible with the theme’s declared peer dependency. The commands below also install [Capacitor Foldable](https://github.com/erkamyaman/capacitor-foldable) as a separate application dependency for placement and posture reporting. Foldable has its own release versions.

For theme-only apps, update the theme package. Keep existing theme imports and CSS/Sass paths; no native startup or plugin setup is needed for theme-only use.

```sh
npm install @rdlabo/ionic-theme-ios27 @erkamyaman/capacitor-foldable
```

For apps using both the theme and native controls, install both as direct application dependencies:

```sh
npm install @rdlabo/ionic-theme-ios27 @rdlabo/capacitor-native-ui @erkamyaman/capacitor-foldable
```

For native controls with your existing Web appearance, follow [Native UI only](https://webview-native-ui.com/projects/capacitor-native-ui/docs/setup). Install the native package directly and keep your existing Web styles. The plugin no longer requires theme variables to select supported controls; Web layout remains the responsibility of your app or theme. Native startup requires Capacitor 8. The Ionic adapter requires Ionic 8.8.1 or later within Ionic 8 or 9; the `/core` entry does not require Ionic.

### 2. Replace native imports

| Previous import                           | Replacement                                 |
| ----------------------------------------- | ------------------------------------------- |
| `@rdlabo/ionic-theme-ios27/native`        | `@rdlabo/capacitor-native-ui`               |
| `@rdlabo/ionic-theme-ios27/vertical-bars` | `@rdlabo/capacitor-native-ui/vertical-bars` |

Update both value and type imports, including lazy imports, test aliases, and bundler configuration. The old theme `/native` and `/vertical-bars` entries have been removed; there are no compatibility aliases.

```diff
- import { enableNativeUIShell } from '@rdlabo/ionic-theme-ios27/native';
+ import { enableNativeUI } from '@rdlabo/capacitor-native-ui';
```

Keep existing control markup; review the [startup option changes](#startup-options), including partial `controls` defaults. The ordinary `@rdlabo/ionic-theme-ios27` entry, theme CSS/Sass paths, and theme animation imports stay unchanged. For custom navigation animations, see the [transition adapter instructions](#native-ui-transition-adapter) below.

### 3. Sync the native project

After updating dependencies and imports, rebuild your app's Web assets with its usual build command, then run:

```sh
npx cap sync ios
```

The Capacitor plugin is now supplied by the native package. Remove manually linked copies of the old theme Swift package so only the new package supplies the plugin. The Swift package/product and CocoaPods pod are now `RdlaboCapacitorNativeUi`; the Swift module is `NativeUIPlugin`. The Capacitor bridge name is now `NativeUI` on JavaScript, iOS and Android. Run Capacitor sync for each native platform you use and rebuild the native app. An OTA/Web-only update cannot migrate an installed binary containing only the old plugin. Use matching JavaScript and native package versions.

Use Capacitor's generated integration for the npm dependency; applications do not need a checkout of this repository or a manually linked Swift package.

### 4. Verify the migration

- Check that native-enabled apps declare `@rdlabo/capacitor-native-ui` directly, then build and confirm no imports of the removed theme entries remain.
- Build and launch the iOS app after sync. Check native controls, navigation/back gestures, and restored Web controls after teardown.
- Check browser and Android Web presentation where supported by your app, and confirm the theme still looks correct.
- Check that previously disabled control kinds remain disabled after expanding partial Preview settings. Test toolbar grouping, individually selected actions and back navigation in both horizontal and vertical layouts.

## Native UI naming changes

The split package uses Native UI names throughout. These are breaking renames; the old names are not aliases. The previous names below refer to the published 1.2.1 Preview.

| Previous name                                                                                                                                      | New name                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `enableNativeUIShell()`                                                                                                                            | `enableNativeUI()`                                                                                                   |
| `NativeUIShellOptions`, `NativeUIShellHandle`, `NativeUIShellStatus`, `NativeUIShellSuspension`, `NativeUIShellControls`, `NativeUIShellComponent` | `NativeUIOptions`, `NativeUIHandle`, `NativeUIStatus`, `NativeUISuspension`, `NativeUIControls`, `NativeUIComponent` |
| `IonicNativeUIShell` (plugin export and bridge registration)                                                                                       | `NativeUI`                                                                                                           |
| `withNativeUIShellTransition()`                                                                                                                    | `withNativeUITransition()` (still exported by the theme package)                                                     |
| `IonicNativeUIShellPlugin` (Swift module/native class)                                                                                             | `NativeUIPlugin`                                                                                                     |
| `RdlaboIonicThemeIos27` (SPM package/product)                                                                                                      | `RdlaboCapacitorNativeUi`                                                                                            |
| `data-shell="disabled"`                                                                                                                            | `data-native-ui="disabled"`                                                                                          |
| `.ios-theme-shell-disabled`                                                                                                                        | `.native-ui-disabled`                                                                                                |

Runtime-owned attributes/events are internal, not configuration: `data-native-ui-shell` is now `data-native-ui-projected`, other `data-native-ui-shell-*` attributes use `data-native-ui-*`, `nativeUIShell*` events use `nativeUI*`, and `.ios-theme-native-ui-shell-*` classes use `.native-ui-*`. Update application tests or diagnostics that inspect them. **Keep explicit source declarations such as `data-native-ui="button"` unchanged**; the projected marker is separate and is managed by the runtime.

## Native UI transition adapter

The Ionic transition adapter now belongs to `@rdlabo/ionic-theme-ios27`. Replace the 1.2.1 import of `withNativeUIShellTransition` from `@rdlabo/ionic-theme-ios27/vertical-bars` with `withNativeUITransition` from the theme root. Native-only applications can use `shell.suspend()` and the returned `resume()` directly.

Use `withNativeUITransition()` to keep your existing Ionic navigation animation while coordinating Native UI controls.

- If you already import `iosTransitionAnimation` from `@rdlabo/ionic-theme-ios27`, keep the [package animation setup](https://webview-native-ui.com/projects/capacitor-native-ui/docs/ionic-vertical-bars#use-the-themes-ios-animation); no configuration change is needed. It now uses the shared adapter internally; do not add another wrapper.
- If you use Ionic's default animation without a `navAnimation` option, follow [Keep Ionic's default animation](https://webview-native-ui.com/projects/capacitor-native-ui/docs/ionic-vertical-bars#keep-ionics-default-animation). The example selects Ionic's standard iOS or MD builder from the transition mode.
- If you use a custom navigation animation with Native UI or the standalone Vertical Control Area, wrap your existing builder when configuring Ionic:

```diff
+ import { withNativeUITransition } from '@rdlabo/ionic-theme-ios27';

  const ionicConfig = {
-   navAnimation: existingTransition,
+   navAnimation: withNativeUITransition(existingTransition),
  };
```

Merge this option into your existing Ionic configuration before initialization. The adapter preserves the animation's effects, duration, and easing while coordinating native retirement, swipe progress, and cancellation. Keep your existing theme stylesheet imports and Native UI or Vertical Control Area startup.

Use the adapter only for navigation; leave modal and popover animations unchanged. Your builder must create a fresh `Animation` for each navigation because Ionic destroys it afterward. Keep lifecycle events for control registration and transitions without animation. If the custom builder animates a horizontal back button separately, exclude that effect while `.ios-theme-vertical-bars` is active.

See [Connect your navigation animation](https://webview-native-ui.com/projects/capacitor-native-ui/docs/ionic-vertical-bars#2-connect-your-navigation-animation) for the setup and supported scope.

## Startup options

In 1.2.1, providing `controls` enabled **only fields set to `true`**. In the new API, omitted fields default to `true`, even in a partial object. Expand your old selection when migrating.

| 1.2.1                               | New configuration                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `controls`                       | No `controls`: all supported kinds remain selected by default.                                                                                            |
| `controls: {}`                      | `controls: false` to disable default selection, or `ionic: { auto: false }` to disable Ionic discovery altogether.                                        |
| `controls.toolbar`                  | Set `controls.buttonGroup`, `controls.button`, and `controls.backButton` to the old toolbar value.                                                        |
| `controls.tabs`, `.segment`, `.fab` | Same names, but explicitly use `false` for previously omitted fields.                                                                                     |
| `buttonProjection`                  | `ionic.verticalBars.buttonProjection`                                                                                                                     |
| `buttonDefaultFill: null`           | `ionic.verticalBars.buttonDefaultFill: 'glass'` (also the default)                                                                                        |
| `buttonDefaultFill: 'solid'`        | `ionic.verticalBars.buttonDefaultFill: 'solid'`                                                                                                           |
| `verticalBarsOnly: true`            | `controls: 'verticalOnly'` for default selection in the rail. For a partial selection, use `'verticalOnly'` on each enabled kind and `false` on the rest. |
| `enabled: false`                    | Do not start the runtime, or call the active handle's `destroy()`.                                                                                        |

The old startup option names are removed, without aliases. The standalone `enableVerticalControlArea()` entry remains available and defaults `controls` to `'verticalOnly'`; its appearance settings also move under `ionic.verticalBars`. Use only one startup entry per app.

### Preserve a tabs-only configuration

```diff
- import { enableNativeUIShell } from '@rdlabo/ionic-theme-ios27/native';
+ import { enableNativeUI } from '@rdlabo/capacitor-native-ui';

- const shell = await enableNativeUIShell({
-   controls: { tabs: true },
-   buttonProjection: 'source',
-   buttonDefaultFill: null,
+ const shell = await enableNativeUI({
+   controls: {
+     buttonGroup: false,
+     button: false,
+     backButton: false,
+     tabs: true,
+     segment: false,
+     fab: false,
+   },
+   ionic: {
+     verticalBars: { buttonProjection: 'source', buttonDefaultFill: 'glass' },
+   },
  });
```

### Select controls by placement

All six control fields accept `boolean | 'horizontalOnly' | 'verticalOnly'`. A scalar `controls` value applies to every field. Horizontal and vertical mean ordinary placement and the rail, not device orientation or model.

```ts
const shell = await enableNativeUI({ controls: 'verticalOnly' });
```

These are selection defaults, not a hard projection scope. Explicit `data-native-ui` sources and local `data-horizontal-bars="true"` / `data-vertical-bars="true"` can opt in even when a matching default is `false`. Remove the explicit marker or use `data-native-ui="disabled"` to leave an individual source on the Web. `ionic.auto: false` disables automatic Ionic discovery, including local layout opt-ins, but leaves explicit source declarations enabled.

`buttonGroup` controls grouping only. It does not select children: `buttonGroup: true, button: false` projects no ordinary action without explicit selection. `backButton` controls back navigation independently, including inside an `ion-buttons` container. See [all settings](https://webview-native-ui.com/projects/capacitor-native-ui/docs/configuration) for the complete selection matrix and [toolbar grouping](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui#toolbar-selection-and-grouping) for local overrides.

## Web layout ownership

Import `setVerticalBarsLayout` and `applyFoldStateClasses` from `@rdlabo/ionic-theme-ios27` for theme CSS. Replace `setVerticalControlAreaPlacement({ edge, nativeEdge, inset })` with `setVerticalBarsLayout({ edge, inset })`. Native UI now reads availability from its own device metrics; `nativeEdge` is ignored by the deprecated compatibility helper. Normal startup, disabled rails and teardown do not remove theme classes or alter reserved Web spacing. An unavailable native rail keeps the application’s Web rail layout; applications wanting a horizontal layout must select it themselves. Native-only applications can continue to use their own layout CSS.
