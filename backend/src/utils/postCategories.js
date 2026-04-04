import prisma from './prisma.js';
import { normalizeJsonInput, normalizeString } from './serializers.js';

const DEFAULT_ORDER = 'sortOrder ASC, name COLLATE NOCASE ASC';

export async function ensurePostCategoriesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS post_categories (
      name TEXT PRIMARY KEY,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `;
  await ensurePostCategorySortOrderColumn();
}

async function ensurePostCategorySortOrderColumn() {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(post_categories)`);
  const hasSortOrder = Array.isArray(columns) && columns.some((column) => column.name === 'sortOrder');

  if (!hasSortOrder) {
    await prisma.$executeRawUnsafe(`ALTER TABLE post_categories ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0`);
    await normalizePostCategorySortOrder();
  }
}

async function normalizePostCategorySortOrder() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT name
    FROM post_categories
    ORDER BY sortOrder ASC, name COLLATE NOCASE ASC
  `);

  if (!Array.isArray(rows)) {
    return;
  }

  await prisma.$transaction(
    rows.map((row, index) =>
      prisma.$executeRaw`
        UPDATE post_categories
        SET sortOrder = ${index}
        WHERE name = ${row.name}
      `
    )
  );
}

async function loadCategoryRows() {
  await ensurePostCategoriesTable();
  return prisma.$queryRawUnsafe(`
    SELECT name, sortOrder, createdAt, updatedAt
    FROM post_categories
    ORDER BY ${DEFAULT_ORDER}
  `);
}

async function getNextSortOrder() {
  await ensurePostCategoriesTable();
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder
    FROM post_categories
  `);
  return Array.isArray(rows) && rows[0]?.nextSortOrder !== undefined ? Number(rows[0].nextSortOrder) : 0;
}

async function insertCategory(name, timestamp, sortOrder) {
  await prisma.$executeRaw`
    INSERT OR IGNORE INTO post_categories (name, sortOrder, createdAt, updatedAt)
    VALUES (${name}, ${sortOrder}, ${timestamp}, ${timestamp})
  `;
}

async function loadCategoryUsage(publishedOnly = false) {
  const where = publishedOnly ? { status: 'published' } : {};
  const rows = await prisma.post.findMany({
    where,
    select: { category: true }
  });

  return rows.reduce((acc, row) => {
    const name = normalizeString(row.category).trim();
    if (!name) {
      return acc;
    }
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
}

export async function syncPostCategoriesFromPosts() {
  await ensurePostCategoriesTable();
  const rows = await prisma.post.findMany({ select: { category: true } });
  const now = new Date().toISOString();
  const names = [...new Set(rows.map((row) => normalizeString(row.category).trim()).filter(Boolean))];

  for (const name of names) {
    await insertCategory(name, now, await getNextSortOrder());
  }
}

export async function listPostCategories({ publishedOnly = false } = {}) {
  await syncPostCategoriesFromPosts();
  const [categories, usage] = await Promise.all([loadCategoryRows(), loadCategoryUsage(publishedOnly)]);

  return categories.map((row) => ({
    name: row.name,
    sortOrder: Number(row.sortOrder ?? 0),
    count: usage[row.name] || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function getPostCategory(name) {
  await ensurePostCategoriesTable();
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT name, sortOrder, createdAt, updatedAt
    FROM post_categories
    WHERE name = ${nextName}
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function upsertPostCategory(name, options = {}) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensurePostCategoriesTable();
  const now = new Date().toISOString();
  const existing = await getPostCategory(nextName);
  const nextSortOrder = Number.isInteger(options.sortOrder) ? options.sortOrder : null;

  if (existing) {
    await prisma.$executeRaw`
      UPDATE post_categories
      SET updatedAt = ${now}
      WHERE name = ${nextName}
    `;
    if (nextSortOrder !== null) {
      await updatePostCategorySortOrder(nextName, nextSortOrder);
      return { ...existing, updatedAt: now, sortOrder: nextSortOrder };
    }
    return { ...existing, updatedAt: now };
  }

  const sortOrder = nextSortOrder ?? (await getNextSortOrder());
  await insertCategory(nextName, now, sortOrder);
  return { name: nextName, sortOrder, createdAt: now, updatedAt: now };
}

export async function countPostsByCategory(name, { publishedOnly = false } = {}) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return 0;
  }

  const where = publishedOnly ? { category: nextName, status: 'published' } : { category: nextName };
  const rows = await prisma.post.findMany({
    where,
    select: { id: true }
  });

  return rows.length;
}

export async function renamePostCategory(oldName, newName) {
  const currentName = normalizeString(oldName).trim();
  const nextName = normalizeString(newName).trim();

  if (!currentName || !nextName) {
    return null;
  }

  if (currentName === nextName) {
    return getPostCategory(currentName);
  }

  await ensurePostCategoriesTable();
  const affectedPosts = await prisma.post.findMany({
    where: { category: currentName },
    select: { slug: true }
  });

  const now = new Date().toISOString();
  const currentCategory = await getPostCategory(currentName);
  if (!currentCategory) {
    return null;
  }

  const targetCategory = await getPostCategory(nextName);

  await prisma.$transaction(async (tx) => {
    if (!targetCategory) {
      await tx.$executeRaw`
        UPDATE post_categories
        SET name = ${nextName}, updatedAt = ${now}
        WHERE name = ${currentName}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE post_categories
        SET updatedAt = ${now}
        WHERE name = ${nextName}
      `;
      await tx.$executeRaw`
        DELETE FROM post_categories
        WHERE name = ${currentName}
      `;
    }

    for (const post of affectedPosts) {
      await tx.post.update({
        where: { slug: post.slug },
        data: {
          category: nextName
        }
      });
    }
  });

  return targetCategory || { name: nextName, sortOrder: currentCategory.sortOrder, createdAt: currentCategory.createdAt, updatedAt: now };
}

export async function deletePostCategory(name) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return false;
  }

  await ensurePostCategoriesTable();
  await prisma.$executeRaw`
    DELETE FROM post_categories
    WHERE name = ${nextName}
  `;
  return true;
}

export async function updatePostCategorySortOrder(name, sortOrder) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensurePostCategoriesTable();
  const now = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE post_categories
    SET sortOrder = ${sortOrder}, updatedAt = ${now}
    WHERE name = ${nextName}
  `;

  return getPostCategory(nextName);
}

export async function reorderPostCategories(names) {
  await ensurePostCategoriesTable();
  const current = await loadCategoryRows();
  const currentNames = Array.isArray(current) ? current.map((item) => item.name) : [];
  const orderedNames = names
    .map((item) => normalizeString(item).trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index && currentNames.includes(item));

  const remaining = currentNames.filter((item) => !orderedNames.includes(item));
  const nextNames = [...orderedNames, ...remaining];
  const now = new Date().toISOString();

  await prisma.$transaction(
    nextNames.map((name, index) =>
      prisma.$executeRaw`
        UPDATE post_categories
        SET sortOrder = ${index}, updatedAt = ${now}
        WHERE name = ${name}
      `
    )
  );

  return listPostCategories({ publishedOnly: false });
}
