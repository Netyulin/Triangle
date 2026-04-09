import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';

const slotTypes = ['banner', 'insertion', 'native', 'splash'];
const slotPositions = ['top', 'bottom', 'sidebar', 'infeed'];
const slotThemes = ['light', 'dark', 'auto'];

const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('type').optional().isIn(slotTypes).withMessage('type is invalid'),
  query('position').optional().isIn(slotPositions).withMessage('position is invalid'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]);

const createValidation = validate([
  body('name').trim().notEmpty().withMessage('name is required'),
  body('type').isIn(slotTypes).withMessage('type is invalid'),
  body('position').isIn(slotPositions).withMessage('position is invalid'),
  body('width').isInt({ min: 1 }).withMessage('width must be a positive integer'),
  body('height').isInt({ min: 1 }).withMessage('height must be a positive integer'),
  body('theme').optional().isIn(slotThemes).withMessage('theme is invalid'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]);

const updateValidation = validate([
  body('name').optional().trim().notEmpty().withMessage('name is required'),
  body('type').optional().isIn(slotTypes).withMessage('type is invalid'),
  body('position').optional().isIn(slotPositions).withMessage('position is invalid'),
  body('width').optional().isInt({ min: 1 }).withMessage('width must be a positive integer'),
  body('height').optional().isInt({ min: 1 }).withMessage('height must be a positive integer'),
  body('theme').optional().isIn(slotThemes).withMessage('theme is invalid'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]);

const slotIdValidation = validate([param('slotId').trim().notEmpty().withMessage('slotId is required')]);
const slotEntityIdValidation = validate([param('id').trim().notEmpty().withMessage('id is required')]);

const adContentValidation = slotIdValidation;

const clickValidation = validate([
  body('adId').trim().notEmpty().withMessage('adId is required'),
  body('slotId').optional().trim()
]);

const adContentListValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('slotId').optional().isString().withMessage('slotId must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('search').optional().isString().withMessage('search must be a string')
]);

const adContentCreateValidation = validate([
  body('slotId').trim().notEmpty().withMessage('slotId is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('imageUrl').trim().notEmpty().withMessage('imageUrl is required'),
  body('targetUrl').trim().notEmpty().withMessage('targetUrl is required'),
  body('advertiser').trim().notEmpty().withMessage('advertiser is required'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('ctaText').optional().isString().withMessage('ctaText must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('priority').optional().isInt().withMessage('priority must be an integer')
]);

const adContentUpdateValidation = validate([
  param('id').trim().notEmpty().withMessage('id is required'),
  body('slotId').optional().isString().withMessage('slotId must be a string'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('imageUrl').optional().isString().withMessage('imageUrl must be a string'),
  body('targetUrl').optional().isString().withMessage('targetUrl must be a string'),
  body('ctaText').optional().isString().withMessage('ctaText must be a string'),
  body('advertiser').optional().isString().withMessage('advertiser must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('priority').optional().isInt().withMessage('priority must be an integer')
]);

const adContentIdValidation = validate([param('id').trim().notEmpty().withMessage('id is required')]);

export {
  listValidation,
  createValidation,
  updateValidation,
  slotIdValidation,
  slotEntityIdValidation,
  adContentValidation,
  clickValidation,
  adContentListValidation,
  adContentCreateValidation,
  adContentUpdateValidation,
  adContentIdValidation
};

export async function listSlots(req, res) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const where = {};

  if (req.query.type) where.type = req.query.type;
  if (req.query.position) where.position = req.query.position;
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

  const [items, total] = await Promise.all([
    prisma.adSlot.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { adContents: true } } }
    }),
    prisma.adSlot.count({ where })
  ]);

  return sendSuccess(res, {
    list: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function getSlot(req, res) {
  const slot = await prisma.adSlot.findUnique({
    where: { id: req.params.id },
    include: { adContents: { orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] } }
  });

  if (!slot) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  return sendSuccess(res, slot);
}

export async function createSlot(req, res) {
  const data = {
    name: req.body.name,
    type: req.body.type,
    position: req.body.position,
    width: Number(req.body.width),
    height: Number(req.body.height),
    theme: req.body.theme || 'auto',
    isActive: req.body.isActive !== undefined ? req.body.isActive : true
  };

  const slot = await prisma.adSlot.create({ data });
  return sendSuccess(res, slot, 'created', 201);
}

export async function updateSlot(req, res) {
  const current = await prisma.adSlot.findUnique({ where: { id: req.params.id } });
  if (!current) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.type !== undefined) data.type = req.body.type;
  if (req.body.position !== undefined) data.position = req.body.position;
  if (req.body.width !== undefined) data.width = Number(req.body.width);
  if (req.body.height !== undefined) data.height = Number(req.body.height);
  if (req.body.theme !== undefined) data.theme = req.body.theme;
  if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

  const slot = await prisma.adSlot.update({ where: { id: req.params.id }, data });
  return sendSuccess(res, slot, 'updated');
}

export async function deleteSlot(req, res) {
  const current = await prisma.adSlot.findUnique({ where: { id: req.params.id } });
  if (!current) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  await prisma.adSlot.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'deleted');
}

export async function getAdContent(req, res) {
  const slot = await prisma.adSlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  const contents = await prisma.adContent.findMany({
    where: { slotId: req.params.slotId, isActive: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
  });

  if (contents.length === 0) {
    return sendSuccess(res, null);
  }

  const randomIndex = Math.floor(Math.random() * contents.length);
  return sendSuccess(res, contents[randomIndex]);
}

export async function listAdContents(req, res) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const where = {};

  if (req.query.slotId) where.slotId = String(req.query.slotId);
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    const keyword = String(req.query.search).trim();
    if (keyword) {
      where.OR = [{ title: { contains: keyword } }, { description: { contains: keyword } }, { advertiser: { contains: keyword } }];
    }
  }

  const [items, total] = await Promise.all([
    prisma.adContent.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        slot: {
          select: {
            id: true,
            name: true,
            type: true,
            position: true,
            isActive: true
          }
        }
      }
    }),
    prisma.adContent.count({ where })
  ]);

  return sendSuccess(res, {
    list: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function getAdContentById(req, res) {
  const item = await prisma.adContent.findUnique({
    where: { id: req.params.id },
    include: {
      slot: {
        select: {
          id: true,
          name: true,
          type: true,
          position: true,
          isActive: true
        }
      }
    }
  });

  if (!item) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad content not found');
  }

  return sendSuccess(res, item);
}

export async function createAdContent(req, res) {
  const slot = await prisma.adSlot.findUnique({ where: { id: req.body.slotId } });
  if (!slot) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  const data = {
    slotId: req.body.slotId,
    title: req.body.title,
    description: req.body.description || null,
    imageUrl: req.body.imageUrl,
    targetUrl: req.body.targetUrl,
    ctaText: req.body.ctaText || '了解更多',
    advertiser: req.body.advertiser,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    priority: Number(req.body.priority) || 0
  };

  const content = await prisma.adContent.create({ data });
  return sendSuccess(res, content, 'created', 201);
}

export async function updateAdContent(req, res) {
  const current = await prisma.adContent.findUnique({ where: { id: req.params.id } });
  if (!current) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad content not found');
  }

  if (req.body.slotId && req.body.slotId !== current.slotId) {
    const slot = await prisma.adSlot.findUnique({ where: { id: req.body.slotId } });
    if (!slot) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
    }
  }

  const data = {};
  if (req.body.slotId !== undefined) data.slotId = String(req.body.slotId).trim();
  if (req.body.title !== undefined) data.title = String(req.body.title).trim();
  if (req.body.description !== undefined) data.description = req.body.description ? String(req.body.description) : null;
  if (req.body.imageUrl !== undefined) data.imageUrl = String(req.body.imageUrl).trim();
  if (req.body.targetUrl !== undefined) data.targetUrl = String(req.body.targetUrl).trim();
  if (req.body.ctaText !== undefined) data.ctaText = req.body.ctaText ? String(req.body.ctaText).trim() : '了解更多';
  if (req.body.advertiser !== undefined) data.advertiser = String(req.body.advertiser).trim();
  if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
  if (req.body.priority !== undefined) data.priority = Number(req.body.priority) || 0;

  const item = await prisma.adContent.update({ where: { id: req.params.id }, data });
  return sendSuccess(res, item, 'updated');
}

