import prisma from './prisma.js';
import { saveBufferToUploads } from './assetStorage.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { isPostgresDatabase, listTableColumns } from './signTables.js';

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
const USER_ID_COLUMN = isPostgresDatabase() ? '"userId"' : 'userId';
const REQUEST_ID_COLUMN = isPostgresDatabase() ? '"requestId"' : 'requestId';
const COMMENT_ID_COLUMN = isPostgresDatabase() ? '"commentId"' : 'commentId';
const APP_SLUG_COLUMN = isPostgresDatabase() ? '"appSlug"' : 'appSlug';
const CONTENT_TYPE_COLUMN = isPostgresDatabase() ? '"contentType"' : 'contentType';
const CONTENT_ID_COLUMN = isPostgresDatabase() ? '"contentId"' : 'contentId';
const CREATED_AT_COLUMN = isPostgresDatabase() ? '"createdAt"' : 'createdAt';
const UPDATED_AT_COLUMN = isPostgresDatabase() ? '"updatedAt"' : 'updatedAt';
const ORDER_BY_CREATED_AT = isPostgresDatabase() ? `${CREATED_AT_COLUMN} DESC` : 'datetime(createdAt) DESC';

async function renameLegacyColumn(table, legacyColumn, nextColumn) {
  if (!isPostgresDatabase()) {
    return;
  }

  const columns = await listTableColumns(table);
  const names = new Set(columns.map((row) => String(row.column_name || '').trim()));
  const legacy = String(legacyColumn || '').trim();
  const next = String(nextColumn || '').trim();

  if (!names.has(legacy) || names.has(next)) {
    return;
  }

  await executeRaw(`ALTER TABLE ${table} RENAME COLUMN "${legacyColumn}" TO "${nextColumn}"`);
}

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
  if (isPostgresDatabase()) {
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS request_votes (
        "userId" INTEGER NOT NULL,
        "requestId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "requestId")
      )
    `);

    await executeRaw(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        "userId" INTEGER NOT NULL,
        "commentId" TEXT NOT NULL,
        reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "commentId")
      )
    `);

    await executeRaw(`
      CREATE TABLE IF NOT EXISTS favorites (
        "userId" INTEGER NOT NULL,
        "contentType" TEXT NOT NULL CHECK ("contentType" IN ('app', 'post')),
        "contentId" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "contentType", "contentId")
      )
    `);

    await executeRaw(`
      CREATE TABLE IF NOT EXISTS recharge_records (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        description TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await executeRaw(`
      CREATE TABLE IF NOT EXISTS app_ratings (
        "userId" INTEGER NOT NULL,
        "appSlug" TEXT NOT NULL,
        rating DOUBLE PRECISION NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "appSlug")
      )
    `);

    await renameLegacyColumn('request_votes', 'userid', 'userId');
    await renameLegacyColumn('request_votes', 'requestid', 'requestId');
    await renameLegacyColumn('request_votes', 'createdat', 'createdAt');

    await renameLegacyColumn('comment_reactions', 'userid', 'userId');
    await renameLegacyColumn('comment_reactions', 'commentid', 'commentId');
    await renameLegacyColumn('comment_reactions', 'createdat', 'createdAt');

    await renameLegacyColumn('favorites', 'userid', 'userId');
    await renameLegacyColumn('favorites', 'contenttype', 'contentType');
    await renameLegacyColumn('favorites', 'contentid', 'contentId');
    await renameLegacyColumn('favorites', 'createdat', 'createdAt');

    await renameLegacyColumn('app_ratings', 'userid', 'userId');
    await renameLegacyColumn('app_ratings', 'appslug', 'appSlug');
    await renameLegacyColumn('app_ratings', 'createdat', 'createdAt');
    await renameLegacyColumn('app_ratings', 'updatedat', 'updatedAt');

    await renameLegacyColumn('recharge_records', 'userid', 'userId');
    await renameLegacyColumn('recharge_records', 'createdat', 'createdAt');
    return;
  }

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

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_ratings (
      userId INTEGER NOT NULL,
      appSlug TEXT NOT NULL,
      rating REAL NOT NULL CHECK (rating >= 1 AND rating <= 5),
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, appSlug)
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
  const counts = await queryRaw(
    `SELECT ${REQUEST_ID_COLUMN} AS "requestId", COUNT(*) AS "voteCount" FROM request_votes WHERE ${REQUEST_ID_COLUMN} IN (${inClause}) GROUP BY ${REQUEST_ID_COLUMN}`
  );

  for (const row of counts) {
    const requestId = mapNumber(row.requestId);
    summary.set(requestId, {
      voteCount: mapNumber(row.voteCount),
      userVoted: summary.get(requestId)?.userVoted ?? false
    });
  }

  if (userId) {
    const votes = await queryRaw(
      `SELECT ${REQUEST_ID_COLUMN} AS "requestId" FROM request_votes WHERE ${USER_ID_COLUMN} = ? AND ${REQUEST_ID_COLUMN} IN (${inClause})`,
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
  const reactions = await queryRaw(
    `SELECT ${COMMENT_ID_COLUMN} AS "commentId", reaction FROM comment_reactions WHERE ${USER_ID_COLUMN} = ? AND ${COMMENT_ID_COLUMN} IN (${inClause})`,
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
  return queryRaw(
    `SELECT ${CONTENT_TYPE_COLUMN} AS "contentType", ${CONTENT_ID_COLUMN} AS "contentId", ${CREATED_AT_COLUMN} AS "createdAt" FROM favorites WHERE ${USER_ID_COLUMN} = ? ORDER BY ${ORDER_BY_CREATED_AT}`,
    userId
  );
}

export async function isFavorite(userId, contentType, contentId) {
  await ensureUserFeatureTables();
  const rows = await queryRaw(
    `SELECT ${CONTENT_ID_COLUMN} AS "contentId" FROM favorites WHERE ${USER_ID_COLUMN} = ? AND ${CONTENT_TYPE_COLUMN} = ? AND ${CONTENT_ID_COLUMN} = ? LIMIT 1`,
    userId,
    contentType,
    contentId
  );
  return rows.length > 0;
}

export async function listRechargeRecords(userId) {
  await ensureUserFeatureTables();
  return queryRaw(
    `SELECT id, amount, status, description, ${CREATED_AT_COLUMN} AS "createdAt" FROM recharge_records WHERE ${USER_ID_COLUMN} = ? ORDER BY ${ORDER_BY_CREATED_AT}`,
    userId
  );
}

function mapDecimal(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  const parsed = Number.parseFloat(String(value ?? fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getAppRatingSummary(appSlug, userId) {
  await ensureUserFeatureTables();

  const summaryRows = await queryRaw(
    `SELECT COUNT(*) AS "reviewCount", COALESCE(AVG(rating), 0) AS "averageRating" FROM app_ratings WHERE ${APP_SLUG_COLUMN} = ?`,
    appSlug
  );

  const summaryRow = summaryRows[0] ?? {};
  const reviewCount = mapNumber(summaryRow.reviewCount);
  const averageRating = Number(mapDecimal(summaryRow.averageRating, 0).toFixed(1));

  let userRating = 0;
  if (userId) {
    const userRows = await queryRaw(
      `SELECT rating FROM app_ratings WHERE ${USER_ID_COLUMN} = ? AND ${APP_SLUG_COLUMN} = ? LIMIT 1`,
      userId,
      appSlug
    );
    userRating = Number(mapDecimal(userRows[0]?.rating, 0).toFixed(1));
  }

  return {
    averageRating,
    reviewCount,
    userRating
  };
}

export async function upsertAppRating(userId, appSlug, rating) {
  await ensureUserFeatureTables();

  const normalizedRating = Number(mapDecimal(rating, 0).toFixed(1));

  if (isPostgresDatabase()) {
    await executeRaw(
      `
      INSERT INTO app_ratings (${USER_ID_COLUMN}, ${APP_SLUG_COLUMN}, rating, ${CREATED_AT_COLUMN}, ${UPDATED_AT_COLUMN})
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (${USER_ID_COLUMN}, ${APP_SLUG_COLUMN})
      DO UPDATE SET rating = EXCLUDED.rating, ${UPDATED_AT_COLUMN} = CURRENT_TIMESTAMP
      `,
      userId,
      appSlug,
      normalizedRating
    );
  } else {
    await executeRaw(
      `
      INSERT INTO app_ratings (${USER_ID_COLUMN}, ${APP_SLUG_COLUMN}, rating, ${CREATED_AT_COLUMN}, ${UPDATED_AT_COLUMN})
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(${USER_ID_COLUMN}, ${APP_SLUG_COLUMN})
      DO UPDATE SET rating = excluded.rating, ${UPDATED_AT_COLUMN} = CURRENT_TIMESTAMP
      `,
      userId,
      appSlug,
      normalizedRating
    );
  }

  return getAppRatingSummary(appSlug, userId);
}
