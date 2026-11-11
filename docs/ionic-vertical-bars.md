---
title: Vertical Bars with your existing theme
---

# Vertical Bars with your existing theme

Vertical Bars is part of the default Native UI setup. Use this guide to retain your app's existing Web theme instead of adopting the standard iOS 27 theme preset. Choose the setup for your app's components, whether you use Angular, React, Vue or another framework.

Read [how projection works](https://webview-native-ui.com/projects/capacitor-native-ui/docs/readme#how-projection-works) for the relationship between source DOM, projected controls and actions. Then choose your setup below.

## Choose your setup

| Your app                                                                       | Start here                                                                                                                                                                                                                                                  | What you add                                                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Ionic components with your own theme, Ionic's default styles, or another theme | [Ionic setup below](#try-it-in-your-existing-ionic-app)                                                                                                                                                                                                     | Foldable device placement, standalone rail CSS and the Ionic Native UI adapter. Keep your existing theme. |
| No Ionic components (plain HTML, React, Vue, Angular, etc.)                    | [HTML setup](https://webview-native-ui.com/projects/capacitor-native-ui/docs/framework-independent), then its [device rail setup](https://webview-native-ui.com/projects/capacitor-native-ui/docs/framework-independent#device-placement-for-vertical-bars) | `@rdlabo/capacitor-native-ui/core` and Foldable. Your app supplies the rail layout; no theme package.     |
| Already using the iOS 27 theme and Native UI                                   | [Connect device placement](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars#use-with-capacitor-foldable)                                                                                                                       | Reuse your existing runtime. Do not start another one.                                                    |

**Without Ionic, follow the HTML guide instead of the steps below.** You do not need `@rdlabo/ionic-theme-ios27`, `vertical-bars.css`, `ion-app`, or Ionic navigation animations. Explicitly marked HTML buttons and back buttons are supported; arbitrary HTML tabs are not automatically converted. A browser preview requires an application-styled `webHost`; native rail presentation also requires supported iOS hardware and software.

The rest of this page is for **Ionic apps**. Both Ionic `ios` and `md` modes are supported. Tabs and supported toolbar actions move to the side; content and horizontal controls keep their existing appearance.

iPhone Duo support and Vertical Bars are stable starting with version 2.0.0.

## Try it in your existing Ionic app

### 1. Install and load the standalone stylesheet

Start with your existing Ionic app (Ionic `>=8.8.1 <10`, Capacitor 8). Existing Foldable installations must meet the [device-layout API requirement](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars#use-with-capacitor-foldable): version 8.5 or later within version 8. Install Native UI, the layout stylesheet package and the required device-state plugin together:

```bash
npm install @rdlabo/ionic-theme-ios27 @rdlabo/capacitor-native-ui @erkamyaman/capacitor-foldable
```

Keep your existing theme imports. Add this to your global Sass file:

```scss
@use '@rdlabo/ionic-theme-ios27/dist/css/vertical-bars.css';
```

The full iOS 27 theme stylesheets are not required. Keep this stylesheet instead of Foldable's `ionic-tabs.css`; loading both would reposition the same tabs.

We adopt [Capacitor Foldable](https://github.com/erkamyaman/capacitor-foldable) as the standard device integration because it exposes placement, posture and their changes while leaving layout decisions to your app. Resolve its device report with `resolveVerticalBarsLayout(Foldable)` and pass the returned edge, inset and toolbar origin to the theme's layout helper. Native UI checks native rail availability independently.

### 2. Connect your navigation animation

Configure `navAnimation` before Ionic initializes. Starting the rail runtime does not register this option. The adapter prepares native controls and coordinates navigation progress and cancellation while keeping your existing page animation.

#### Keep Ionic's default animation

If you have not configured `navAnimation`, wrap Ionic's standard builders. Select the builder from Ionic's transition `mode` so both `ios` and `md` keep their usual animation:

```ts
import { iosTransitionAnimation, mdTransitionAnimation, type AnimationBuilder } from '@ionic/core';
import { withNativeUITransition } from '@rdlabo/ionic-theme-ios27';

const defaultTransition: AnimationBuilder = (baseEl, opts) =>
  (opts.mode === 'ios' ? iosTransitionAnimation : mdTransitionAnimation)(baseEl, opts);

const ionicConfig = {
  navAnimation: withNativeUITransition(defaultTransition),
};
```

Merge this option into your existing Ionic configuration before initialization: pass it to Angular's `provideIonicAngular()`, React's `setupIonicReact()`, or Vue's `IonicVue` plugin options. Keep your existing theme stylesheet imports. No iOS 27 theme stylesheet is required.

#### Use the theme's iOS animation

If you already use the iOS 27 transition, keep this configuration. It includes the native adapter and excludes the horizontal back-button effect in vertical layouts; no additional wrapper is needed. Importing this JavaScript entry point does not load the theme stylesheets.

```ts
import { iosTransitionAnimation } from '@rdlabo/ionic-theme-ios27';

const ionicConfig = {
  navAnimation: iosTransitionAnimation,
};
```

Apply this option to your existing iOS-mode configuration and keep your MD configuration.

#### Keep your custom animation

If your app uses another builder for `navAnimation`, wrap it:

```ts
import type { AnimationBuilder } from '@ionic/core';
import { withNativeUITransition } from '@rdlabo/ionic-theme-ios27';

// Pass the animation builder your app already uses.
const configureNavigation = (existingTransition: AnimationBuilder) => ({
  navAnimation: withNativeUITransition(existingTransition),
});
```

The adapter returns the original `Animation`, preserving its effects, duration, and easing. Use it only for navigation, not modal or popover animations. The builder must return a fresh `Animation` for each navigation; Ionic destroys it after the transition. Keep lifecycle events for control registration and transitions without animation.

The adapter keeps the builder's animation targets, including any horizontal back-button effect. If you need the iOS 27 transition with that effect excluded in vertical layouts, use `iosTransitionAnimation` from `@rdlabo/ionic-theme-ios27` as your `navAnimation` instead. It already includes the adapter, so no wrapper is needed.

### 3. Connect device placement and start the controls

Use [application startup and device layout](device-layout.md) to start the default `enableNativeUI()` runtime and connect Foldable's initial layout and `layoutChange` events. Apply the stylesheet and Ionic animation from steps 1 and 2 as this application's theme configuration.

The application owner handles startup and disposal. The device module applies `edge`, `inset` and `toolbarTop` through the theme; Native UI owns projection and checks native availability. A null edge restores ordinary layout.

### Initial layout timing

Run step 3 from your application bootstrap as soon as `ion-app` is mounted; do not wait for a routed page's data requests. `setVerticalBarsLayout()` needs that element to exist and does not save placement supplied before mounting. Keep device reporting in an application-owned service or integration module, separate from routed-page handlers. Keep startup and cleanup with the same application owner, as described in [application startup and device layout](device-layout.md).

Native startup, device placement and control rendering are asynchronous. Resolving `enableNativeUI()` gives you the runtime handle, not a guarantee that controls have already been projected. Starting promptly avoids application-added waiting, but the initial Web layout may still be visible before native projection.

### 4. Build, sync and run on iPhone Duo

Build your application's Web assets, then sync the native project:

```sh
npx cap sync ios
```

Build with Xcode 27.1 or newer and run on iPhone Duo with iOS 27.1 or later. Keep your existing SPM or CocoaPods integration; see [Native UI setup](https://webview-native-ui.com/projects/capacitor-native-ui/docs/setup#4-build-sync-and-run).

**What you should see when the device reports a rail:** your existing tab bar and eligible fixed-toolbar actions move to the side. Content keeps its theme and reserves the measured inset. Supported iOS rails use SwiftUI; unavailable native presentation retains the Web rail. Devices reporting a null edge keep their ordinary layout. Use the [optional browser preview](#optional-browser-preview) to simulate a rail without a device report.

Keep your existing click handlers, routing and form associations. By default, actions need an `ion-icon` or SVG with `slot="icon-only"` in a fixed toolbar. All fills (`default`, `clear`, `solid`, `outline`) follow this rule, including submit buttons. Other actions remain horizontal. Use `.ios-theme-horizontal-only` on an `ion-buttons` group or individual `ion-button` to keep an action horizontal.

### Optional: choose native button appearance

See [Choose button appearance](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars#choose-button-appearance) for appearance settings and local overrides.

The default is `system`: SwiftUI styles vertical buttons and tints their icons. If your existing theme should supply their fill and colors, set the options on the application's existing startup call; keep the device connection:

```ts
const shell = await enableNativeUI({
  ionic: { verticalBars: { buttonProjection: 'source', buttonDefaultFill: 'solid' } },
});
```

The `solid` default suits ordinary Ionic buttons. Buttons inside `ion-buttons` still default to clear; set `fill="solid"` explicitly to project their background. For one-off exceptions, use the [local projection settings](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars#override-individual-buttons-or-groups). These settings affect native vertical buttons only; Web clones keep their existing appearance.

### If the rail does not appear

| What you see                                | What to check                                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary layout                             | Check Foldable's reported edge. A null edge intentionally keeps ordinary layout.                                                                                                |
| Reported edge but no side spacing           | Load `vertical-bars.css` and apply the initial layout and `layoutChange` events after `ion-app` mounts.                                                                         |
| Space appears, but controls stay horizontal | Start the runtime once. Use existing tabs or supported `slot="icon-only"` actions in a fixed header/footer toolbar.                                                             |
| One action stays horizontal                 | Check its icon slot, fixed placement and exclusions. See [control requirements](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars#toolbar-actions). |

## Optional browser preview

For local layout testing without a device report, temporarily omit the Foldable subscription from step 3 and apply a simulated placement after `ion-app` mounts:

```ts
setVerticalBarsLayout({ edge: 'trailing', inset: 80 });
```

Keep the same stylesheet and single Native UI runtime. Use `leading` to preview the other logical edge, or `null` to restore ordinary layout. The helper manages `ios-theme-vertical-bars` and its physical-left variant; manual classes are not part of device setup. See [layout classes](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/vertical-bars-layout#reserve-the-vertical-rail) for CSS-only previews.

Web rail tabs display icons and reveal labels while pressing and dragging. Browser previews verify Web layout and actions, not native SwiftUI appearance. Restore the Foldable subscription for the device build.

## Use hinge posture without projecting controls

If your existing theme needs only a posture-driven split pane or a layout switch, do not start a projection runtime or add `.ios-theme-vertical-bars`. Pass `Foldable.getFoldState()` results and `foldStateChange` events to `applyFoldStateClasses(root, fold)`, removing the listener when finished. There is no separate start/stop monitoring call.

See [Read the device layout](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/vertical-bars-layout#read-the-device-layout) for the subscription example, null values, and monitoring lifetime. See [Adapt the split pane](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/vertical-bars-layout#adapt-the-split-pane) for the opt-in width rules and half-open state.

## Shared layout rules and API

Safe-area handling, overlays, RTL, control eligibility, Web simulation, and the handle API are documented in [Vertical Bars](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars). Read that reference when you need to customize this setup; it is not an additional installation step.

## Resolve device layout

Step 3 already connects the resolver; do not add another device subscription here. Keep that connection in an application-owned service or integration module, initialized after `ion-app` mounts. Routed pages keep their original markup and business handlers.

Foldable reports device geometry. `resolveVerticalBarsLayout` is an SDK-free adapter that returns `edge`, `inset` and `toolbarTop`; it does not start Native UI, subscribe to events or write CSS. The theme's `setVerticalBarsLayout` owns Web layout and defaults; Native UI owns projection and checks native availability independently. `layoutChange` covers display changes that leave edge and inset unchanged. Subscribe before the initial read and remove the listener during application teardown.

Missing or failed reads remain undefined so the applying theme retains its defaults. Provider frames and insets use browser viewport CSS pixels. Foldable's points match the usual device-width, initial-scale=1 viewport; other scales require a normalized provider. The nearest `dir` on `ion-app` or its ancestors determines the physical rail side, matching the theme.
