import assert from 'node:assert/strict';
import ts from 'typescript';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, mkdirSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Validate the archives consumers install, not the local package links.
const dir = mkdtempSync(join(tmpdir(), 'ionic-theme-packages-'));
const sourceFiles = ['package.json', 'package-lock.json'];
const originals = sourceFiles.map((file) => readFileSync(file, 'utf8'));
try {
  const packed = Object.values(
    JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dir], { encoding: 'utf8' })),
  );
  assert.equal(packed.length, 1);
  sourceFiles.forEach((file, index) => assert.equal(readFileSync(file, 'utf8'), originals[index], `${file} changed while packing`));
  const nativeName = '@rdlabo/capacitor-native-ui';
  const manifests = new Map();
  for (const archive of packed) {
    const manifest = JSON.parse(execFileSync('tar', ['-xOf', join(dir, archive.filename), 'package/package.json'], { encoding: 'utf8' }));
    manifests.set(manifest.name, manifest);
    const extracted = join(dir, archive.filename + '-extracted');
    mkdirSync(extracted);
    execFileSync('tar', ['-xzf', join(dir, archive.filename), '-C', extracted]);
    const packageRoot = join(extracted, 'package');
    const dependencyPath = join(dir, 'node_modules', manifest.name);
    mkdirSync(join(dependencyPath, '..'), { recursive: true });
    symlinkSync(packageRoot, dependencyPath, 'dir');
    symlinkSync(join(dir, 'node_modules'), join(packageRoot, 'node_modules'), 'dir');
    const files = new Set(archive.files.map((file) => file.path));

    // Theme E2E fixtures also bundle the distributed TypeScript source directly.
    // Resolve it from the archive without access to the private workspace package.
    buildSync({
      entryPoints: [join(packageRoot, 'src/index.ts'), join(packageRoot, 'src/native/runtime.ts')],
      bundle: true,
      write: false,
      outdir: join(dir, 'source-bundle'),
      format: 'esm',
      platform: 'browser',
      external: [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})],
    });

    // Locally installed dependencies must not hide undeclared runtime imports.
    const dependencies = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})]);
    for (const file of files) {
      if (!file.startsWith('dist/') || !file.endsWith('.js')) continue;
      const source = ts.createSourceFile(
        file,
        readFileSync(join(packageRoot, file), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      const visit = (node) => {
        const specifier =
          ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
            ? node.moduleSpecifier
            : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
              ? node.arguments[0]
              : undefined;
        if (specifier && ts.isStringLiteral(specifier) && !specifier.text.startsWith('.')) {
          const name = specifier.text
            .split('/')
            .slice(0, specifier.text.startsWith('@') ? 2 : 1)
            .join('/');
          assert(dependencies.has(name), `${manifest.name}: undeclared dependency ${name} in ${file}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    for (const entry of Object.values(manifest.exports)) {
      for (const target of typeof entry === 'string' ? [entry] : Object.values(entry)) {
        if (!target.includes('*')) assert(files.has(target.replace(/^\.\//, '')), `${manifest.name}: missing ${target}`);
      }
    }
    assert(files.has('README.md'));
    assert(files.has('LICENSE'));
    if (manifest.name === nativeName) {
      assert.equal(manifest.capacitor.ios.src, 'ios');
      assert.equal(manifest.capacitor.android.src, 'android');
      assert(files.has('Package.swift'));
      assert(
        readFileSync(join(packageRoot, 'Package.swift'), 'utf8').includes('name: "RdlaboCapacitorNativeUi"'),
        'Capacitor-generated SPM product must exist',
      );
      assert(files.has('packages/native-ui-core/ios/Sources/NativeUICore/NativeUIController.swift'));
      assert(files.has('android/src/main/java/shared-core/dev/rdlabo/nativeui/core/NativeUIController.kt'));
      assert(files.has('android/build.gradle'));
      assert(files.has('android/proguard-rules.pro'));
      assert(files.has('RdlaboCapacitorNativeUi.podspec'));
      assert(files.has('ios/Sources/NativeUIPlugin/NativeUIPlugin.swift'));
      assert(files.has('android/src/main/java/dev/rdlabo/capacitor/nativeui/NativeUIPlugin.kt'));
      // The published JavaScript and native binaries must register the same bridge.
      for (const [file, registration] of [
        ['src/host.ts', "registerPlugin<NativeUIPlugin>('NativeUI')"],
        ['ios/Sources/NativeUIPlugin/NativeUIPlugin.swift', 'jsName = "NativeUI"'],
        ['android/src/main/java/dev/rdlabo/capacitor/nativeui/NativeUIPlugin.kt', '@CapacitorPlugin(name = "NativeUI")'],
      ])
        assert(readFileSync(join(packageRoot, file), 'utf8').includes(registration), `Bridge registration mismatch: ${file}`);

      assert(!manifest.dependencies?.['@rdlabo/ionic-theme-ios27'], 'Native UI must not depend on the theme');
      assert(!files.has('dist/esm/native-integration/transition.js'), 'Ionic transition adapter belongs to the theme');
    }
  }
  // Verify the core entry with neither Ionic nor the Ionic utilities installed.
  assert.equal(manifests.get(nativeName).peerDependenciesMeta['@ionic/core'].optional, true);
  assert(manifests.get(nativeName).dependencies['@rdlabo/ionic-theme-utils'], 'Native UI must install its own Ionic utilities');
  assert.equal(manifests.get(nativeName).peerDependencies['@rdlabo/ionic-theme-utils'], undefined);
  assert(!manifests.get(nativeName).dependencies['@webview-native-ui/core'], 'Core must ship inside the plugin');
  cpSync(resolve('node_modules/@webview-native-ui/engine'), join(dir, 'node_modules/@webview-native-ui/engine'), { recursive: true });
  // Layout resolution alone must not load Capacitor, Ionic or theme utilities.
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';
    assert.equal(typeof resolveVerticalBarsLayout, 'function');
    const layout = await resolveVerticalBarsLayout({
      getBarPlacement: async () => ({verticalBarEdge:'trailing',inset:84}),
      getReservedRegions: async () => ({regions:[{kind:'occlusion',isActive:true,x:382,y:0,width:84,height:174}]}),
    }, {viewport:{width:466,height:678},rtl:false});
    assert.equal(layout.toolbarTop, 174);
    assert.deepEqual(Object.keys(layout).sort(), ['edge','inset','toolbarTop']);
    for (const name of ['@capacitor/core','@ionic/core','@rdlabo/ionic-theme-utils'])
      await assert.rejects(import(name), {code:'ERR_MODULE_NOT_FOUND'});
  `], {cwd:dir,stdio:'inherit'});
  symlinkSync(resolve('node_modules/@capacitor'), join(dir, 'node_modules/@capacitor'), 'dir');
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { enableNativeUI } from '@rdlabo/capacitor-native-ui/core';
    import { enableSupportIonicOverlays } from '@webview-native-ui/engine/ionic';
    assert.equal(typeof enableNativeUI, 'function');
    assert.equal(typeof enableSupportIonicOverlays, 'function');
    assert.equal(enableSupportIonicOverlays(), undefined); // Safe without a Document (SSR).
    await assert.rejects(import('@ionic/core'), { code: 'ERR_MODULE_NOT_FOUND' });
    await assert.rejects(import('@rdlabo/ionic-theme-utils'), { code: 'ERR_MODULE_NOT_FOUND' });
  `,
    ],
    { cwd: dir, stdio: 'inherit' },
  );
  // Source fixtures and public entrypoints can coexist in one consumer bundle.
  const mixedConsumer = join(dir, 'mixed-consumer.mjs');
  buildSync({
    stdin: {
      contents: `
        import { enableNativeUI as source } from './node_modules/@rdlabo/capacitor-native-ui/src/core.ts';
        import { enableNativeUI as published } from '@rdlabo/capacitor-native-ui/core';
        if (source !== published) throw new Error('Source and public entries must share Core state');
      `,
      resolveDir: dir,
      loader: 'ts',
    },
    bundle: true,
    outfile: mixedConsumer,
    format: 'esm',
    platform: 'node',
    external: ['@capacitor/core'],
  });
  execFileSync(process.execPath, [mixedConsumer], { cwd: dir, stdio: 'inherit' });
  const consumer = join(dir, 'consumer.ts');
  writeFileSync(
    consumer,
    `
    import { enableNativeUI } from '@rdlabo/capacitor-native-ui/core';
    import { resolveVerticalBarsLayout } from '@rdlabo/capacitor-native-ui/integration';
    async function layoutContract() {
      const layout: {edge?: 'leading' | 'trailing' | null; inset?: number; toolbarTop?: number} =
        await resolveVerticalBarsLayout({getBarPlacement:async()=>({verticalBarEdge:'trailing',inset:84})});
      return layout;
    }
    import { createWebProjection, createWebProjectionScope, type WebProjectionTransport } from '@webview-native-ui/engine';
    import { enableSupportIonicOverlays } from '@webview-native-ui/engine/ionic';
    enableSupportIonicOverlays();
    enableSupportIonicOverlays({ exclude: '[data-nonblocking-overlay]', covers: (overlay, target) => undefined });
    async function projectionContract(transport: WebProjectionTransport) {
      // @ts-expect-error A scope must explicitly declare its source DOM boundary.
      createWebProjectionScope('consumer');
      const scope = createWebProjectionScope(document.createElement('div'), 'consumer');
      // @ts-expect-error A document is not a fallback element.
      createWebProjectionScope(document, 'consumer');
      const host = document.createElement('div');
      const projection = await createWebProjection(scope, transport, {
        wake() {}, blocked: () => false,
      });
      projection.begin();
      // @ts-expect-error Projection DOM is configured at initialization, not on begin.
      projection.begin(host);
      // @ts-expect-error A cover requires a prepared token.
      transport.send({ action: 'cover' });
      // @ts-expect-error Preparation requires the accepted revision and viewport.
      transport.send({ action: 'prepare', ids: ['button'] });
      // @ts-expect-error Restore requires destination frames and viewport width.
      transport.send({ action: 'restore', token: 'image' });
      const image = await transport.send({ action: 'prepare', revision: 1, viewportWidth: 390, ids: ['button'] });
      if (image.token) image.parts.map(part => part.url);
      const covered = await transport.send({ action: 'cover', token: 'image' });
      const shown: boolean = covered.shown;
      // @ts-expect-error A cover response is not a prepared capture.
      covered.parts;
      // @ts-expect-error A successful prepare must include its parts.
      const incomplete: Awaited<ReturnType<typeof transport.send<{ action: 'prepare'; revision: number; viewportWidth: number; ids: string[] }>>> = { token: 'image' };
    }
    async function start(root: HTMLElement) {
      const shell = await enableNativeUI({ root, controls: { tabs: false }, verticalBars: { enabled: true } });
      await shell.disableVerticalControlArea();
      await shell.enableVerticalControlArea();
      await shell.destroy();
    }
    enableNativeUI({ controls: 'verticalOnly', ionic: { auto: false } });
    enableNativeUI({ controls: { buttonGroup: 'horizontalOnly', button: false, backButton: true, tabs: 'verticalOnly' } });
    // @ts-expect-error Grouping uses buttonGroup; there is no buttons alias.
    enableNativeUI({ controls: { buttons: true } });
    // @ts-expect-error Ionic auto is a discovery switch, not another selection object.
    enableNativeUI({ ionic: { auto: { tabs: true } } });
    // @ts-expect-error Rail scope uses controls defaults, not an only gate.
    enableNativeUI({ verticalBars: { only: true } });
    // @ts-expect-error Appearance is Ionic-specific.
    enableNativeUI({ verticalBars: { buttonProjection: 'source' } });
    // @ts-expect-error Placement names are typed.
    enableNativeUI({ controls: 'vertical' });
    // @ts-expect-error Availability is automatic; enabled is boolean only.
    enableNativeUI({ verticalBars: { enabled: 'auto' } });
  `,
  );
  execFileSync(
    process.execPath,
    [
      resolve('node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
      '--lib',
      'es2022,dom',
      consumer,
    ],
    { cwd: dir, stdio: 'inherit' },
  );
  // Only external dependencies come from this checkout; all packages resolve from archives.
  for (const name of ['@ionic', '@stencil', '@rdlabo/ionic-theme-utils', 'ionicons', 'typescript']) {
    symlinkSync(resolve('node_modules', name), join(dir, 'node_modules', name), 'dir');
  }
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import * as native from '@rdlabo/capacitor-native-ui';
    import * as vertical from '@rdlabo/capacitor-native-ui/vertical-bars';
    assert.equal(typeof native.enableNativeUI, 'function');
    assert.equal(typeof vertical.enableVerticalControlArea, 'function');
    assert.equal(vertical.withNativeUITransition, undefined);
    const integration = await import('@rdlabo/capacitor-native-ui/integration');
    assert.equal(integration.connectNativeUITransition, undefined);
    assert.equal(typeof integration.suspendNativeUI, 'function');
  `,
    ],
    { cwd: dir, stdio: 'inherit' },
  );
  execFileSync(
    process.execPath,
    [
      '-e',
      `
    const assert = require('node:assert/strict');
    const native = require('@rdlabo/capacitor-native-ui');
    assert.equal(typeof native.enableNativeUI, 'function');
  `,
    ],
    { cwd: dir, stdio: 'inherit' },
  );
  if (process.argv.includes('--esm')) {
    for (const archive of packed) {
      execFileSync(
        process.execPath,
        [resolve('node_modules/@rdlabo/ionic-theme-utils/scripts/check-esm.mjs'), join(dir, archive.filename + '-extracted/package')],
        { stdio: 'inherit' },
      );
    }
  }
  console.log('Plugin archive, public exports, native bridge and standalone core verified.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
