import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;
const databaseProvider = String(process.env.DATABASE_PROVIDER || 'postgresql').trim().toLowerCase();

function resolveDatabaseTarget() {
  return String(process.env.DATABASE_TARGET || process.env.APP_ENV || process.env.NODE_ENV || 'local')
    .trim()
    .toLowerCase();
}

function resolvePostgresUrl() {
  const directUrl = String(process.env.DATABASE_URL || '').trim();
  if (directUrl) {
    return directUrl;
  }

  const target = resolveDatabaseTarget();
  const envSpecificMap = {
    local: process.env.DATABASE_URL_LOCAL,
    dev: process.env.DATABASE_URL_LOCAL,
    development: process.env.DATABASE_URL_LOCAL,
    test: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_LOCAL,
    staging: process.env.DATABASE_URL_STAGING || process.env.DATABASE_URL_PRODUCTION,
    remote: process.env.DATABASE_URL_PRODUCTION,
    prod: process.env.DATABASE_URL_PRODUCTION,
    production: process.env.DATABASE_URL_PRODUCTION,
  };

  const selectedUrl = String(envSpecificMap[target] || process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL_PRODUCTION || '')
    .trim();

  if (!selectedUrl) {
    throw new Error(
      `PostgreSQL 模式下缺少数据库连接串。请配置 DATABASE_URL，或配置 DATABASE_TARGET=${target} 对应的 DATABASE_URL_LOCAL / DATABASE_URL_PRODUCTION / DATABASE_URL_STAGING / DATABASE_URL_TEST。`,
    );
  }

  return selectedUrl;
}

async function createPrismaClient() {
  const log = process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'];

  if (databaseProvider !== 'postgresql') {
    throw new Error(`当前项目已统一改为 PostgreSQL，暂不再支持 DATABASE_PROVIDER=${databaseProvider || 'unknown'}。请改为 postgresql。`);
  }

  const { PrismaClient: PostgresPrismaClient } = await import('../generated/postgresql-client/index.js');
  const pool = new pg.Pool({
    connectionString: resolvePostgresUrl(),
  });

  return new PostgresPrismaClient({
    adapter: new PrismaPg(pool),
    log,
  });
}

const prisma = globalForPrisma.prisma ?? (await createPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
