# Native UI Core

Private workspace inside capacitor-plugin containing host-independent DOM synchronization and native rendering. Capacitor remains the primary supported host; this boundary permits future adapters without duplicating renderers.

Run `npm ci`, `npm run build`, and `npm test` at the repository root. The plugin build embeds this workspace into its distribution; Core requires no separate publication. SwiftPM exposes the NativeUICore product from the repository root and compiles Swift sources here directly. Edit Android sources here and run `npm run sync:core` at the root to update its committed copy.

`npm run check:boundary --workspace @webview-native-ui/core` checks for host SDK imports. Swift tests run from the repository root using the NativeUICore scheme; Android tests remain here but run through the root Android project's `:testDebugUnitTest` task, including CI.
