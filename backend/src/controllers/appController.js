import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import {
  normalizeBoolean,
  normalizeDownloadLinks,
  normalizeInteger,
  normalizeJsonInput,
  normalizeString,
  serializeApp,
  serializeUserPermissions
} from '../utils/serializers.js';
import { listAppCategories, upsertAppCategory } from '../utils/appCategories.js';
import { getMembershipLevelRank, normalizeMembershipLevel } from '../utils/membership.js';
import { readSiteSettings } from '../utils/siteSettings.js';
import { queueBaiduPushForApp } from '../utils/baiduPush.js';
import { importContentFromSource } from '../utils/contentImport.js';
import { localizeHtmlImages, localizeRemoteImage } from '../utils/imageLocalization.js';

const appStatuses = ['published', 'hidden', 'archived'];

const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('category').optional().isString().withMessage('category must be a string'),
  query('status').optional().isIn(appStatuses).withMessage('status is invalid'),
  query('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  query('search').optional().isString().withMessage('search must be a string'),
  query('sort').optional().isString().withMessage('sort must be a string'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc')
]);

const writeValidationRules = [
  body('slug').optional().trim().notEmpty().withMessage('slug is required'),
  body('name').optional().trim().notEmpty().withMessage('name is required'),
  body('subtitle').optional().trim().notEmpty().withMessage('subtitle is required'),
  body('category').optional().trim().notEmpty().withMessage('category is required'),
  body('version').optional().trim().notEmpty().withMessage('version is required'),
  body('size').optional().trim().notEmpty().withMessage('size is required'),
  body('pricing').optional().trim().notEmpty().withMessage('pricing is required'),
  body('summary').optional().trim().notEmpty().withMessage('summary is required'),
  body('displayMode').optional().isIn(['cover', 'icon']).withMessage('displayMode is invalid'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('editorialScore').optional().isInt({ min: 0, max: 100 }).withMessage('editorialScore must be between 0 and 100'),
  body('status').optional().isIn(appStatuses).withMessage('status is invalid'),
  body('accessLevel').optional().isIn(['free', 'sponsor', 'lifetime', 'supreme', 'member', 'premium', 'vip']).withMessage('accessLevel is invalid'),
  body('compatibility').optional().isArray().withMessage('compatibility must be an array'),
  body('platforms').optional().isArray().withMessage('platforms must be an array'),
  body('gallery').optional().isArray().withMessage('gallery must be an array'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('highlights').optional().isArray().withMessage('highlights must be an array'),
  body('requirements').optional().isArray().withMessage('requirements must be an array'),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('verified').optional().isBoolean().withMessage('verified must be a boolean'),
  body('isDownloadable').optional().isBoolean().withMessage('isDownloadable must be a boolean'),
  body('downloadLinks').optional().isArray().withMessage('downloadLinks must be an array'),
  body('downloadUrl').optional().isString().withMessage('downloadUrl must be a string')
];

const createValidation = validate([
  body('slug').trim().notEmpty().withMessage('slug is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('subtitle').trim().notEmpty().withMessage('subtitle is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('version').trim().notEmpty().withMessage('version is required'),
  body('size').trim().notEmpty().withMessage('size is required'),
  body('pricing').trim().notEmpty().withMessage('pricing is required'),
  body('summary').trim().notEmpty().withMessage('summary is required'),
  ...writeValidationRules
]);

const updateValidation = validate(writeValidationRules);

const slugParamValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);

const accessValidation = slugParamValidation;
const importContentValidation = validate([
  body('url').optional().isString().withMessage('url must be a string'),
  body('rawContent').optional().isString().withMessage('rawContent must be a string'),
  body().custom((value) => {
    const hasUrl = typeof value?.url === 'string' && value.url.trim();
    const hasContent = typeof value?.rawContent === 'string' && value.rawContent.trim();

    if (!hasUrl && !hasContent) {
      throw new Error('url or rawContent is required');
    }

    return true;
  })
]);

export { listValidation, createValidation, updateValidation, slugParamValidation, accessValidation, importContentValidation };

function includeAppRelations() {
  return {
    author: { select: { id: true, username: true, name: true, avatar: true, role: true } },
    posts: {
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        readingTime: true,
        dateLabel: true,
        publishedAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    },
    topics: { include: { topic: true } }
  };
}

function buildWhere(queryArgs, isAuthenticated) {
  const where = {};
  if (queryArgs.category) where.category = normalizeString(queryArgs.category).trim();
  if (queryArgs.status && isAuthenticated?.role === 'admin') where.status = normalizeString(queryArgs.status).trim();
  else if (!isAuthenticated || isAuthenticated?.role !== 'admin') where.status = 'published';
  if (queryArgs.featured !== undefined) where.featured = normalizeBoolean(queryArgs.featured);
  if (queryArgs.search) {
    const keyword = normalizeString(queryArgs.search).trim();
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { subtitle: { contains: keyword } },
        { summary: { contains: keyword } },
        { category: { contains: keyword } }
      ];
    }
  }
  return where;
}

