import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';

const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('type').optional().isIn(['banner', 'insertion', 'native', 'splash']).withMessage('type is invalid'),
  query('position').optional().isIn(['top', 'bottom', 'sidebar', 'infeed']).withMessage('position is invalid'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]);

const createValidation = validate([
  body('name').trim().notEmpty().withMessage('name is required'),
  body('type').isIn(['banner', 'insertion', 'native', 'splash']).withMessage('type is invalid'),
  body('position').isIn(['top', 'bottom', 'sidebar', 'infeed']).withMessage('position is invalid'),
  body('width').isInt({ min: 1 }).withMessage('width must be a positive integer'),
  body('height').isInt({ min: 1 }).withMessage('height must be a positive integer'),
  body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('theme is invalid')
]);

const updateValidation = validate([
  body('name').optional().trim().notEmpty().withMessage('name is required'),
  body('type').optional().isIn(['banner', 'insertion', 'native', 'splash']).withMessage('type is invalid'),
  body('position').optional().isIn(['top', 'bottom', 'sidebar', 'infeed']).withMessage('position is invalid'),
  body('width').optional().isInt({ min: 1 }).withMessage('width must be a positive integer'),
  body('height').optional().isInt({ min: 1 }).withMessage('height must be a positive integer'),
  body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('theme is invalid'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]);

const adContentValidation = validate([
  param('slotId')
    .trim()
    .notEmpty()
    .withMessage('slotId is required')
]);

const clickValidation = validate([
  body('adId').trim().notEmpty().withMessage('adId is required'),
  body('slotId').optional().trim()
]);

const slotIdValidation = validate([param('slotId').trim().notEmpty().withMessage('slotId is required')]);
const slotSlugValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);

export { listValidation, createValidation, updateValidation, adContentValidation, clickValidation, slotIdValidation, slotSlugValidation };

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
    include: { adContents: { where: { isActive: true }, orderBy: { priority: 'desc' } } }
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
  console.log('[DEBUG] getAdContent called, params:', req.params, 'query:', req.query, 'body:', req.body);
  const slot = await prisma.adSlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad slot not found');
  }

  const contents = await prisma.adContent.findMany({
    where: { slotId: req.params.slotId, isActive: true },
    orderBy: { priority: 'desc' }
  });

  if (contents.length === 0) {
    return sendSuccess(res, null);
  }

  const randomIndex = Math.floor(Math.random() * contents.length);
  return sendSuccess(res, contents[randomIndex]);
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

export async function trackClick(req, res) {
  const { adId, slotId } = req.body;

  const content = await prisma.adContent.findUnique({ where: { id: adId } });
  if (!content) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'ad content not found');
  }

  console.log(`[Ad Click] adId: ${adId}, slotId: ${slotId}`);

  return sendSuccess(res, { tracked: true });
}
