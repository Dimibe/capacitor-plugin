import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// Both source consumers and public entries must use the same bundled Core modules.
const output = 'dist/esm';
function rewrite(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      rewrite(file);
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      const source = readFileSync(file, 'utf8');
      const rewritten = source.replace(/(['"])(?:\.\.\/)+packages\/native-ui-core\/dist\/([^'"]+)\1/g, (_, quote, subpath) => {
        const path = relative(dirname(file), join('packages/native-ui-core/dist', subpath)).split('\\').join('/');
        return `${quote}${path}${quote}`;
      });
      if (rewritten !== source) writeFileSync(file, rewritten);
    }
  }
}
rewrite(output);
