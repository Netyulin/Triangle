import prisma from './prisma.js';
import { normalizeJsonInput, normalizeString } from './serializers.js';

const DEFAULT_ORDER = 'sortOrder ASC, name COLLATE NOCASE ASC';

export async function ensureAppCategoriesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_categories (
      name TEXT PRIMARY KEY,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `;
  await ensureAppCategorySortOrderColumn();
}

async function ensureAppCategorySortOrderColumn() {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(app_categories)`);
  const hasSortOrder = Array.isArray(columns) && columns.some((column) => column.name === 'sortOrder');

  if (!hasSortOrder) {
    await prisma.$executeRawUnsafe(`ALTER TABLE app_categories ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0`);
    await normalizeAppCategorySortOrder();
  }
}

async function normalizeAppCategorySortOrder() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT name
    FROM app_categories
    ORDER BY sortOrder ASC, name COLLATE NOCASE ASC
  `);

  if (!Array.isArray(rows)) {
    return;
  }

  await prisma.$transaction(
    rows.map((row, index) =>
      prisma.$executeRaw`
        UPDATE app_categories
        SET sortOrder = ${index}
        WHERE name = ${row.name}
      `
    )
  );
}

async function loadCategoryRows() {
  await ensureAppCategoriesTable();
  return prisma.$queryRawUnsafe(`
    SELECT name, sortOrder, createdAt, updatedAt
    FROM app_categories
    ORDER BY ${DEFAULT_ORDER}
  `);
}

async function getNextSortOrder() {
  await ensureAppCategoriesTable();
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder
    FROM app_categories
  `);
  return Array.isArray(rows) && rows[0]?.nextSortOrder !== undefined ? Number(rows[0].nextSortOrder) : 0;
}

async function insertCategory(name, timestamp, sortOrder) {
  await prisma.$executeRaw`
    INSERT OR IGNORE INTO app_categories (name, sortOrder, createdAt, updatedAt)
    VALUES (${name}, ${sortOrder}, ${timestamp}, ${timestamp})
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
    await insertCategory(name, now, await getNextSortOrder());
  }
}

export async function listAppCategories({ publishedOnly = false } = {}) {
  await syncAppCategoriesFromApps();
  const [categories, usage] = await Promise.all([loadCategoryRows(), loadCategoryUsage(publishedOnly)]);

  return categories.map((row) => ({
    name: row.name,
    sortOrder: Number(row.sortOrder ?? 0),
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
    SELECT name, sortOrder, createdAt, updatedAt
    FROM app_categories
    WHERE name = ${nextName}
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function upsertAppCategory(name, options = {}) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensureAppCategoriesTable();
  const now = new Date().toISOString();
  const existing = await getAppCategory(nextName);
  const nextSortOrder = Number.isInteger(options.sortOrder) ? options.sortOrder : null;

  if (existing) {
    await prisma.$executeRaw`
      UPDATE app_categories
      SET updatedAt = ${now}
      WHERE name = ${nextName}
    `;
    if (nextSortOrder !== null) {
      await updateAppCategorySortOrder(nextName, nextSortOrder);
      return { ...existing, updatedAt: now, sortOrder: nextSortOrder };
    }
    return { ...existing, updatedAt: now };
  }

  const sortOrder = nextSortOrder ?? (await getNextSortOrder());
  await insertCategory(nextName, now, sortOrder);
  return { name: nextName, sortOrder, createdAt: now, updatedAt: now };
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

  return targetCategory || { name: nextName, sortOrder: currentCategory.sortOrder, createdAt: currentCategory.createdAt, updatedAt: now };
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

export async function updateAppCategorySortOrder(name, sortOrder) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensureAppCategoriesTable();
  const now = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE app_categories
    SET sortOrder = ${sortOrder}, updatedAt = ${now}
    WHERE name = ${nextName}
  `;

  return getAppCategory(nextName);
}

export async function reorderAppCategories(names) {
  await ensureAppCategoriesTable();
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
        UPDATE app_categories
        SET sortOrder = ${index}, updatedAt = ${now}
        WHERE name = ${name}
      `
    )
  );

  return listAppCategories({ publishedOnly: false });
}
