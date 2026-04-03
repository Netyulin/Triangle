import crypto from 'node:crypto';
import prisma from './prisma.js';

export async function ensureInviteCodeTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'unused',
      batchId TEXT,
      createdAt TEXT NOT NULL,
      usedAt TEXT,
      usedByUserId INTEGER,
      usedByUsername TEXT
    )
  `);
}

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function listInviteCodes(limit = 100) {
  await ensureInviteCodeTable();
  return prisma.$queryRawUnsafe(
    `
      SELECT code, note, status, batchId, createdAt, usedAt, usedByUserId, usedByUsername
      FROM invite_codes
      ORDER BY datetime(createdAt) DESC
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
    const existed = await prisma.$queryRawUnsafe('SELECT code FROM invite_codes WHERE code = ? LIMIT 1', code);
    if (Array.isArray(existed) && existed.length > 0) continue;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO invite_codes (code, note, status, batchId, createdAt)
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

  const rows = await prisma.$queryRawUnsafe('SELECT code, status FROM invite_codes WHERE code = ? LIMIT 1', code);
  const current = Array.isArray(rows) ? rows[0] : null;

  if (!current || current.status !== 'unused') {
    return false;
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE invite_codes
      SET status = 'used',
          usedAt = ?,
          usedByUserId = ?,
          usedByUsername = ?
      WHERE code = ? AND status = 'unused'
    `,
    new Date().toISOString(),
    user.id,
    user.username,
    code
  );

  return true;
}
