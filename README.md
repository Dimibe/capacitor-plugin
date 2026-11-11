# Capacitor Native UI

Capacitor Native UI provides native controls, device colors and custom native content for WebView applications.

For a complete Ionic app setup combining iOS Native UI and Android Dynamic Color, follow [WebView Native UI Standard setup](https://webview-native-ui.com/standard-setup).

## Individual guides

### 1. Use the plugin’s Native UI

The plugin renders supported Ionic and HTML controls natively on iOS. Your application keeps its state, routing and handlers.

| Your app                             | Guide                                               |
| ------------------------------------ | --------------------------------------------------- |
| Ionic with the standard iOS 27 theme | [Ionic setup](docs/setup.md)                        |
| Ionic with an existing Web theme     | [Existing-theme setup](docs/ionic-vertical-bars.md) |
| HTML without Ionic                   | [HTML setup](docs/framework-independent.md)         |

#### How projection works

Native UI presents the original Web control natively while retaining its state and handlers. See [supported controls and projection behavior](docs/native-ui.md).

### 2. Use Dynamic Color

Read Android’s device palette and apply it through your theme. Use the [Dynamic Color guide](docs/dynamic-colors.md) for this feature on its own, appearance preferences and color mapping.

### 3. Build your own Native UI

Render your own SwiftUI or Android Compose content through [app-local extensions](docs/native-ui-extensions.md). This feature is experimental.

## Requirements

Native startup requires Capacitor 8 and an iOS or Android project. Android extensions require API 24+ and Kotlin/Compose. Ordinary native rendering requires iOS 26+ and Xcode 26+. The Ionic adapter declares Ionic `>=8.8.1 <10`, with automated E2E validation on Ionic 9; the `/core` HTML adapter requires no Ionic or theme package. [Vertical Bars](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars) and [extension placement](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui-extensions#content-and-placement-are-independent) have additional device requirements.

For standard controls, follow the setup guide for your markup; the Ionic and HTML adapters use different imports. For custom native content, start directly with the [extensions guide](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui-extensions).

## Reference

- [Supported Ionic controls](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui#supported-markup) and fallback behavior.
- [Configuration](https://webview-native-ui.com/projects/capacitor-native-ui/docs/configuration): defaults, selected controls, rail-only mode, and live changes.
- [Light and dark appearance](https://webview-native-ui.com/projects/capacitor-native-ui/docs/appearance): inherit the Web theme, configure custom HTML, and understand shared rail appearance.
- [Vertical Bars](https://webview-native-ui.com/projects/capacitor-native-ui/docs/vertical-bars): eligibility, appearance, and runtime API.
- [Migration](https://webview-native-ui.com/projects/capacitor-native-ui/docs/migration): package names, imports, and native project updates.

## Development

```sh
npm ci
npm run build
npm test
npm run test:packages
```

Shared DOM and renderer implementation is maintained in the local `packages/native-ui-core` workspace. This repository owns Capacitor registration and the host adapters. `android/src/main/java/shared-core` is generated from the local Core sources by `npm run sync:core`; edit Core, not this copy. SwiftPM and CocoaPods compile the shared Swift sources directly from `packages/native-ui-core/ios/Sources`. Git-based SwiftPM consumers do not need Node.js. Existing native module and Kotlin symbol names are preserved for app-local extensions.

The repository root remains the npm plugin: `src`, `ios`, `android`, and `package.json` live together. Its TypeScript unit tests live in `tests`; Swift and Android tests live with the plugin. `examples/native-ui-html` demonstrates use without the Ionic theme.

The build follows the Capacitor plugin layout: `src/index.ts` is compiled by TypeScript to `dist/esm`, and Rollup generates the browser bundle (`dist/plugin.js`) and CommonJS bundle (`dist/plugin.cjs`). The `.cjs` extension is required because this package uses `type: module`. Public ESM subpaths share the same modules in `dist/esm`. Run `npm run watch` to rebuild TypeScript changes or `npm run verify:web` for the web checks.

## Test with the Ionic theme

The full Ionic demo, screenshot tests, theme transition tests, and simulator integration fixtures remain in [ionic-theme-ios27](https://github.com/webview-native-ui/ionic-theme-ios27). They install this plugin as an npm dependency. Do not duplicate the demo here.

To test unpublished changes, build and pack this repository:

```sh
npm run build
npm pack --ignore-scripts --pack-destination /tmp
```

From a migrated theme checkout, run `npm run test:native-candidate -- /tmp/rdlabo-capacitor-native-ui-VERSION.tgz --e2e`. The command creates an isolated copy, installs the archive for both the theme and demo, then runs package checks, integration unit tests, the production build, and browser tests. Add `--simulator=UDID` to run the existing simulator suites. The original checkout and its lockfiles are preserved; the temporary copy remains available for diagnostics.

## Releases

The plugin has an independent version from the theme. Run `npm run release` from an up-to-date main when authorized to publish. The `vVERSION` tag workflow publishes only this plugin (`next` for prereleases, `latest` for stable versions).

Pin Engine to the same exact version in both npm manifests, `Package.swift`, the podspec and Android Gradle dependency, and update the lockfile together. A floating npm range can resolve a newer Engine than the native dependencies and break installation.

Before the first release, configure the npm trusted publisher for `webview-native-ui/capacitor-plugin`, workflow `release.yml`, environment `npm`. Configure that GitHub environment's reviewer policy as appropriate. Already-published versions cannot be republished; choose a new version for the first release from this repository.

This repository was extracted from `webview-native-ui/ionic-theme-ios27` commit `1831bde5`. Earlier history remains in that repository.

## Developing shared Core

Core lives in `packages/native-ui-core` in this repository. Run `npm ci`, `npm run build`, and `npm test` from the repository root; no separate Core publication or checkout is required. The build embeds Core JavaScript and declarations into the plugin archive. Core is a private workspace, not a separately released npm dependency.

Edit shared TypeScript, Swift and Kotlin in `packages/native-ui-core`. `npm run sync:core` regenerates the Android copy; `npm run check:core` detects drift. Shared renderer/DOM tests run alongside Capacitor adapter tests through the root test command. Native Core tests remain under its `ios` and `android` directories.

Capacitor migrations run from this repository root. `package.json`, `Package.swift`, the podspec and `android/` retain their standard locations. Validate native builds after SDK migrations; retaining the layout does not guarantee compatibility with future migration tools.

### Swift Package consumers

Add `https://github.com/webview-native-ui/capacitor-plugin.git` in Xcode and select the `NativeUICore` product to use `import NativeUICore` without linking the Capacitor adapter. Both products share the repository release tags; SwiftPM can still fetch Capacitor while resolving the package dependencies.

Capacitor apps continue to use the `RdlaboCapacitorNativeUi` product and `import NativeUIPlugin`. That module re-exports Core, so existing `NativeUI.register` calls keep using the same registration state as the adapter. The root manifest owns both targets; there is no separate nested Swift package.

CocoaPods continues to compile the adapter and shared sources into the existing plugin pod. This change does not publish a standalone Core pod or implement a Cordova adapter.
