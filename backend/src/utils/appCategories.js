import prisma from './prisma.js';
import { normalizeJsonInput, normalizeString } from './serializers.js';

const DEFAULT_ORDER = 'name COLLATE NOCASE ASC';

export async function ensureAppCategoriesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_categories (
      name TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `;
}

async function loadCategoryRows() {
  await ensureAppCategoriesTable();
  return prisma.$queryRawUnsafe(`
    SELECT name, createdAt, updatedAt
    FROM app_categories
    ORDER BY ${DEFAULT_ORDER}
  `);
}

async function insertCategory(name, timestamp) {
  await prisma.$executeRaw`
    INSERT OR IGNORE INTO app_categories (name, createdAt, updatedAt)
    VALUES (${name}, ${timestamp}, ${timestamp})
  `;
}

async function loadCategoryUsage(publishedOnly = false) {
  const rows = await prisma.app.findMany({
    where: publishedOnly ? { status: 'published' } : {},
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

export async function syncAppCategoriesFromApps() {
  await ensureAppCategoriesTable();
  const rows = await prisma.app.findMany({ select: { category: true } });
  const now = new Date().toISOString();
  const names = [...new Set(rows.map((row) => normalizeString(row.category).trim()).filter(Boolean))];

  for (const name of names) {
    await insertCategory(name, now);
  }
}

export async function listAppCategories({ publishedOnly = false } = {}) {
  await syncAppCategoriesFromApps();
  const [categories, usage] = await Promise.all([loadCategoryRows(), loadCategoryUsage(publishedOnly)]);

  return categories.map((row) => ({
    name: row.name,
    count: usage[row.name] || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function getAppCategory(name) {
  await ensureAppCategoriesTable();
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT name, createdAt, updatedAt
    FROM app_categories
    WHERE name = ${nextName}
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function upsertAppCategory(name) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensureAppCategoriesTable();
  const now = new Date().toISOString();
  const existing = await getAppCategory(nextName);

  if (existing) {
    await prisma.$executeRaw`
      UPDATE app_categories
      SET updatedAt = ${now}
      WHERE name = ${nextName}
    `;
    return { ...existing, updatedAt: now };
  }

  await insertCategory(nextName, now);
  return { name: nextName, createdAt: now, updatedAt: now };
}

export async function countAppsByCategory(name, { publishedOnly = false } = {}) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return 0;
  }

  const rows = await prisma.app.findMany({
    where: publishedOnly ? { category: nextName, status: 'published' } : { category: nextName },
    select: { id: true }
  });

  return rows.length;
}

function replaceCategoryInTags(tags, oldName, newName) {
  const parsed = normalizeJsonInput(tags, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => (item === oldName ? newName : item));
}

export async function renameAppCategory(oldName, newName) {
  const currentName = normalizeString(oldName).trim();
  const nextName = normalizeString(newName).trim();

  if (!currentName || !nextName) {
    return null;
  }

  if (currentName === nextName) {
    return getAppCategory(currentName);
  }

  await ensureAppCategoriesTable();
  const affectedApps = await prisma.app.findMany({
    where: { category: currentName },
    select: { slug: true, tags: true }
  });

  const now = new Date().toISOString();
  const currentCategory = await getAppCategory(currentName);
  if (!currentCategory) {
    return null;
  }

  const targetCategory = await getAppCategory(nextName);

  await prisma.$transaction(async (tx) => {
    if (!targetCategory) {
      await tx.$executeRaw`
        UPDATE app_categories
        SET name = ${nextName}, updatedAt = ${now}
        WHERE name = ${currentName}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE app_categories
        SET updatedAt = ${now}
        WHERE name = ${nextName}
      `;
      await tx.$executeRaw`
        DELETE FROM app_categories
        WHERE name = ${currentName}
      `;
    }

    for (const app of affectedApps) {
      await tx.app.update({
        where: { slug: app.slug },
        data: {
          category: nextName,
          tags: replaceCategoryInTags(app.tags, currentName, nextName)
        }
      });
    }
  });

  return targetCategory || { name: nextName, createdAt: currentCategory.createdAt, updatedAt: now };
}

export async function deleteAppCategory(name) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return false;
  }

  await ensureAppCategoriesTable();
  await prisma.$executeRaw`
    DELETE FROM app_categories
    WHERE name = ${nextName}
  `;
  return true;
}
