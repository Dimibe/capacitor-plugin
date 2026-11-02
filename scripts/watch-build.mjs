import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