function buildAppData(body) {
  const downloadLinks = normalizeDownloadLinks(body.downloadLinks, body.downloadUrl);
  const heroImage = body.heroImage !== undefined ? normalizeString(body.heroImage, '') : '';
  const icon = body.icon !== undefined ? normalizeString(body.icon, '') : '';
  return {
    slug: normalizeString(body.slug).trim(),
    name: normalizeString(body.name).trim(),
    subtitle: normalizeString(body.subtitle).trim(),
    category: normalizeString(body.category).trim(),
    icon,
    version: normalizeString(body.version).trim(),
    size: normalizeString(body.size).trim(),
    rating: body.rating !== undefined ? Number(body.rating) : 0,
    downloads: body.downloads !== undefined ? normalizeString(body.downloads).trim() : '0',
    updatedAt: body.updatedAt !== undefined ? normalizeString(body.updatedAt).trim() : new Date().toISOString().slice(0, 10),
    compatibility: normalizeJsonInput(body.compatibility, []),
    platforms: normalizeJsonInput(body.platforms, []),
    heroImage,
    displayMode: body.displayMode !== undefined ? normalizeString(body.displayMode, 'cover').trim() : (heroImage ? 'cover' : 'icon'),
    gallery: normalizeJsonInput(body.gallery, []),
    tags: normalizeJsonInput(body.tags, []),
    verified: normalizeBoolean(body.verified),
    editorialScore: body.editorialScore !== undefined ? Number(body.editorialScore) : 0,
    pricing: normalizeString(body.pricing).trim(),
    summary: normalizeString(body.summary).trim(),
    highlights: normalizeJsonInput(body.highlights, []),
    requirements: normalizeJsonInput(body.requirements, []),
    review: body.review !== undefined ? normalizeString(body.review, '') : '',
    featured: normalizeBoolean(body.featured),
    status: body.status !== undefined ? normalizeString(body.status).trim() : 'hidden',
    accessLevel: body.accessLevel !== undefined ? normalizeMembershipLevel(body.accessLevel) : 'free',
    isDownloadable: body.isDownloadable !== undefined ? normalizeBoolean(body.isDownloadable, true) : true,
    downloadUrl: downloadLinks[0]?.url ?? (body.downloadUrl !== undefined ? normalizeString(body.downloadUrl, '') : ''),
    downloadLinks,
    seoTitle: body.seoTitle !== undefined ? normalizeString(body.seoTitle, '') : '',
    seoDescription: body.seoDescription !== undefined ? normalizeString(body.seoDescription, '') : ''
  };
}

function patchAppData(current, body) {
  const nextSlug = body.slug ? normalizeString(body.slug).trim() : current.slug;
  const downloadLinks = body.downloadLinks !== undefined ? normalizeDownloadLinks(body.downloadLinks, body.downloadUrl ?? current.downloadUrl) : normalizeDownloadLinks(current.downloadLinks, current.downloadUrl);
  const heroImage = body.heroImage !== undefined ? normalizeString(body.heroImage, '') : current.heroImage;
  const icon = body.icon !== undefined ? normalizeString(body.icon, '') : current.icon;
  return {
    slug: nextSlug,
    name: body.name !== undefined ? normalizeString(body.name).trim() : current.name,
    subtitle: body.subtitle !== undefined ? normalizeString(body.subtitle).trim() : current.subtitle,
    category: body.category !== undefined ? normalizeString(body.category).trim() : current.category,
    icon,
    version: body.version !== undefined ? normalizeString(body.version).trim() : current.version,
    size: body.size !== undefined ? normalizeString(body.size).trim() : current.size,
    rating: body.rating !== undefined ? Number(body.rating) : current.rating,
    downloads: body.downloads !== undefined ? normalizeString(body.downloads).trim() : current.downloads,
    updatedAt: body.updatedAt !== undefined ? normalizeString(body.updatedAt).trim() : current.updatedAt,
    compatibility: body.compatibility !== undefined ? normalizeJsonInput(body.compatibility, []) : current.compatibility,
    platforms: body.platforms !== undefined ? normalizeJsonInput(body.platforms, []) : current.platforms,
    heroImage,
    displayMode:
      body.displayMode !== undefined
        ? normalizeString(body.displayMode, 'cover').trim()
        : current.displayMode || (heroImage ? 'cover' : 'icon'),
    gallery: body.gallery !== undefined ? normalizeJsonInput(body.gallery, []) : current.gallery,
    tags: body.tags !== undefined ? normalizeJsonInput(body.tags, []) : current.tags,
    verified: body.verified !== undefined ? normalizeBoolean(body.verified) : current.verified,
    editorialScore: body.editorialScore !== undefined ? Number(body.editorialScore) : current.editorialScore,
    pricing: body.pricing !== undefined ? normalizeString(body.pricing).trim() : current.pricing,
    summary: body.summary !== undefined ? normalizeString(body.summary).trim() : current.summary,
    highlights: body.highlights !== undefined ? normalizeJsonInput(body.highlights, []) : current.highlights,
    requirements: body.requirements !== undefined ? normalizeJsonInput(body.requirements, []) : current.requirements,
    review: body.review !== undefined ? normalizeString(body.review, '') : current.review,
    featured: body.featured !== undefined ? normalizeBoolean(body.featured) : current.featured,
    status: body.status !== undefined ? normalizeString(body.status).trim() : current.status,
    accessLevel: body.accessLevel !== undefined ? normalizeMembershipLevel(body.accessLevel) : normalizeMembershipLevel(current.accessLevel),
    isDownloadable:
      body.isDownloadable !== undefined ? normalizeBoolean(body.isDownloadable, true) : current.isDownloadable,
    downloadUrl:
      downloadLinks[0]?.url ??
      (body.downloadUrl !== undefined ? normalizeString(body.downloadUrl, '') : current.downloadUrl),
    downloadLinks,
    seoTitle: body.seoTitle !== undefined ? normalizeString(body.seoTitle, '') : current.seoTitle,
    seoDescription: body.seoDescription !== undefined ? normalizeString(body.seoDescription, '') : current.seoDescription
  };
}

