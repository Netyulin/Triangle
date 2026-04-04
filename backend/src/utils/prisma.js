import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const globalForPrisma = globalThis;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

function resolveSqliteUrl(databaseUrl) {
  const rawUrl = (databaseUrl || 'file:./prisma/dev.db').trim();

  if (!rawUrl.startsWith('file:')) {
    return rawUrl;
  }

  const sqlitePath = rawUrl.slice('file:'.length);
  const absolutePath = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(backendRoot, sqlitePath);

  return `file:${absolutePath.replace(/\\/g, '/')}`;
}

const databaseUrl = resolveSqliteUrl(process.env.DATABASE_URL);
const adapter = new PrismaBetterSqlite3({
  url: databaseUrl
});

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
