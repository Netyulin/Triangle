import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const tsxBin = path.resolve(backendRoot, 'node_modules', '.bin', isWindows ? 'tsx.cmd' : 'tsx');
const prismaBin = path.resolve(backendRoot, 'node_modules', '.bin', isWindows ? 'prisma.cmd' : 'prisma');
const devDbPath = path.resolve(backendRoot, 'prisma', 'dev.db');
const runId = `${Date.now()}-${process.pid}`;
const testDbPath = path.resolve(backendRoot, 'prisma', `test-${runId}.db`);
const port = String(3100 + (process.pid % 500));
const baseUrl = `http://127.0.0.1:${port}`;

function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const useShell = isWindows && /\.(cmd|bat)$/i.test(command);
    const child = spawn(command, args, {
      cwd: backendRoot,
      stdio: 'inherit',
      shell: useShell,
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForHealth(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('backend health check timed out');
}

async function main() {
  await fs.copyFile(devDbPath, testDbPath);

  const env = {
    ...process.env,
    DATABASE_URL: `file:${testDbPath.replace(/\\/g, '/')}`,
    PORT: port,
    BASE_URL: baseUrl,
    NODE_ENV: 'test',
  };

  await spawnCommand(prismaBin, ['generate'], { env });
  await spawnCommand(tsxBin, ['src/prisma/seed.ts'], { env });

  const server = spawn(tsxBin, ['src/index.ts'], {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: isWindows && /\.(cmd|bat)$/i.test(tsxBin),
    env,
  });

  try {
    await waitForHealth(baseUrl);
    await spawnCommand(process.execPath, ['scripts/smoke.test.mjs'], { env });
    await spawnCommand(process.execPath, ['scripts/regression.test.mjs'], { env });
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.on('exit', resolve));
    await fs.rm(testDbPath, { force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error('test bootstrap failed');
  console.error(error);
  process.exit(1);
});
