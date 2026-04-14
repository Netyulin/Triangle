import prisma from './prisma.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { normalizeJsonInput, normalizeString } from './serializers.js';
import { isPostgresDatabase, listTableColumns } from './signTables.js';

const DEFAULT_ORDER = isPostgresDatabase() ? '"sortOrder" ASC, LOWER(name) ASC' : 'sortOrder ASC, name COLLATE NOCASE ASC';
const CATEGORY_SELECT_COLUMNS = isPostgresDatabase()
  ? 'name, "sortOrder" AS "sortOrder", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"'
  : 'name, sortOrder, createdAt, updatedAt';
const SORT_ORDER_COLUMN = isPostgresDatabase() ? '"sortOrder"' : 'sortOrder';
const UPDATED_AT_COLUMN = isPostgresDatabase() ? '"updatedAt"' : 'updatedAt';

async function renameLegacyColumn(legacyColumn, nextColumn) {
  if (!isPostgresDatabase()) {
    return;
  }

  const columns = await listTableColumns('post_categories');
  const names = new Set(columns.map((row) => String(row.column_name || '').trim()));
  const legacy = String(legacyColumn || '').trim();
  const next = String(nextColumn || '').trim();

  if (!names.has(legacy) || names.has(next)) {
    return;
  }

  await executeRaw(`ALTER TABLE post_categories RENAME COLUMN "${legacyColumn}" TO "${nextColumn}"`);
}

export async function ensurePostCategoriesTable() {
  if (isPostgresDatabase()) {
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS post_categories (
        name TEXT PRIMARY KEY,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);
  } else {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS post_categories (
        name TEXT PRIMARY KEY,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `;
  }
  await renameLegacyColumn('sortorder', 'sortOrder');
  await renameLegacyColumn('createdat', 'createdAt');
  await renameLegacyColumn('updatedat', 'updatedAt');
  await ensurePostCategorySortOrderColumn();
}

async function ensurePostCategorySortOrderColumn() {
  let hasSortOrder = false;

  if (isPostgresDatabase()) {
    const columns = await listTableColumns('post_categories');
    hasSortOrder = Array.isArray(columns) && columns.some((column) => String(column.column_name || '').trim().toLowerCase() === 'sortorder');
  } else {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(post_categories)`);
    hasSortOrder = Array.isArray(columns) && columns.some((column) => column.name === 'sortOrder');
  }

  if (!hasSortOrder) {
    if (isPostgresDatabase()) {
      await executeRaw(`ALTER TABLE post_categories ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0`);
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE post_categories ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0`);
    }
    await normalizePostCategorySortOrder();
  }
}

async function normalizePostCategorySortOrder() {
  const rows = await queryRaw(`
    SELECT name
    FROM post_categories
    ORDER BY ${DEFAULT_ORDER}
  `);

  if (!Array.isArray(rows)) {
    return;
  }

  await prisma.$transaction(
    rows.map((row, index) =>
      executeRaw(
        `
          UPDATE post_categories
          SET ${SORT_ORDER_COLUMN} = ?
          WHERE name = ?
        `,
        index,
        row.name,
      )
    )
  );
}

async function loadCategoryRows() {
  await ensurePostCategoriesTable();
  return queryRaw(`
    SELECT ${CATEGORY_SELECT_COLUMNS}
    FROM post_categories
    ORDER BY ${DEFAULT_ORDER}
  `);
}

async function getNextSortOrder() {
  await ensurePostCategoriesTable();
  const rows = await queryRaw(`
    SELECT COALESCE(MAX(${SORT_ORDER_COLUMN}), -1) + 1 AS "nextSortOrder"
    FROM post_categories
  `);
  return Array.isArray(rows) && rows[0]?.nextSortOrder !== undefined ? Number(rows[0].nextSortOrder) : 0;
}

async function insertCategory(name, timestamp, sortOrder) {
  if (isPostgresDatabase()) {
    await executeRaw(
      `
        INSERT INTO post_categories (name, "sortOrder", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?)
        ON CONFLICT (name) DO NOTHING
      `,
      name,
      sortOrder,
      timestamp,
      timestamp,
    );
    return;
  }

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

  const rows = await queryRaw(
    `
      SELECT ${CATEGORY_SELECT_COLUMNS}
      FROM post_categories
      WHERE name = ?
      LIMIT 1
    `,
    nextName,
  );

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
    await executeRaw(
      `
        UPDATE post_categories
        SET ${UPDATED_AT_COLUMN} = ?
        WHERE name = ?
      `,
      now,
      nextName,
    );
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
      await executeRaw(
        `
          UPDATE post_categories
          SET name = ?, ${UPDATED_AT_COLUMN} = ?
          WHERE name = ?
        `,
        tx,
        nextName,
        now,
        currentName,
      );
    } else {
      await executeRaw(
        `
          UPDATE post_categories
          SET ${UPDATED_AT_COLUMN} = ?
          WHERE name = ?
        `,
        tx,
        now,
        nextName,
      );
      await executeRaw(
        `
          DELETE FROM post_categories
          WHERE name = ?
        `,
        tx,
        currentName,
      );
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
  await executeRaw(
    `
      DELETE FROM post_categories
      WHERE name = ?
    `,
    nextName,
  );
  return true;
}

export async function updatePostCategorySortOrder(name, sortOrder) {
  const nextName = normalizeString(name).trim();
  if (!nextName) {
    return null;
  }

  await ensurePostCategoriesTable();
  const now = new Date().toISOString();
  await executeRaw(
    `
      UPDATE post_categories
      SET ${SORT_ORDER_COLUMN} = ?, ${UPDATED_AT_COLUMN} = ?
      WHERE name = ?
    `,
    sortOrder,
    now,
    nextName,
  );

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
      executeRaw(
        `
          UPDATE post_categories
          SET ${SORT_ORDER_COLUMN} = ?, ${UPDATED_AT_COLUMN} = ?
          WHERE name = ?
        `,
        index,
        now,
        name,
      )
    )
  );

  return listPostCategories({ publishedOnly: false });
}
