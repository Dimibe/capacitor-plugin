import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const files = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)],
  );
for (const file of ['src', 'ios/Sources', 'android/src/main'].flatMap(files)) {
  const text = readFileSync(file, 'utf8');
  assert(
    !/from\s+['"]@capacitor\/|import\s+Capacitor\b|import\s+com\.getcapacitor\.|import\s+Cordova\b|import\s+org\.apache\.cordova\./.test(
      text,
    ),
    `Host SDK dependency in ${file}`,
  );
}
console.log('Shared source is independent of Capacitor and Cordova SDKs.');
