# Connect application startup and device layout

Connect the runtime and device layout once for the application. Native UI projects controls; the theme applies Web layout; the application connects Foldable's device reports to that layout. The same connection supports the standard theme preset and an existing Web theme.

## Device layout module

Create `src/device-layout.ts`. This application-owned module has no component or router state. Subscribe before the initial read, apply the resolver's values, and remove the listener when its owner stops:

```ts
import { Capacitor } from '@capacitor/core';
import { Foldable } from '@erkamyaman/capacitor-foldable';
import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';

export async function connectDeviceLayout(
  applyLayout: (layout: Awaited<ReturnType<typeof resolveVerticalBarsLayout>>) => void,
): Promise<() => Promise<void>> {
  if (Capacitor.getPlatform() !== 'ios') return async () => {};
  let active = true;
  const refresh = async () => {
    const layout = await resolveVerticalBarsLayout(Foldable);
    if (active) applyLayout(layout);
  };
  const listener = await Foldable.addListener('layoutChange', () => {
    void refresh().catch((error: unknown) => console.error('Device layout refresh failed', error));
  });
  try {
    await refresh();
  } catch (error) {
    active = false;
    await listener.remove();
    throw error;
  }
  return async () => {
    active = false;
    await listener.remove();
  };
}
```

The callback owns Web layout. Ionic theme users pass `setVerticalBarsLayout`; HTML applications pass their own CSS/layout updater and use Native UI's `/core` entry. The device module itself imports no theme or framework.

This uses Foldable 8.5 or later within version 8. The resolver returns `edge`, `inset` and `toolbarTop` in viewport CSS pixels. A null edge restores ordinary layout; unavailable values leave the theme's defaults in place. Device geometry and native rendering availability are separate inputs.

## Angular bootstrap

Use a root service to own the device connection. Create `src/app/vertical-bars-layout.service.ts`:

```ts
import { DestroyRef, Injectable, inject } from '@angular/core';
import { connectDeviceLayout } from '../device-layout';
import { setVerticalBarsLayout } from '@rdlabo/ionic-theme-ios27';

@Injectable({ providedIn: 'root' })
export class VerticalBarsLayoutService {
  readonly #destroyRef = inject(DestroyRef);

  async initialize(): Promise<void> {
    const disconnect = await connectDeviceLayout(setVerticalBarsLayout);
    if (this.#destroyRef.destroyed) {
      await disconnect();
      return;
    }
    this.#destroyRef.onDestroy(() => {
      void disconnect().catch((error: unknown) => console.error('Device layout cleanup failed', error));
    });
  }
}
```

Connect the service and Native UI in the application's existing `src/main.ts`. `appConfig` supplies the Ionic preset and routes; `AppComponent` composes the app shell and router outlet:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { enableNativeUI } from '@rdlabo/capacitor-native-ui';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { VerticalBarsLayoutService } from './app/vertical-bars-layout.service';

void bootstrapApplication(AppComponent, appConfig)
  .then(async (app) => {
    const shell = await enableNativeUI();
    if (app.destroyed) {
      await shell.destroy();
      return;
    }
    app.onDestroy(() => {
      void shell.destroy().catch((error: unknown) => console.error('Native UI cleanup failed', error));
    });
    await app.injector.get(VerticalBarsLayoutService).initialize();
  })
  .catch((error: unknown) => console.error('Application startup failed', error));
```

The application owns the runtime handle and destroys it on shutdown. The root service removes the device subscription. Page components retain their existing state and action handlers.

## React, Vue and other application owners

Use the same `connectDeviceLayout` module from application startup after the app shell mounts. The integration is framework-independent:

```ts
import { enableNativeUI } from '@rdlabo/capacitor-native-ui';
import { connectDeviceLayout } from './device-layout';
import { setVerticalBarsLayout } from '@rdlabo/ionic-theme-ios27';

export async function startApplicationNativeUI(): Promise<() => Promise<void>> {
  const shell = await enableNativeUI();
  try {
    const disconnect = await connectDeviceLayout(setVerticalBarsLayout);
    return async () => {
      try {
        await disconnect();
      } finally {
        await shell.destroy();
      }
    };
  } catch (error) {
    await shell.destroy();
    throw error;
  }
}
```

Await this function once from the application's mounted startup, keep its returned disposer, and await the disposer before unmounting that application. React development Strict Mode can remount effects: keep this once-per-application startup at the application owner rather than starting it from each routed component or repeatedly from a remounting effect. Vue applications likewise use their application owner rather than page lifecycle hooks. Browser/server rendering should only call it after the document exists.

## Verify device behavior

On a supported rail device, change the active display and verify that Web content spacing and toolbar origin update together. On devices without a rail, ordinary layout remains active. A browser preview verifies Web layout; native rail rendering requires the supported iOS device and OS.
