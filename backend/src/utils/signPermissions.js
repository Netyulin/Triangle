import prisma from './prisma.js';
import { ensureSignTables } from './signTables.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { normalizeMembershipLevel, getMembershipLevelRank } from './membership.js';
import { isPostgresDatabase } from './signTables.js';

const DEFAULT_RULES = {
  free: {
    canSign: false,
    canSelfSign: false,
  },
  sponsor: {
    canSign: true,
    canSelfSign: false,
  },
  lifetime: {
    canSign: true,
    canSelfSign: true,
  },
  supreme: {
    canSign: true,
    canSelfSign: true,
  },
};

const USER_ID_COLUMN = isPostgresDatabase() ? '"userId"' : 'userId';
const CAN_SIGN_COLUMN = isPostgresDatabase() ? '"canSign"' : 'canSign';
const CAN_SELF_SIGN_COLUMN = isPostgresDatabase() ? '"canSelfSign"' : 'canSelfSign';
const UPDATED_AT_COLUMN = isPostgresDatabase() ? '"updatedAt"' : 'updatedAt';
const CREATED_AT_COLUMN = isPostgresDatabase() ? '"createdAt"' : 'createdAt';

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
}

export function getMembershipSignPolicy(level) {
  const normalized = normalizeMembershipLevel(level);
  return DEFAULT_RULES[normalized] || DEFAULT_RULES.free;
}

export async function getUserSignPermissionOverrides(userId) {
  await ensureSignTables();
  const rows = await queryRaw(`SELECT * FROM sign_user_permissions WHERE ${USER_ID_COLUMN} = ? LIMIT 1`, userId);
  return rows[0] ?? null;
}

export async function getUserSignPermissions(user) {
  const normalizedLevel = normalizeMembershipLevel(user?.membershipLevel);
  const base = getMembershipSignPolicy(normalizedLevel);
  const overrides = user?.id ? await getUserSignPermissionOverrides(user.id) : null;

  const canSign = user?.role === 'admin' ? true : overrides ? toBoolean(overrides.canSign, base.canSign) : base.canSign;
  const canSelfSign = user?.role === 'admin' ? true : overrides ? toBoolean(overrides.canSelfSign, base.canSelfSign) : base.canSelfSign;

  return {
    membershipLevel: normalizedLevel,
    membershipRank: getMembershipLevelRank(normalizedLevel),
    canSign,
    canSelfSign,
    overrides: overrides
      ? {
          canSign: toBoolean(overrides.canSign, base.canSign),
          canSelfSign: toBoolean(overrides.canSelfSign, base.canSelfSign),
        }
      : null,
  };
}

export async function updateUserSignPermissions(userId, { canSign, canSelfSign }) {
  await ensureSignTables();

  const rows = await queryRaw(`SELECT ${USER_ID_COLUMN} FROM sign_user_permissions WHERE ${USER_ID_COLUMN} = ? LIMIT 1`, userId);
  if (rows[0]) {
    await executeRaw(
      `
        UPDATE sign_user_permissions
        SET ${CAN_SIGN_COLUMN} = ?, ${CAN_SELF_SIGN_COLUMN} = ?, ${UPDATED_AT_COLUMN} = CURRENT_TIMESTAMP
        WHERE ${USER_ID_COLUMN} = ?
      `,
      canSign ? 1 : 0,
      canSelfSign ? 1 : 0,
      userId,
    );
  } else {
    await executeRaw(
      `
        INSERT INTO sign_user_permissions (${USER_ID_COLUMN}, ${CAN_SIGN_COLUMN}, ${CAN_SELF_SIGN_COLUMN}, ${CREATED_AT_COLUMN}, ${UPDATED_AT_COLUMN})
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      userId,
      canSign ? 1 : 0,
      canSelfSign ? 1 : 0,
    );
  }

  return getUserSignPermissionOverrides(userId);
}
