# Set up Native UI in an Ionic app

Install the packages, configure the theme, and start Native UI. Ordinary controls and **Vertical Bars are enabled by default**; the device determines whether a native rail is available.

## 1. Install the packages

```sh
npm install @rdlabo/capacitor-native-ui @rdlabo/ionic-theme-ios27 @erkamyaman/capacitor-foldable
```

Use an existing Ionic app with Capacitor 8 and an iOS project. The standard setup uses the iOS 27 theme preset and Foldable 8.5 or later within version 8.

## 2. Configure the theme

Keep Ionic's base CSS. Use this single entry as the application's theme and dark-palette stylesheet:

```css
@import '@rdlabo/ionic-theme-ios27/styles/system.css';
```

Pass the preset to the application's Ionic initializer before rendering:

```ts
import { ios27ThemeConfig } from '@rdlabo/ionic-theme-ios27';

const ionicConfig = {
  ...ios27ThemeConfig,
};
```

| Framework         | Ionic initializer                                                   |
| ----------------- | ------------------------------------------------------------------- |
| Angular / Ionic 8 | `provideIonicAngular(ionicConfig)` from `@ionic/angular/standalone` |
| Angular / Ionic 9 | `provideIonicAngular(ionicConfig)` from `@ionic/angular`            |
| React             | `setupIonicReact(ionicConfig)` from `@ionic/react`                  |
| Vue               | `app.use(IonicVue, ionicConfig)` with `IonicVue` from `@ionic/vue`  |

The stylesheet includes the rail layout and system dark palette. The preset supplies Ionic mode and animations, including Native UI navigation coordination.

## 3. Start Native UI

After the app shell mounts, start the default runtime:

```ts
import { enableNativeUI } from '@rdlabo/capacitor-native-ui';

await enableNativeUI();
```

For Angular, call this after `bootstrapApplication` resolves. For React or Vue, call it after the app shell renders. Connect Foldable's initial layout and `layoutChange` notifications through `resolveVerticalBarsLayout` and the theme's `setVerticalBarsLayout`; see [startup and device layout examples](device-layout.md).

## 4. Build, sync, and run

Build the application's Web assets, then sync the native project:

```sh
npx cap sync ios
```

Rebuild and run in Xcode on iOS 26+ with Xcode 26+. Native rail rendering additionally requires the [supported device and OS](vertical-bars.md#native-rendering); other devices keep ordinary layout. SwiftPM resolves Engine automatically. Existing CocoaPods applications use the [native project setup](configuration.md#native-project-setup).

Verify that existing toolbar actions and tabs invoke their original handlers. Navigate forward and back, cancel a back gesture, and change the active display on a rail device. Check Web fallback in the browser.

## Next steps

- [Use an existing Web theme](ionic-vertical-bars.md) instead of the standard theme preset.
- [Use HTML without Ionic](framework-independent.md).
- [Configure appearance and application overrides](https://webview-native-ui.com/projects/ionic-theme-ios27/docs/configuration).
- [Supported controls](native-ui.md) and [configuration reference](configuration.md).
- [Update an earlier integration](migration.md#simplify-an-existing-ios-setup).
