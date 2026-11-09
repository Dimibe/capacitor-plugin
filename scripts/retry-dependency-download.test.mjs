import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

for (const [name, message, failures, expectedCalls, expectedStatus] of [
  ['success', '', 0, 1, 0],
  ['transient download recovers', 'badResponseStatusCode(504)', 1, 2, 0],
  ['transient download is bounded', 'HTTP response code: 504', 9, 3, 7],
  ['read timeout recovers', 'java.net.SocketTimeoutException: Read timed out', 1, 2, 0],
  ['assertion failure is not retried', 'Assertion failed', 9, 1, 7],
  ['invalid package is not retried', 'Could not resolve package dependencies: invalid version', 9, 1, 7],
  ['checksum failure is not retried', 'checksum mismatch', 9, 1, 7],
]) {
  test(name, () => {
    const dir = mkdtempSync(join(tmpdir(), 'dependency-retry-'));
    try {
      const count = join(dir, 'count');
      const fixture = join(dir, 'fixture.cjs');
      writeFileSync(count, '0');
      writeFileSync(join(dir, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      writeFileSync(fixture, `
        const fs = require('node:fs');
        const count = Number(fs.readFileSync(process.env.COUNT, 'utf8')) + 1;
        fs.writeFileSync(process.env.COUNT, String(count));
        if (count <= Number(process.env.FAILURES)) {
          console.error(process.env.MESSAGE);
          process.exit(7);
        }
      `);
      const result = spawnSync('bash', [resolve('scripts/retry-dependency-download.sh'), process.execPath, fixture], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, COUNT: count, FAILURES: String(failures), MESSAGE: message },
      });
      assert.equal(result.status, expectedStatus, result.stderr);
      assert.equal(Number(readFileSync(count, 'utf8')), expectedCalls);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
