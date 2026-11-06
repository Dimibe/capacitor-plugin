#!/bin/bash
set -euo pipefail
# Evaluate the installed plugin outside the monorepo, without sibling npm packages.
# dump-package checks manifest resolution without fetching or executing remote code.
ENGINE_PROBE=$(mktemp -d)
trap 'rm -rf "$ENGINE_PROBE"' EXIT
cp Package.swift "$ENGINE_PROBE/Package.swift"
cp package.json "$ENGINE_PROBE/package.json"
mkdir -p "$ENGINE_PROBE/ios/Sources/NativeUIPlugin" "$ENGINE_PROBE/ios/Tests/NativeUIPluginTests" "$ENGINE_PROBE/packages/native-ui-core/ios/Sources/NativeUICore" "$ENGINE_PROBE/packages/native-ui-core/ios/Tests/NativeUICoreTests"
ENGINE_REQUIREMENT=$(node -p "require('./package.json').dependencies['@webview-native-ui/engine']")
swift package --package-path "$ENGINE_PROBE" dump-package > "$ENGINE_PROBE/manifest.json"
node --input-type=module - "$ENGINE_PROBE/manifest.json" "$ENGINE_REQUIREMENT" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const [path, requirement] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(path, 'utf8'));
const dependency = manifest.dependencies.find(entry => entry.sourceControl?.[0]?.identity === 'engine').sourceControl[0];
assert.equal(dependency.location.remote[0].urlString, 'https://github.com/webview-native-ui/engine.git');
assert.equal(requirement, '1.0.3');
assert.deepEqual(dependency.requirement.exact, ['1.0.3']);
assert(!manifest.dependencies.some(entry => entry.fileSystem), 'Installed plugin must not require sibling npm Swift sources');
assert.deepEqual(manifest.products.find(p => p.name === 'NativeUICore')?.targets, ['NativeUICore']);
assert.deepEqual(manifest.products.find(p => p.name === 'RdlaboCapacitorNativeUi')?.targets, ['NativeUIPlugin']);
const core = manifest.targets.find(t => t.name === 'NativeUICore');
assert.equal(core.path, 'packages/native-ui-core/ios/Sources/NativeUICore');
assert.equal(core.dependencies.length, 1, 'Core must not link a host SDK');
assert.equal(core.dependencies[0].product[0], 'WebViewNativeUIEngine');
const plugin = manifest.targets.find(t => t.name === 'NativeUIPlugin');
assert(plugin.dependencies.some(d => d.byName?.[0] === 'NativeUICore'), 'Adapter must use the shared Core module');
JS
