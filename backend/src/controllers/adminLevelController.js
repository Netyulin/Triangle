import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

// 不允许删除的系统保留等级
const PROTECTED_LEVEL_KEYS = ['free'];

// ============ 验证规则 ============

const createValidation = validate([
  body('key').notEmpty().withMessage('等级 key 不能为空')
    .matches(/^[a-z][a-z0-9_-]*$/).withMessage('key 只能包含小写字母、数字、下划线和横线'),
  body('name').notEmpty().withMessage('显示名称不能为空'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('sortOrder 必须为非负整数'),
  body('publicCertLimit').optional().isInt({ min: -1 }).withMessage('publicCertLimit 必须 >= -1'),
  body('dailyDownloadLimit').optional().isInt({ min: -1 }).withMessage('dailyDownloadLimit 必须 >= -1'),
  body('rechargePrice').optional().isFloat({ min: 0 }).withMessage('rechargePrice 必须 >= 0'),
  body('rechargeBonusPercent').optional().isInt({ min: 0, max: 1000 }).withMessage('赠送比例必须在 0-1000 之间'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('color 必须是有效的十六进制颜色值'),
]);

const updateValidation = validate([
  param('key').notEmpty().withMessage('等级 key 不能为空'),
  body('name').optional().notEmpty(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('publicCertLimit').optional().isInt({ min: -1 }),
  body('dailyDownloadLimit').optional().isInt({ min: -1 }),
  body('rechargePrice').optional().isFloat({ min: 0 }),
  body('rechargeBonusPercent').optional().isInt({ min: 0, max: 1000 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('isActive').optional().isBoolean(),
]);

// ============ 控制器函数 ============

/**
 * 获取所有等级配置
 * GET /api/admin/levels
 */
export async function list(req, res) {
  const levels = await prisma.membershipLevelConfig.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });

  return sendSuccess(res, { levels });
}

/**
 * 创建新等级
 * POST /api/admin/levels
 */
export async function create(req, res) {
  const data = req.body;

  // 检查 key 是否已存在
  const existing = await prisma.membershipLevelConfig.findUnique({
    where: { key: data.key }
  });
  if (existing) {
    return res.status(400).json({ success: false, message: `等级 key "${data.key}" 已存在` });
  }

  const level = await prisma.membershipLevelConfig.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
      publicCertLimit: data.publicCertLimit ?? -1,
      dailyDownloadLimit: data.dailyDownloadLimit ?? -1,
      blockedSoftwareTypes: data.blockedSoftwareTypes || '[]',
      rechargePrice: data.rechargePrice ?? 0,
      rechargeBonusPercent: data.rechargeBonusPercent ?? 0,
      color: data.color || '#6B7280',
      icon: data.icon || 'star',
      isActive: data.isActive !== undefined ? data.isActive : true
    }
  });

  return sendSuccess(res, { level }, 201);
}

/**
 * 更新等级配置
 * PUT /api/admin/levels/:key
 */
export async function update(req, res) {
  const { key } = req.params;
  const data = req.body;

  const existing = await prisma.membershipLevelConfig.findUnique({
    where: { key }
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: '等级不存在' });
  }

  // 构建更新字段（只传入了的字段）
  const updateData = {};
  const allowedFields = [
    'name', 'description', 'sortOrder', 'publicCertLimit',
    'dailyDownloadLimit', 'blockedSoftwareTypes', 'rechargePrice',
    'rechargeBonusPercent', 'color', 'icon', 'isActive'
  ];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const level = await prisma.membershipLevelConfig.update({
    where: { key },
    data: updateData
  });

  return sendSuccess(res, { level });
}

/**
 * 删除等级
 * DELETE /api/admin/levels/:key
 */
export async function remove(req, res) {
  const { key } = req.params;

  // 检查是否是受保护的系统等级
  if (PROTECTED_LEVEL_KEYS.includes(key)) {
    return res.status(400).json({ success: false, message: `"${key}" 为系统保留等级，不允许删除` });
  }

  const existing = await prisma.membershipLevelConfig.findUnique({
    where: { key }
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: '等级不存在' });
  }

  await prisma.membershipLevelConfig.delete({
    where: { key }
  });

  return sendSuccess(res, { message: '等级已删除' });
}

export { createValidation, updateValidation };
