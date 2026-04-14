import 'dotenv/config';
import { defineConfig } from 'prisma/config';

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
      `Prisma 未找到 PostgreSQL 连接串。请配置 DATABASE_URL，或配置 DATABASE_TARGET=${target} 对应的 DATABASE_URL_LOCAL / DATABASE_URL_PRODUCTION / DATABASE_URL_STAGING / DATABASE_URL_TEST。`,
    );
  }

  return selectedUrl;
}

export default defineConfig({
  schema: 'prisma/schema.postgresql.prisma',
  datasource: {
    url: resolvePostgresUrl(),
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