function resolveDownloadAccess(app, user) {
  if (user?.role === 'admin') {
    return {
      allowed: true,
      reason: 'ok',
      requiresLogin: false
    };
  }

  if (!app.isDownloadable) {
    return {
      allowed: false,
      reason: 'download disabled',
      requiresLogin: false
    };
  }

  const requiredLevel = normalizeMembershipLevel(app.accessLevel);
  const userLevel = normalizeMembershipLevel(user?.membershipLevel);
  if (getMembershipLevelRank(userLevel) < getMembershipLevelRank(requiredLevel)) {
    return {
      allowed: false,
      reason: user ? 'membership not enough' : 'login required',
      requiresLogin: !user
    };
  }

  if (user && user.role !== 'admin' && user.downloadQuotaDaily <= user.downloadCountDaily) {
    return {
      allowed: false,
      reason: 'daily quota exhausted',
      requiresLogin: true
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    requiresLogin: false
  };
}

function resolveRequestBaseUrl(req) {
  const envSiteUrl = normalizeString(process.env.SITE_URL || '').trim();
  if (envSiteUrl) return envSiteUrl;

  const forwardedProto = normalizeString(req.headers['x-forwarded-proto'] || '').trim();
  const forwardedHost = normalizeString(req.headers['x-forwarded-host'] || '').trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = normalizeString(req.headers.host || '').trim();
  if (host) {
    const protocol = req.secure ? 'https' : 'http';
    return `${protocol}://${host}`;
  }

  return '';
}

function mapImportResultToAppPayload(result) {
  const name = normalizeString(result?.title, '').trim();
  const excerpt = normalizeString(result?.excerpt, '').trim();
  const summary = normalizeString(result?.contentHtml, '').trim();

  return {
    sourceUrl: normalizeString(result?.sourceUrl, '').trim(),
    finalUrl: normalizeString(result?.finalUrl, '').trim(),
    name,
    subtitle: excerpt || name,
    heroImage: normalizeString(result?.coverImage, '').trim(),
    summary,
    review: excerpt,
    highlights: excerpt ? [excerpt] : [],
    readingTime: normalizeString(result?.readingTime, '').trim(),
    siteName: normalizeString(result?.siteName, '').trim(),
    publishedAt: normalizeString(result?.publishedAt, '').trim(),
    warnings: Array.isArray(result?.warnings) ? result.warnings : []
  };
}

export async function list(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 12);
  const where = buildWhere(req.query, req.user ?? null);
  const sortField = ['createdAt', 'updatedAt', 'rating', 'editorialScore'].includes(req.query.sort) ? req.query.sort : 'updatedAt';
  const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';
  const orderBy = sortField === 'updatedAt' ? [{ updatedAt: sortOrder }, { createdAt: sortOrder }] : { [sortField]: sortOrder };
  const [items, total] = await Promise.all([
    prisma.app.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy, include: includeAppRelations() }),
    prisma.app.count({ where })
  ]);
  return sendSuccess(res, { list: items.map(serializeApp), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function featured(req, res) {
  const limit = normalizeInteger(req.query.limit, 6);
  const items = await prisma.app.findMany({
    where: { featured: true, status: 'published' },
    take: limit,
    orderBy: [{ updatedAt: 'desc' }, { editorialScore: 'desc' }],
    include: includeAppRelations()
  });
  return sendSuccess(res, items.map(serializeApp));
}

export async function categories(req, res) {
  const categoriesList = await listAppCategories({ publishedOnly: true });
  return sendSuccess(res, categoriesList);
}

export async function detail(req, res) {
  const app = await prisma.app.findUnique({ where: { slug: req.params.slug }, include: includeAppRelations() });
  if (!app) return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  if (!req.user && app.status !== 'published') {
    return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  }
  return sendSuccess(res, serializeApp(app));
}

export async function access(req, res) {
  const app = await prisma.app.findUnique({
    where: { slug: req.params.slug }
  });

  if (!app) {
    return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  }

  const user = req.user
    ? await prisma.user.findUnique({
        where: { id: req.user.id }
      })
    : null;
  const permission = resolveDownloadAccess(app, user);
  const serialized = serializeApp(app);
  const settings = await readSiteSettings();
  const userLevel = normalizeMembershipLevel(user?.membershipLevel);

  return sendSuccess(res, {
    appSlug: app.slug,
    accessLevel: app.accessLevel ?? 'free',
    isDownloadable: app.isDownloadable ?? true,
    showInterstitial: settings.downloadInterstitialEnabled && userLevel === 'free',
    downloadInterstitial: {
      enabled: settings.downloadInterstitialEnabled,
      title: settings.downloadInterstitialTitle,
      description: settings.downloadInterstitialDescription,
      buttonText: settings.downloadInterstitialButtonText,
      buyUrl: settings.downloadInterstitialBuyUrl
    },
    downloadUrl: permission.allowed ? serialized.downloadUrl ?? null : null,
    downloadLinks: permission.allowed ? serialized.downloadLinks : [],
    downloadPermission: permission,
    userPermissions: serializeUserPermissions(user)
  });
}

export async function create(req, res) {
  const payload = buildAppData(req.body || {});
  const existed = await prisma.app.findUnique({ where: { slug: payload.slug } });
  if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  const app = await prisma.app.create({ data: { ...payload, authorId: req.user.id }, include: includeAppRelations() });
  await upsertAppCategory(payload.category);
  if (app.status === 'published') {
    queueBaiduPushForApp(app.slug);
  }
  return sendSuccess(res, serializeApp(app), 'created', 201);
}

export async function update(req, res) {
  const body = req.body || {};
  const current = await prisma.app.findUnique({ where: { slug: req.params.slug } });
  if (!current) return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  const nextSlug = body.slug ? normalizeString(body.slug).trim() : current.slug;
  if (nextSlug !== current.slug) {
    const existed = await prisma.app.findUnique({ where: { slug: nextSlug } });
    if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  }
  const app = await prisma.app.update({ where: { slug: current.slug }, data: patchAppData(current, body), include: includeAppRelations() });
  await upsertAppCategory(app.category);
  const isNowPublished = app.status === 'published';
  const wasPublished = current.status === 'published';
  if (isNowPublished && (!wasPublished || app.slug !== current.slug)) {
    queueBaiduPushForApp(app.slug);
  }
  return sendSuccess(res, serializeApp(app), 'updated');
}

export async function remove(req, res) {
  const current = await prisma.app.findUnique({ where: { slug: req.params.slug } });
  if (!current) return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  const slug = req.params.slug;

  await prisma.$transaction([
    prisma.downloadLog.deleteMany({ where: { softwareSlug: slug } }),
    prisma.cpsDownload.deleteMany({ where: { softwareSlug: slug } }),
    prisma.topicApp.deleteMany({ where: { appSlug: slug } }),
    prisma.comment.deleteMany({ where: { appSlug: slug } }),
    prisma.netdiskReport.deleteMany({ where: { appSlug: slug } }),
    prisma.app.delete({ where: { slug } })
  ]);
  return sendSuccess(res, null, 'deleted');
}

export async function importFromUrl(req, res) {
  try {
    const result = await importContentFromSource({
      url: req.body.url,
      rawContent: req.body.rawContent
    });

    const localized = mapImportResultToAppPayload(result);

    if (localized.heroImage) {
      try {
        localized.heroImage = await localizeRemoteImage(localized.heroImage, 'app-cover');
      } catch (error) {
        console.warn('[app import hero localize skipped]', localized.heroImage, error instanceof Error ? error.message : error);
      }
    }

    if (localized.summary) {
      const importBaseUrl = localized.finalUrl || localized.sourceUrl || req.body.url || resolveRequestBaseUrl(req);
      localized.summary = await localizeHtmlImages(localized.summary, 'app-cover', importBaseUrl);
    }

    return sendSuccess(res, localized, 'imported');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, ErrorCodes.PARAM_ERROR, error.message);
    }

    console.error('[app import failed]', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'failed to import content');
  }
}
