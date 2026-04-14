import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL_PRODUCTION;
if (!dbUrl) {
  console.error('DATABASE_URL_PRODUCTION not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

const tables = [
  // Download/CPS tracking tables
  `CREATE TABLE IF NOT EXISTS download_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "softwareSlug" TEXT NOT NULL,
    ip TEXT,
    "userAgent" TEXT,
    "adClicked" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS cps_downloads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "softwareSlug" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "clickedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Comment reactions
  `CREATE TABLE IF NOT EXISTS comment_reactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" INTEGER NOT NULL,
    "commentId" TEXT NOT NULL,
    reaction TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Request votes
  `CREATE TABLE IF NOT EXISTS request_votes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" INTEGER NOT NULL,
    "requestId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function main() {
  for (const sql of tables) {
    const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
    try {
      await pool.query(sql);
      console.log(`✓ Created/verified table: ${name}`);
    } catch (err) {
      console.error(`✗ Failed to create ${name}: ${err.message}`);
    }
  }
  await pool.end();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
