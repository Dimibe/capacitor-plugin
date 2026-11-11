# Set up iOS Native UI and Android Dynamic Color

This standard Ionic setup combines the plugin’s native controls on iOS, including iPhone Duo / Vertical Bars, with Android Dynamic Color. Your application keeps its state, routes and event handlers.

## 1. Install the packages

```sh
npm install @rdlabo/capacitor-native-ui @rdlabo/ionic-theme-ios27 @rdlabo/ionic-theme-md3 @erkamyaman/capacitor-foldable
```

Use an existing Ionic app with Capacitor 8. Foldable must be version 8.5 or later within version 8.

## 2. Configure both themes

Keep Ionic’s base CSS and use these theme stylesheets. The iOS entry includes the class-based dark palette and Vertical Bars layout. Replace an existing system-based or always-dark palette import with this entry.

```css
@import '@rdlabo/ionic-theme-ios27/styles/class.css';
@import '@rdlabo/ionic-theme-md3/styles/theme.css';
```

Pass the matching preset to your existing Ionic initializer:

```ts
import { Capacitor } from '@capacitor/core';
import { ios27ThemeConfig } from '@rdlabo/ionic-theme-ios27';
import { md3ThemeConfig } from '@rdlabo/ionic-theme-md3';

const ionicConfig = Capacitor.getPlatform() === 'ios' ? ios27ThemeConfig : md3ThemeConfig;
```

| Framework         | Ionic initializer                                                   |
| ----------------- | ------------------------------------------------------------------- |
| Angular / Ionic 8 | `provideIonicAngular(ionicConfig)` from `@ionic/angular/standalone` |
| Angular / Ionic 9 | `provideIonicAngular(ionicConfig)` from `@ionic/angular`            |
| React             | `setupIonicReact(ionicConfig)` from `@ionic/react`                  |
| Vue               | `app.use(IonicVue, ionicConfig)` with `IonicVue` from `@ionic/vue`  |

## 3. Start after the app shell renders

Run this once after the app shell, including `ion-app`, has rendered. It connects both features and the required device-layout notifications:

```ts
import { Capacitor } from '@capacitor/core';
import { enableNativeUI, getDynamicColorScheme, addDynamicColorListener } from '@rdlabo/capacitor-native-ui';
import { Foldable } from '@erkamyaman/capacitor-foldable';
import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';
import { setVerticalBarsLayout } from '@rdlabo/ionic-theme-ios27';
import { enableDynamicColors } from '@rdlabo/ionic-theme-md3/dynamic-colors';

await enableDynamicColors({
  getScheme: getDynamicColorScheme,
  listen: addDynamicColorListener,
  mode: 'system',
  onError: console.error,
});

if (Capacitor.getPlatform() === 'ios') {
  await enableNativeUI();

  const updateLayout = async () => {
    setVerticalBarsLayout(await resolveVerticalBarsLayout(Foldable));
  };

  void Foldable.addListener('layoutChange', () => void updateLayout().catch(console.error))
    .then(updateLayout)
    .catch(console.error);
}
```

The theme controller follows the system appearance and applies Android’s palette when available. Other platforms and unsupported Android devices keep the theme’s fallback colors. On iOS, Native UI starts with ordinary controls and Vertical Bars enabled; the layout subscription applies the initial placement and display changes.

For Angular, use the app shell’s `afterNextRender` callback. For React or Vue, use application startup after mounting. If your app manages its own appearance preference, use the [Dynamic Color guide](dynamic-colors.md#apply-to-ionic) to connect it instead of creating a second appearance controller.

## 4. Build, sync, and run

Build the application’s Web assets, sync, then rebuild and run each native app:

```sh
npx cap sync
```

iOS native controls require iOS 26+ and Xcode 26+. Android Dynamic Color requires Android 12+; older devices retain the default palette. Native rail rendering additionally requires a [supported device and OS](vertical-bars.md#native-rendering). SwiftPM resolves Engine automatically; existing CocoaPods projects use [native project setup](configuration.md#native-project-setup).

## Individual options

For Native UI without these themes, use [existing-theme setup](ionic-vertical-bars.md) or [HTML setup](framework-independent.md). See [Dynamic Color](dynamic-colors.md) for appearance preferences and color mapping, [configuration](configuration.md) for Native UI options, and [migration](migration.md) for an existing integration.
