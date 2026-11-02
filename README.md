# Capacitor Native UI

Source repository for `@rdlabo/capacitor-native-ui`. The npm package name and public APIs are unchanged.

[Documentation](https://docs.rdlabo.dev/projects/capacitor-native-ui/docs/readme) · [Ionic integration demo](https://ionic-theme-ios27.rdlabo.dev/)

## Development

```sh
npm ci
npm run build
npm test
npm run test:packages
```

The plugin lives in `packages/capacitor-native-ui`. Its TypeScript unit tests live in `tests`; Swift and Android tests live with the plugin. `examples/native-ui-html` demonstrates use without the Ionic theme.

## Test with the Ionic theme

The full Ionic demo, screenshot tests, theme transition tests, and simulator integration fixtures remain in [ionic-theme-ios27](https://github.com/webview-native-ui/ionic-theme-ios27). They install this plugin as an npm dependency. Do not duplicate the demo here.

To test unpublished changes, build and pack this repository:

```sh
npm run build
npm pack --workspace packages/capacitor-native-ui --ignore-scripts --pack-destination /tmp
```

From a migrated theme checkout, run `npm run test:native-candidate -- /tmp/rdlabo-capacitor-native-ui-VERSION.tgz --e2e`. The command creates an isolated copy, installs the archive for both the theme and demo, then runs package checks, integration unit tests, the production build, and browser tests. Add `--simulator=UDID` to run the existing simulator suites. The original checkout and its lockfiles are preserved; the temporary copy remains available for diagnostics.

## Releases

The plugin has an independent version from the theme. Run `npm run release` from an up-to-date main when authorized to publish. The `capacitor-vVERSION` tag workflow publishes only this plugin (`next` for prereleases, `latest` for stable versions).

Before the first release, configure the npm trusted publisher for `webview-native-ui/capacitor`, workflow `release.yml`, environment `npm`. Configure that GitHub environment's reviewer policy as appropriate. Already-published versions cannot be republished; choose a new version for the first release from this repository.

This repository was extracted from `webview-native-ui/ionic-theme-ios27` commit `1831bde5`. Earlier history remains in that repository.
