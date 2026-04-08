import prisma from './prisma.js';
import { saveBufferToUploads } from './assetStorage.js';

function mapNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const DEFAULT_AVATAR_COUNT = 10;

export function normalizeGender(gender, fallback = 'other') {
  const value = String(gender || '').trim().toLowerCase();
  if (value === 'male' || value === 'female' || value === 'other') {
    return value;
  }
  return fallback;
}

function stableHash(input) {
  let hash = 2166136261;
  const value = String(input || '');
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildDefaultAvatar(seed, gender = 'other') {
  const normalizedSeed = String(seed || 'triangle-user').trim() || 'triangle-user';
  const normalizedGender = normalizeGender(gender);
  const hash = stableHash(`${normalizedSeed}:${normalizedGender}:avatar-gen-default`);
  const avatarNumber = (hash % DEFAULT_AVATAR_COUNT) + 1;
  return `/avatars/avatar-gen-defaults/${normalizedGender}/avatar-${String(avatarNumber).padStart(2, '0')}.svg`;
}

export function isGeneratedAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') {
    return false;
  }

  if (avatar.startsWith('/uploads/avatars/')) {
    return true;
  }

  if (avatar.startsWith('/avatars/avatar-gen-defaults/')) {
    return true;
  }

  try {
    const parsed = new URL(avatar);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'avataaars.io' && hostname !== 'www.avataaars.io') {
      return false;
    }

    return parsed.searchParams.get('triangleDefault') === '1';
  } catch {
    return false;
  }
}

function mimeToExtension(mimeType) {
  const value = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (value.includes('svg')) return '.svg';
  if (value.includes('png')) return '.png';
  if (value.includes('jpeg') || value.includes('jpg')) return '.jpg';
  if (value.includes('webp')) return '.webp';
  if (value.includes('gif')) return '.gif';
  return '.svg';
}

export async function localizeGeneratedAvatar(avatar, options = {}) {
  const nextAvatar = String(avatar || '').trim();

  if (!nextAvatar) {
    return nextAvatar;
  }

  if (nextAvatar.startsWith('/uploads/')) {
    return nextAvatar;
  }

  if (nextAvatar.startsWith('/avatars/avatar-gen-defaults/') || nextAvatar.startsWith('/avatars/defaults/')) {
    return nextAvatar;
  }

  if (nextAvatar.startsWith('data:image/')) {
    const match = nextAvatar.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return nextAvatar;
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) {
      return nextAvatar;
    }

    const stored = await saveBufferToUploads(buffer, {
      folder: options.folder || 'avatars/generated',
      extension: mimeToExtension(match[1])
    });
    return stored.relativePath;
  }

  if (!isGeneratedAvatar(nextAvatar) && !nextAvatar.startsWith('http://') && !nextAvatar.startsWith('https://')) {
    return nextAvatar;
  }

  try {
    const response = await fetch(nextAvatar, {
      headers: {
        'User-Agent': 'TrianglePortalAvatarImporter/1.0'
      }
    });

    if (!response.ok) {
      return nextAvatar;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return nextAvatar;
    }

    const stored = await saveBufferToUploads(buffer, {
      folder: options.folder || 'avatars/generated',
      extension: mimeToExtension(response.headers.get('content-type'))
    });
    return stored.relativePath;
  } catch {
    return nextAvatar;
  }
}

export async function ensureUserFeatureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS request_votes (
      userId INTEGER NOT NULL,
      requestId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, requestId)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS comment_reactions (
      userId INTEGER NOT NULL,
      commentId TEXT NOT NULL,
      reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, commentId)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS favorites (
      userId INTEGER NOT NULL,
      contentType TEXT NOT NULL CHECK (contentType IN ('app', 'post')),
      contentId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, contentType, contentId)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS recharge_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function getRequestVoteSummary(requestIds, userId) {
  await ensureUserFeatureTables();

  const validIds = requestIds.map((id) => mapNumber(id)).filter((id) => id > 0);
  const summary = new Map(validIds.map((id) => [id, { voteCount: 0, userVoted: false }]));

  if (validIds.length === 0) {
    return summary;
  }

  const inClause = validIds.join(',');
  const counts = await prisma.$queryRawUnsafe(
    `SELECT requestId, COUNT(*) AS voteCount FROM request_votes WHERE requestId IN (${inClause}) GROUP BY requestId`
  );

  for (const row of counts) {
    const requestId = mapNumber(row.requestId);
    summary.set(requestId, {
      voteCount: mapNumber(row.voteCount),
      userVoted: summary.get(requestId)?.userVoted ?? false
    });
  }

  if (userId) {
    const votes = await prisma.$queryRawUnsafe(
      `SELECT requestId FROM request_votes WHERE userId = ? AND requestId IN (${inClause})`,
      userId
    );

    for (const row of votes) {
      const requestId = mapNumber(row.requestId);
      summary.set(requestId, {
        voteCount: summary.get(requestId)?.voteCount ?? 0,
        userVoted: true
      });
    }
  }

  return summary;
}

export async function getCommentReactionSummary(commentIds, userId) {
  await ensureUserFeatureTables();

  const validIds = commentIds.filter(Boolean);
  const summary = new Map(validIds.map((id) => [id, { userLiked: false, userDisliked: false }]));

  if (!userId || validIds.length === 0) {
    return summary;
  }

  const inClause = validIds.map(escapeSqlString).join(',');
  const reactions = await prisma.$queryRawUnsafe(
    `SELECT commentId, reaction FROM comment_reactions WHERE userId = ? AND commentId IN (${inClause})`,
    userId
  );

  for (const row of reactions) {
    summary.set(String(row.commentId), {
      userLiked: row.reaction === 'like',
      userDisliked: row.reaction === 'dislike'
    });
  }

  return summary;
}

export async function listFavoriteRows(userId) {
  await ensureUserFeatureTables();
  return prisma.$queryRawUnsafe(
    'SELECT contentType, contentId, createdAt FROM favorites WHERE userId = ? ORDER BY datetime(createdAt) DESC',
    userId
  );
}

export async function isFavorite(userId, contentType, contentId) {
  await ensureUserFeatureTables();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT contentId FROM favorites WHERE userId = ? AND contentType = ? AND contentId = ? LIMIT 1',
    userId,
    contentType,
    contentId
  );
  return rows.length > 0;
}

export async function listRechargeRecords(userId) {
  await ensureUserFeatureTables();
  return prisma.$queryRawUnsafe(
    'SELECT id, amount, status, description, createdAt FROM recharge_records WHERE userId = ? ORDER BY datetime(createdAt) DESC',
    userId
  );
}
