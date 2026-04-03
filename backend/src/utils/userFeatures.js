import prisma from './prisma.js';

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

const FEMALE_TOP_TYPES = [
  'LongHairBigHair',
  'LongHairBob',
  'LongHairBun',
  'LongHairCurly',
  'LongHairCurvy',
  'LongHairFrida',
  'LongHairFro',
  'LongHairMiaWallace',
  'LongHairStraight',
  'LongHairStraight2',
  'LongHairStraightStrand',
  'Hijab'
];

const MALE_TOP_TYPES = [
  'ShortHairDreads01',
  'ShortHairDreads02',
  'ShortHairFrizzle',
  'ShortHairShortCurly',
  'ShortHairShortFlat',
  'ShortHairShortRound',
  'ShortHairShortWaved',
  'ShortHairSides',
  'ShortHairTheCaesar',
  'ShortHairTheCaesarSidePart',
  'NoHair',
  'Turban'
];

const ALL_TOP_TYPES = [
  ...FEMALE_TOP_TYPES,
  ...MALE_TOP_TYPES
];

const ACCESSORIES_TYPES = ['Blank', 'Prescription01', 'Prescription02', 'Round', 'Wayfarers', 'Kurt'];
const HAIR_COLORS = ['Auburn', 'Black', 'Blonde', 'BlondeGolden', 'Brown', 'BrownDark', 'Red', 'SilverGray'];
const FACIAL_HAIR_TYPES = ['Blank', 'BeardLight', 'BeardMedium', 'BeardMajestic', 'MoustacheFancy', 'MoustacheMagnum'];
const CLOTHE_TYPES = [
  'BlazerShirt',
  'BlazerSweater',
  'CollarSweater',
  'GraphicShirt',
  'Hoodie',
  'ShirtCrewNeck',
  'ShirtScoopNeck',
  'ShirtVNeck'
];
const CLOTHE_COLORS = ['Black', 'Blue01', 'Blue02', 'Blue03', 'Gray01', 'Gray02', 'PastelBlue', 'PastelGreen', 'Pink', 'White'];
const EYE_TYPES = ['Default', 'Happy', 'Squint', 'Wink', 'Side', 'Surprised', 'Hearts'];
const EYEBROW_TYPES = ['Default', 'DefaultNatural', 'RaisedExcited', 'RaisedExcitedNatural', 'UpDown', 'UpDownNatural'];
const MOUTH_TYPES = ['Default', 'Smile', 'Twinkle', 'Serious'];
const SKIN_COLORS = ['Tanned', 'Yellow', 'Pale', 'Light', 'Brown', 'DarkBrown'];

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

function pickValue(values, hash, offset = 0) {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }
  return values[(hash + offset * 97) % values.length];
}

function pickTopType(hash, gender) {
  if (gender === 'female') {
    return pickValue(FEMALE_TOP_TYPES, hash, 1);
  }
  if (gender === 'male') {
    return pickValue(MALE_TOP_TYPES, hash, 1);
  }
  return pickValue(ALL_TOP_TYPES, hash, 1);
}

function pickFacialHairType(hash, gender) {
  if (gender === 'female') {
    return 'Blank';
  }

  if (gender === 'male') {
    if (hash % 100 < 55) {
      return pickValue(FACIAL_HAIR_TYPES.filter((item) => item !== 'Blank'), hash, 2);
    }
    return 'Blank';
  }

  if (hash % 100 < 30) {
    return pickValue(FACIAL_HAIR_TYPES.filter((item) => item !== 'Blank'), hash, 2);
  }
  return 'Blank';
}

export function buildDefaultAvatar(seed, gender = 'other') {
  const normalizedSeed = String(seed || 'triangle-user').trim() || 'triangle-user';
  const normalizedGender = normalizeGender(gender);
  const hash = stableHash(`${normalizedSeed}:${normalizedGender}`);
  const facialHairType = pickFacialHairType(hash, normalizedGender);

  const params = new URLSearchParams({
    avatarStyle: 'Circle',
    topType: pickTopType(hash, normalizedGender),
    accessoriesType: pickValue(ACCESSORIES_TYPES, hash, 3),
    hairColor: pickValue(HAIR_COLORS, hash, 4),
    facialHairType,
    facialHairColor: facialHairType === 'Blank' ? 'Black' : pickValue(HAIR_COLORS, hash, 5),
    clotheType: pickValue(CLOTHE_TYPES, hash, 6),
    clotheColor: pickValue(CLOTHE_COLORS, hash, 7),
    eyeType: pickValue(EYE_TYPES, hash, 8),
    eyebrowType: pickValue(EYEBROW_TYPES, hash, 9),
    mouthType: pickValue(MOUTH_TYPES, hash, 10),
    skinColor: pickValue(SKIN_COLORS, hash, 11),
    triangleDefault: '1',
    triangleGender: normalizedGender
  });

  return `https://avataaars.io/?${params.toString()}`;
}

export function isGeneratedAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') {
    return false;
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
