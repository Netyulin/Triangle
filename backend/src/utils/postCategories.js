import prisma from './prisma.js';
import { normalizeJsonInput, normalizeString } from './serializers.js';

const DEFAULT_ORDER = 'name COLLATE NOCASE ASC';

export async function ensurePostCategoriesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS post_categories (
      name TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `;
}

async function loadCategoryRows() {
  await ensurePostCategoriesTable();
  return prisma.$queryRawUnsafe(`
    SELECT name, createdAt, updatedAt
    FROM post_categories
    ORDER BY ${DEFAULT_ORDER}
  `);
}

async function insertCategory(name, timestamp) {
  await prisma.$executeRaw`
    INSERT OR IGNORE INTO post_categories (name, createdAt, updatedAt)
    VALUES (${name}, ${timestamp}, ${timestamp})
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
    await insertCategory(name, now);
  }
}

export async function listPostCategories({ publishedOnly = false } = {}) {
  await syncPostCategoriesFromPosts();
  const [categories, usage] = await Promise.all([loadCategoryRows(), loadCategoryUsage(publishedOnly)]);

  return categories.map((row) => ({
    name: row.name,
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
    SELECT name, createdAt, updatedAt
    FROM post_categories
    WHERE name = ${nextName}
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function upsertPostCategory(name) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensurePostCategoriesTable();
  const now = new Date().toISOString();
  const existing = await getPostCategory(nextName);

  if (existing) {
    await prisma.$executeRaw`
      UPDATE post_categories
      SET updatedAt = ${now}
      WHERE name = ${nextName}
    `;
    return { ...existing, updatedAt: now };
  }

  await insertCategory(nextName, now);
  return { name: nextName, createdAt: now, updatedAt: now };
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

  return targetCategory || { name: nextName, createdAt: currentCategory.createdAt, updatedAt: now };
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
