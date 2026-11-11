# Connect application startup and device layout

Start Native UI once after the app shell renders. Connect Foldable's layout reports to the theme to keep Web spacing in sync with the device.

## Device layout

After `ion-app` renders, subscribe to `layoutChange`, then read the initial layout:

```ts
import { Foldable } from '@erkamyaman/capacitor-foldable';
import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';
import { setVerticalBarsLayout } from '@rdlabo/ionic-theme-ios27';

const updateLayout = async () => {
  setVerticalBarsLayout(await resolveVerticalBarsLayout(Foldable));
};

void Foldable.addListener('layoutChange', () => void updateLayout().catch(console.error))
  .then(updateLayout)
  .catch(console.error);
```

Use Foldable 8.5 or later within version 8. The resolver returns `edge`, `inset` and `toolbarTop` in viewport CSS pixels. The theme applies these values to Web layout; a null edge restores ordinary layout. Native UI handles control projection separately.

## Angular bootstrap

In `src/main.ts`, start Native UI after Angular bootstraps:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { enableNativeUI } from '@rdlabo/capacitor-native-ui';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

void bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    void enableNativeUI().catch(console.error);
  })
  .catch(console.error);
```

Place the device-layout code above in the app shell's existing `afterNextRender` callback. Keep the application's Ionic routes and page handlers as they are. No additional service or lifecycle wrapper is needed.

## React, Vue and other frameworks

After the app shell renders, start Native UI once and connect the device-layout code above:

```ts
import { enableNativeUI } from '@rdlabo/capacitor-native-ui';

void enableNativeUI().catch(console.error);
```

Use the application's startup entry after mounting, rather than a routed page. HTML applications use the `/core` entry and their own CSS updater in place of `setVerticalBarsLayout`.

## Verify device behavior

On a supported rail device, change the active display and verify that Web content spacing and toolbar origin update together. On devices without a rail, ordinary layout remains active. A browser preview verifies Web layout; native rail rendering requires the supported iOS device and OS.
