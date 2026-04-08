import { query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString } from '../utils/serializers.js';

const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('search').optional().isString().withMessage('search must be a string'),
  query('keyword').optional().isString().withMessage('keyword must be a string'),
  query('slug').optional().isString().withMessage('slug must be a string'),
  query('category').optional().isString().withMessage('category must be a string'),
  query('status').optional().isString().withMessage('status must be a string')
]);

function buildStringFilter(value) {
  const keyword = normalizeString(value).trim();
  return keyword ? { contains: keyword } : null;
}

function buildAppWhere(queryArgs = {}) {
  const where = {};
  const slug = normalizeString(queryArgs.slug).trim();
  const search = normalizeString(queryArgs.search || queryArgs.keyword).trim();
  const category = normalizeString(queryArgs.category).trim();
  const status = normalizeString(queryArgs.status).trim();

  if (slug) {
    where.slug = slug;
    return where;
  }

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { slug: buildStringFilter(search) },
      { name: buildStringFilter(search) },
      { subtitle: buildStringFilter(search) },
      { category: buildStringFilter(search) }
    ].filter((item) => Object.values(item)[0]);
  }

  return where;
}

function buildPostWhere(queryArgs = {}) {
  const where = {};
  const slug = normalizeString(queryArgs.slug).trim();
  const search = normalizeString(queryArgs.search || queryArgs.keyword).trim();
  const category = normalizeString(queryArgs.category).trim();
  const status = normalizeString(queryArgs.status).trim();

  if (slug) {
    where.slug = slug;
    return where;
  }

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { slug: buildStringFilter(search) },
      { title: buildStringFilter(search) },
      { excerpt: buildStringFilter(search) },
      { category: buildStringFilter(search) }
    ].filter((item) => Object.values(item)[0]);
  }

  return where;
}

export async function appPicker(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = buildAppWhere(req.query);

  const [items, total] = await Promise.all([
    prisma.app.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        category: true,
        icon: true,
        status: true,
        accessLevel: true,
        featured: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.app.count({ where })
  ]);

  return sendSuccess(res, {
    list: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function postPicker(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = buildPostWhere(req.query);

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        author: true,
        status: true,
        featured: true,
        readingTime: true,
        dateLabel: true,
        publishedAt: true,
        createdAt: true
      }
    }),
    prisma.post.count({ where })
  ]);

  return sendSuccess(res, {
    list: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export { listValidation };
