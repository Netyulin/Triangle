import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const tsxBin = path.resolve(backendRoot, 'node_modules', '.bin', isWindows ? 'tsx.cmd' : 'tsx');
const baseUrl = process.env.BASE_URL || '';
const databaseTarget = String(process.env.DATABASE_TARGET || '').trim().toLowerCase();

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

async function runAgainstBaseUrl(url) {
  const env = {
    ...process.env,
    BASE_URL: url,
  };

  await spawnCommand(process.execPath, ['scripts/smoke.test.mjs'], { env });
  await spawnCommand(process.execPath, ['scripts/regression.test.mjs'], { env });
}

async function runWithLocalServer() {
  if (databaseTarget === 'production' || databaseTarget === 'prod' || databaseTarget === 'remote') {
    throw new Error('当前 DATABASE_TARGET 指向远程库。为避免误改联调库，请先显式设置 BASE_URL 指向已启动服务，或切回本地数据库再运行 npm run test。');
  }

  const port = String(process.env.PORT || 58085);
  const url = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: port,
    BASE_URL: url,
  };

  await spawnCommand(tsxBin, ['prisma/seed.ts'], { env });

  const server = spawn(tsxBin, ['src/index.ts'], {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: isWindows && /\.(cmd|bat)$/i.test(tsxBin),
    env,
  });

  try {
    await waitForHealth(url);
    await runAgainstBaseUrl(url);
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.on('exit', resolve));
  }
}

async function main() {
  if (baseUrl) {
    await runAgainstBaseUrl(baseUrl);
    return;
  }

  await runWithLocalServer();
}

main().catch((error) => {
  console.error('test bootstrap failed');
  console.error(error);
  process.exit(1);
});