export async function deleteAdContent(req, res) {
  const current = await prisma.adContent.findUnique({ where: { id: req.params.id } });
  if (!current) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad content not found');
  }

  await prisma.adContent.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'deleted');
}

export async function getAdStats(_req, res) {
  const [totalSlots, activeSlots, totalContents, activeContents, totalDownloadLogs, totalCpsClicks, slotStats, trendRows] =
    await Promise.all([
      prisma.adSlot.count(),
      prisma.adSlot.count({ where: { isActive: true } }),
      prisma.adContent.count(),
      prisma.adContent.count({ where: { isActive: true } }),
      prisma.downloadLog.count(),
      prisma.cpsDownload.count(),
      prisma.adSlot.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          position: true,
          isActive: true,
          _count: { select: { adContents: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.$queryRawUnsafe(`
        SELECT DATE(clickedAt) AS date, COUNT(*) AS count
        FROM CpsDownload
        WHERE clickedAt >= DATETIME('now', '-6 day')
        GROUP BY DATE(clickedAt)
        ORDER BY DATE(clickedAt) ASC
      `)
    ]);

  return sendSuccess(res, {
    summary: {
      totalSlots,
      activeSlots,
      totalContents,
      activeContents,
      totalDownloadLogs,
      totalCpsClicks
    },
    slots: slotStats,
    trend: Array.isArray(trendRows)
      ? trendRows.map((item) => ({
          date: item.date,
          count: Number(item.count || 0)
        }))
      : []
  });
}

export async function trackClick(req, res) {
  const { adId, slotId } = req.body;

  const content = await prisma.adContent.findUnique({ where: { id: adId } });
  if (!content) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad content not found');
  }

  console.log(`[Ad Click] adId: ${adId}, slotId: ${slotId ?? ''}`);
  return sendSuccess(res, { tracked: true, adId, slotId: slotId || null });
}
