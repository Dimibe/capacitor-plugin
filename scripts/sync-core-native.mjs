import assert from 'node:assert/strict';
import { cpSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../packages/native-ui-core/', import.meta.url));
const targets = [['android/src/main/java', 'android/src/main/java/shared-core']];
const files = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)]));
for (const [source, target] of targets) {
  const input = join(root, source);
  if (process.argv.includes('--check')) {
    const expected = files(input)
      .map((file) => file.slice(input.length + 1))
      .sort();
    const actual = files(target)
      .map((file) => file.slice(target.length + 1))
      .sort();
    assert.deepEqual(actual, expected, `Generated Core files differ: ${target}`);
    for (const path of expected)
      assert.deepEqual(readFileSync(join(target, path)), readFileSync(join(input, path)), `Regenerate ${target}/${path}`);
  } else {
    rmSync(target, { recursive: true, force: true });
    cpSync(input, target, { recursive: true });
  }
}
console.log('Native Core sources match the local packages/native-ui-core sources.');
