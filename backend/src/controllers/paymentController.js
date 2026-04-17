import { body, param } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { getMembershipLevelRank, normalizeMembershipLevel } from '../utils/membership.js';
import { normalizeString, serializeUser } from '../utils/serializers.js';

const createOrderValidation = validate([
  body('amount').isFloat({ min: 0.01 }).withMessage('充值金额必须大于 0'),
  body('paymentMethod').isIn(['wechat', 'alipay']).withMessage('支付方式必须是 wechat 或 alipay'),
  body('targetLevelKey').optional().isString().withMessage('目标等级 key 必须是字符串')
]);

const orderNoParamValidation = validate([
  param('orderNo').notEmpty().withMessage('订单号不能为空')
]);

const upgradeMembershipValidation = validate([
  body('targetLevelKey').trim().notEmpty().withMessage('目标等级 key 不能为空')
]);

function generateOrderNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TR${timestamp}${random}`;
}

async function findLevelConfig(levelKey) {
  const normalizedKey = normalizeString(levelKey).trim();
  if (!normalizedKey) {
    return null;
  }

  return prisma.membershipLevelConfig.findUnique({
    where: { key: normalizedKey }
  });
}

export async function createOrder(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, '请先登录');
  }

  const { amount, paymentMethod, targetLevelKey } = req.body;
  let finalAmount = Number.parseFloat(amount);
  let bonusPercent = 0;
  let bonusAmount = 0;

  if (targetLevelKey) {
    const levelConfig = await findLevelConfig(targetLevelKey);
    if (!levelConfig) {
      return sendError(res, ErrorCodes.PARAM_ERROR, `目标等级 "${targetLevelKey}" 不存在`);
    }

    const configuredPrice = Number(levelConfig.rechargePrice ?? 0);
    if (configuredPrice > 0) {
      finalAmount = configuredPrice;
    }
    bonusPercent = Number(levelConfig.rechargeBonusPercent ?? 0);
  }

  if (bonusPercent > 0) {
    bonusAmount = Math.round((finalAmount * bonusPercent) / 100 * 100) / 100;
  }

  const totalAmount = Number((finalAmount + bonusAmount).toFixed(2));

  const order = await prisma.order.create({
    data: {
      userId,
      orderNo: generateOrderNo(),
      amount: finalAmount,
      bonusAmount,
      totalAmount,
      targetLevelKey: targetLevelKey ? normalizeString(targetLevelKey).trim() : null,
      paymentMethod,
      paymentStatus: 'pending'
    }
  });

  return sendSuccess(res, { order }, 'created', 201);
}

export async function wechatWebhook(req, res) {
  console.log('[Payment] 微信支付回调收到（占位）', req.body);
  return res.json({ code: 'SUCCESS', message: '成功' });
}

export async function alipayWebhook(req, res) {
  console.log('[Payment] 支付宝回调收到（占位）', req.body);
  return res.json({ success: true });
}

export async function getOrders(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, '请先登录');
  }

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return sendSuccess(res, { orders });
}

export async function cancelOrder(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, '请先登录');
  }

  const { orderNo } = req.params;
  const order = await prisma.order.findFirst({
    where: { orderNo, userId }
  });

  if (!order) {
    return sendError(res, ErrorCodes.NOT_FOUND, '订单不存在');
  }

  if (order.paymentStatus !== 'pending') {
    return sendError(res, ErrorCodes.PARAM_ERROR, '只有待支付的订单可以取消');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'cancelled' }
  });

  return sendSuccess(res, { order: updatedOrder });
}

export async function getBalance(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, '请先登录');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      membershipLevel: true
    }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  return sendSuccess(res, {
    balance: Number(user.balance ?? 0),
    membershipLevel: normalizeMembershipLevel(user.membershipLevel)
  });
}

export async function getMembershipLevels(_req, res) {
  const levels = await prisma.membershipLevelConfig.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });

  return sendSuccess(res, {
    levels: levels.map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      description: item.description ?? null,
      sortOrder: item.sortOrder,
      publicCertLimit: item.publicCertLimit,
      dailyDownloadLimit: item.dailyDownloadLimit,
      blockedSoftwareTypes: item.blockedSoftwareTypes,
      rechargePrice: Number(item.rechargePrice ?? 0),
      rechargeBonusPercent: item.rechargeBonusPercent,
      color: item.color,
      icon: item.icon,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  });
}

export async function upgradeMembership(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, '请先登录');
  }

  const targetLevelKey = normalizeString(req.body.targetLevelKey).trim();
  const levelConfig = await prisma.membershipLevelConfig.findUnique({
    where: { key: targetLevelKey }
  });

  if (!levelConfig || !levelConfig.isActive) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '目标会员等级不存在或已下线');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!currentUser) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  const currentLevel = normalizeMembershipLevel(currentUser.membershipLevel);
  const currentLevelConfig = await prisma.membershipLevelConfig.findUnique({
    where: { key: currentLevel }
  });

  if (currentLevelConfig) {
    const currentSortOrder = Number(currentLevelConfig.sortOrder ?? 0);
    const targetSortOrder = Number(levelConfig.sortOrder ?? 0);
    if (targetSortOrder <= currentSortOrder) {
      return sendError(res, ErrorCodes.PARAM_ERROR, '目标等级不能低于或等于当前等级');
    }
  } else {
    const currentRank = getMembershipLevelRank(currentLevel);
    const targetRank = getMembershipLevelRank(targetLevelKey);
    if (targetRank <= currentRank) {
      return sendError(res, ErrorCodes.PARAM_ERROR, '目标等级不能低于或等于当前等级');
    }
  }

  const upgradeFee = Number(levelConfig.rechargePrice ?? 0);
  const balance = Number(currentUser.balance ?? 0);
  if (balance < upgradeFee) {
    return sendError(res, ErrorCodes.FORBIDDEN, '余额不足，请先充值');
  }

  const nextBalance = Number((balance - upgradeFee).toFixed(2));
  const upgradedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        membershipLevel: targetLevelKey,
        balance: nextBalance,
        membershipExpireAt: null
      }
    });

    await tx.transaction.create({
      data: {
        userId,
        type: 'consume',
        amount: upgradeFee,
        balanceAfter: nextBalance,
        description: `会员升级至 ${levelConfig.name}`,
        relatedId: levelConfig.key
      }
    });

    return updated;
  });

  return sendSuccess(
    res,
    {
      user: serializeUser(upgradedUser),
      balance: nextBalance,
      membershipLevel: targetLevelKey,
      membershipLevelLabel: levelConfig.name,
      upgradeFee
    },
    '会员升级成功'
  );
}

export {
  createOrderValidation,
  orderNoParamValidation,
  upgradeMembershipValidation
};
