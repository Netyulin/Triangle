import crypto from 'node:crypto';
import prisma from './prisma.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { isPostgresDatabase } from './signTables.js';

const CODE_COLUMN = 'code';
const NOTE_COLUMN = 'note';
const STATUS_COLUMN = 'status';
const BATCH_ID_COLUMN = isPostgresDatabase() ? '"batchId"' : 'batchId';
const CREATED_AT_COLUMN = isPostgresDatabase() ? '"createdAt"' : 'createdAt';
const USED_AT_COLUMN = isPostgresDatabase() ? '"usedAt"' : 'usedAt';
const USED_BY_USER_ID_COLUMN = isPostgresDatabase() ? '"usedByUserId"' : 'usedByUserId';
const USED_BY_USERNAME_COLUMN = isPostgresDatabase() ? '"usedByUsername"' : 'usedByUsername';
const CREATED_AT_ORDER = isPostgresDatabase() ? `${CREATED_AT_COLUMN} DESC` : 'datetime(createdAt) DESC';

export async function ensureInviteCodeTable() {
  await executeRaw(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'unused',
      ${BATCH_ID_COLUMN} TEXT,
      ${CREATED_AT_COLUMN} TEXT NOT NULL,
      ${USED_AT_COLUMN} TEXT,
      ${USED_BY_USER_ID_COLUMN} INTEGER,
      ${USED_BY_USERNAME_COLUMN} TEXT
    )
  `);

  if (isPostgresDatabase()) {
    const columns = await queryRaw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invite_codes'
    `);

    const renameLegacyColumn = async (legacyName, nextName) => {
      const hasNext = Array.isArray(columns) && columns.some((item) => item.column_name === nextName);
      const hasLegacy = Array.isArray(columns) && columns.some((item) => item.column_name === legacyName);
      if (!hasNext && hasLegacy) {
        await executeRaw(`ALTER TABLE invite_codes RENAME COLUMN ${legacyName} TO "${nextName}"`);
      }
    };

    await renameLegacyColumn('batchid', 'batchId');
    await renameLegacyColumn('createdat', 'createdAt');
    await renameLegacyColumn('usedat', 'usedAt');
    await renameLegacyColumn('usedbyuserid', 'usedByUserId');
    await renameLegacyColumn('usedbyusername', 'usedByUsername');
  }
}

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function listInviteCodes(limit = 100) {
  await ensureInviteCodeTable();
  return queryRaw(
    `
      SELECT
        ${CODE_COLUMN} AS "code",
        ${NOTE_COLUMN} AS "note",
        ${STATUS_COLUMN} AS "status",
        ${BATCH_ID_COLUMN} AS "batchId",
        ${CREATED_AT_COLUMN} AS "createdAt",
        ${USED_AT_COLUMN} AS "usedAt",
        ${USED_BY_USER_ID_COLUMN} AS "usedByUserId",
        ${USED_BY_USERNAME_COLUMN} AS "usedByUsername"
      FROM invite_codes
      ORDER BY ${CREATED_AT_ORDER}
      LIMIT ?
    `,
    limit
  );
}

export async function createInviteCodeBatch({ count, note = '' }) {
  await ensureInviteCodeTable();

  const batchId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const codes = [];

  while (codes.length < count) {
    const code = generateCode();
    const existed = await queryRaw('SELECT code FROM invite_codes WHERE code = ? LIMIT 1', code);
    if (Array.isArray(existed) && existed.length > 0) continue;

    await executeRaw(
      `
        INSERT INTO invite_codes (${CODE_COLUMN}, ${NOTE_COLUMN}, ${STATUS_COLUMN}, ${BATCH_ID_COLUMN}, ${CREATED_AT_COLUMN})
        VALUES (?, ?, 'unused', ?, ?)
      `,
      code,
      note,
      batchId,
      createdAt
    );
    codes.push(code);
  }

  return {
    batchId,
    codes
  };
}

export async function consumeInviteCode(code, user) {
  await ensureInviteCodeTable();

  const rows = await queryRaw('SELECT code, status FROM invite_codes WHERE code = ? LIMIT 1', code);
  const current = Array.isArray(rows) ? rows[0] : null;

  if (!current || current.status !== 'unused') {
    return false;
  }

  await executeRaw(
    `
      UPDATE invite_codes
      SET ${STATUS_COLUMN} = 'used',
          ${USED_AT_COLUMN} = ?,
          ${USED_BY_USER_ID_COLUMN} = ?,
          ${USED_BY_USERNAME_COLUMN} = ?
      WHERE ${CODE_COLUMN} = ? AND ${STATUS_COLUMN} = 'unused'
    `,
    new Date().toISOString(),
    user.id,
    user.username,
    code
  );

  return true;
}
