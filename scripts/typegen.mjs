// Generates expo-env.d.ts and .expo/types/router.d.ts. Expo writes them only while the dev
// server runs, and both are git-ignored, so CI runs this before the type check.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const outputs = ['expo-env.d.ts', '.expo/types/router.d.ts'];
const timeoutMs = 120_000;

for (const file of outputs) rmSync(file, { force: true });

const server = spawn('npx expo start --port 8098', {
  env: { ...process.env, CI: '1' },
  shell: true,
  stdio: 'ignore',
  detached: process.platform !== 'win32',
});

function stop() {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    process.kill(-server.pid, 'SIGTERM');
  }
}

const started = Date.now();
const timer = setInterval(() => {
  if (outputs.every((file) => existsSync(file))) {
    clearInterval(timer);
    stop();
    process.stdout.write(`Generated ${outputs.join(' and ')}\n`);
    process.exit(0);
  }
  if (Date.now() - started > timeoutMs) {
    clearInterval(timer);
    stop();
    process.stderr.write(
      `Timed out after ${timeoutMs / 1000}s waiting for ${outputs.join(', ')}\n`,
    );
    process.exit(1);
  }
}, 500);
