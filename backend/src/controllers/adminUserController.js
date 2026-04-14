import bcrypt from 'bcryptjs';
import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString, serializeUser } from '../utils/serializers.js';
import { MEMBERSHIP_LEVELS, getAllowedMembershipLevels, getMembershipLevelLabel, normalizeMembershipLevel } from '../utils/membership.js';
import { getPasswordPolicyText, isStrongPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy.js';
import { getUserSignPermissions, updateUserSignPermissions } from '../utils/signPermissions.js';

const userStatuses = ['active', 'disabled', 'banned'];

export const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('search').optional().isString().withMessage('search must be a string'),
  query('status').optional().isIn(userStatuses).withMessage('status is invalid'),
  query('role').optional().isString().withMessage('role must be a string'),
  query('membershipLevel').optional().isString().withMessage('membershipLevel must be a string')
]);

export const updateValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('status').optional().isIn(userStatuses).withMessage('status is invalid'),
  body('membershipLevel')
    .optional()
    .isIn(['free', 'sponsor', 'lifetime', 'supreme', 'member', 'premium', 'vip'])
    .withMessage('membershipLevel is invalid'),
  body('canComment').optional().isBoolean().withMessage('canComment must be a boolean'),
  body('canReply').optional().isBoolean().withMessage('canReply must be a boolean'),
  body('canSubmitRequest').optional().isBoolean().withMessage('canSubmitRequest must be a boolean'),
  body('canSign').optional().isBoolean().withMessage('canSign must be a boolean'),
  body('canSelfSign').optional().isBoolean().withMessage('canSelfSign must be a boolean'),
  body('banDays').optional().isInt({ min: 1, max: 3650 }).withMessage('banDays is invalid'),
  body('banReason').optional().isString().withMessage('banReason must be a string')
]);

async function serializeAdminUser(user) {
  const signPermissions = await getUserSignPermissions(user);
  return serializeUser({
    ...user,
    canSign: signPermissions.canSign,
    canSelfSign: signPermissions.canSelfSign,
  });
}

export const passwordValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(getPasswordPolicyText())
    .custom((value) => isStrongPassword(value))
    .withMessage(getPasswordPolicyText())
]);

export const deleteValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')
]);

function buildWhere(queryArgs = {}) {
  const where = {};
  const search = normalizeString(queryArgs.search).trim();
  if (search) {
    where.OR = [
      { username: { contains: search } },
      { email: { contains: search } },
      { name: { contains: search } },
      { phone: { contains: search } }
    ];
  }

  if (queryArgs.status) {
    where.status = normalizeString(queryArgs.status).trim();
  }

  if (queryArgs.role) {
    where.role = normalizeString(queryArgs.role).trim();
  }

  if (queryArgs.membershipLevel) {
    where.membershipLevel = normalizeMembershipLevel(queryArgs.membershipLevel);
  }

  return where;
}

export async function list(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = buildWhere(req.query);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.user.count({ where })
  ]);

  return sendSuccess(res, {
    list: await Promise.all(items.map((item) => serializeAdminUser(item))),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function update(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.user.findUnique({
    where: { id }
  });

  if (!current) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const nextStatus = req.body.status ? normalizeString(req.body.status).trim() : current.status;
  const nextMembershipLevel = req.body.membershipLevel ? normalizeMembershipLevel(req.body.membershipLevel) : normalizeMembershipLevel(current.membershipLevel);
  const nextBanDays = req.body.banDays !== undefined ? normalizeInteger(req.body.banDays, 0) : 0;
  const nextBanReason = req.body.banReason !== undefined ? normalizeString(req.body.banReason).trim() : current.banReason;

  const nextBannedUntil =
    nextStatus === 'banned' && nextBanDays > 0
      ? new Date(Date.now() + nextBanDays * 24 * 60 * 60 * 1000)
      : nextStatus === 'banned'
        ? current.bannedUntil
        : null;

  const user = await prisma.user.update({
    where: { id },
    data: {
      status: nextStatus,
      membershipLevel: nextMembershipLevel,
      canComment: req.body.canComment !== undefined ? req.body.canComment === true || req.body.canComment === 'true' : current.canComment,
      canReply: req.body.canReply !== undefined ? req.body.canReply === true || req.body.canReply === 'true' : current.canReply,
      canSubmitRequest:
        req.body.canSubmitRequest !== undefined ? req.body.canSubmitRequest === true || req.body.canSubmitRequest === 'true' : current.canSubmitRequest,
      bannedUntil: nextBannedUntil,
      banReason: nextStatus === 'banned' ? nextBanReason || current.banReason || null : null
    }
  });

  if (req.body.canSign !== undefined || req.body.canSelfSign !== undefined) {
    const signPermissions = await getUserSignPermissions({
      ...user,
      membershipLevel: nextMembershipLevel,
    });

    await updateUserSignPermissions(user.id, {
      canSign: req.body.canSign !== undefined ? req.body.canSign === true || req.body.canSign === 'true' : signPermissions.canSign,
      canSelfSign:
        req.body.canSelfSign !== undefined ? req.body.canSelfSign === true || req.body.canSelfSign === 'true' : signPermissions.canSelfSign,
    });
  }

  const latest = await prisma.user.findUnique({ where: { id } });
  return sendSuccess(res, await serializeAdminUser(latest), 'updated');
}

export async function updatePassword(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.user.findUnique({
    where: { id }
  });

  if (!current) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const hashed = await bcrypt.hash(normalizeString(req.body.password), 10);
  const user = await prisma.user.update({
    where: { id },
    data: {
      password: hashed
    }
  });

  return sendSuccess(res, await serializeAdminUser(user), 'updated');
}

export async function remove(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.user.findUnique({
    where: { id }
  });

  if (!current) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  await prisma.user.delete({
    where: { id }
  });

  return sendSuccess(res, null, 'deleted');
}

export async function levels(_req, res) {
  return sendSuccess(
    res,
    MEMBERSHIP_LEVELS.map((level) => ({
      value: level,
      label: getMembershipLevelLabel(level)
    }))
  );
}
