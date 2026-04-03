import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { generateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { serializeUser, serializeUserPermissions, normalizeString } from '../utils/serializers.js';
import {
  buildDefaultAvatar,
  ensureUserFeatureTables,
  isGeneratedAvatar,
  listFavoriteRows,
  listRechargeRecords,
  normalizeGender
} from '../utils/userFeatures.js';
import { readSiteSettings } from '../utils/siteSettings.js';
import { consumeInviteCode } from '../utils/inviteCodes.js';
import { getPasswordPolicyText, isStrongPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy.js';

export const loginValidation = validate([
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').notEmpty().withMessage('password is required')
]);

export const registerValidation = validate([
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('username must be between 3 and 30 characters'),
  body('email').trim().isEmail().withMessage('email must be valid'),
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(getPasswordPolicyText())
    .custom((value) => isStrongPassword(value))
    .withMessage(getPasswordPolicyText()),
  body('gender').isIn(['male', 'female', 'other']).withMessage('gender must be male, female, or other'),
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('name is invalid'),
  body('phone').optional().trim().isMobilePhone('zh-CN').withMessage('phone must be a valid mainland China mobile number'),
  body('inviteCode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 32 })
    .withMessage('inviteCode is invalid')
]);

export const updateProfileValidation = validate([
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('name is invalid'),
  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(['male', 'female', 'other'])
    .withMessage('gender must be male, female, or other'),
  body('avatar')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:image/') ||
        value.startsWith('/avatars/default/') ||
        value.startsWith('/avatars/defaults/')
      ) {
        return true;
      }
      throw new Error('avatar must be a valid image');
    }),
  body('currentPassword')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage('currentPassword is invalid'),
  body('newPassword')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(getPasswordPolicyText())
    .custom((value) => isStrongPassword(value))
    .withMessage(getPasswordPolicyText())
]);

export const rechargeValidation = validate([
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0')
]);

export const favoriteValidation = validate([
  body('contentType').isIn(['app', 'post']).withMessage('contentType must be app or post'),
  body('contentId').trim().notEmpty().withMessage('contentId is required')
]);

function buildAuthPayload(user) {
  return {
    user: serializeUser(user),
    permissions: serializeUserPermissions(user)
  };
}

async function loadFavoriteCollections(userId) {
  const favoriteRows = await listFavoriteRows(userId);
  const appSlugs = favoriteRows.filter((item) => item.contentType === 'app').map((item) => item.contentId);
  const postSlugs = favoriteRows.filter((item) => item.contentType === 'post').map((item) => item.contentId);

  const [apps, posts] = await Promise.all([
    appSlugs.length
      ? prisma.app.findMany({
          where: { slug: { in: appSlugs } },
          orderBy: { createdAt: 'desc' }
        })
      : Promise.resolve([]),
    postSlugs.length
      ? prisma.post.findMany({
          where: { slug: { in: postSlugs } },
          orderBy: { createdAt: 'desc' }
        })
      : Promise.resolve([])
  ]);

  return {
    apps,
    posts
  };
}

export async function register(req, res) {
  const username = normalizeString(req.body.username).trim();
  const email = normalizeString(req.body.email).trim().toLowerCase();
  const password = normalizeString(req.body.password);
  const inviteCode = normalizeString(req.body.inviteCode).trim().toUpperCase();
  const gender = normalizeGender(req.body.gender);
  const siteSettings = await readSiteSettings();

  if (!siteSettings.registrationEnabled) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'registration is disabled');
  }

  if (siteSettings.registrationRequiresInvite && !inviteCode) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'invite code is required');
  }

  const existed = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    }
  });

  if (existed) {
    return sendError(res, ErrorCodes.USER_EXISTS, 'username or email already exists');
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 10),
      name: req.body.name ? normalizeString(req.body.name).trim() : username,
      avatar: buildDefaultAvatar(username, gender),
      gender,
      phone: req.body.phone ? normalizeString(req.body.phone).trim() : null,
      role: 'reader',
      status: 'active',
      membershipLevel: 'free',
      downloadQuotaDaily: 3,
      downloadCountDaily: 0,
      canComment: true,
      canSubmitRequest: true
    }
  });

  if (siteSettings.registrationRequiresInvite) {
    const consumed = await consumeInviteCode(inviteCode, user);
    if (!consumed) {
      await prisma.user.delete({ where: { id: user.id } });
      return sendError(res, ErrorCodes.PARAM_ERROR, 'invite code is invalid or already used');
    }
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  });

  return sendSuccess(
    res,
    {
      token,
      ...buildAuthPayload(user)
    },
    'register success',
    201
  );
}

export async function login(req, res) {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'invalid username or password');
  }

  if (user.status && user.status !== 'active') {
    return sendError(res, ErrorCodes.FORBIDDEN, 'account is disabled');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return sendError(res, ErrorCodes.PASSWORD_ERROR, 'invalid username or password');
  }

  const nextUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const token = generateToken({
    id: nextUser.id,
    username: nextUser.username,
    name: nextUser.name,
    role: nextUser.role
  });

  return sendSuccess(
    res,
    {
      token,
      ...buildAuthPayload(nextUser)
    },
    'login success'
  );
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  return sendSuccess(res, buildAuthPayload(user));
}

export async function permissions(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  return sendSuccess(res, serializeUserPermissions(user));
}

export async function profile(req, res) {
  await ensureUserFeatureTables();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const [requests, comments, favorites, rechargeRecords] = await Promise.all([
    prisma.softwareRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    }),
    loadFavoriteCollections(user.id),
    listRechargeRecords(user.id)
  ]);

  return sendSuccess(res, {
    ...buildAuthPayload(user),
    requests,
    comments,
    favorites,
    rechargeRecords: rechargeRecords.map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      status: item.status,
      description: item.description ?? '',
      createdAt: item.createdAt
    }))
  });
}

export async function updateProfile(req, res) {
  const current = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!current) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const nextName = req.body.name !== undefined ? normalizeString(req.body.name).trim() : current.name;
  const currentGender = normalizeGender(current.gender);
  const nextGender = req.body.gender !== undefined ? normalizeGender(req.body.gender) : currentGender;

  let nextAvatar = '';
  if (req.body.avatar !== undefined) {
    nextAvatar = normalizeString(req.body.avatar).trim() || buildDefaultAvatar(current.username, nextGender);
  } else if (isGeneratedAvatar(current.avatar) && currentGender !== nextGender) {
    nextAvatar = buildDefaultAvatar(current.username, nextGender);
  } else {
    nextAvatar = current.avatar || buildDefaultAvatar(current.username, nextGender);
  }

  const currentPassword = normalizeString(req.body.currentPassword);
  const newPassword = normalizeString(req.body.newPassword);

  if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'currentPassword and newPassword are required together');
  }

  let password = undefined;
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, current.password);
    if (!valid) {
      return sendError(res, ErrorCodes.PASSWORD_ERROR, 'current password is incorrect');
    }
    password = await bcrypt.hash(newPassword, 10);
  }

  const user = await prisma.user.update({
    where: { id: current.id },
    data: {
      name: nextName,
      gender: nextGender,
      avatar: nextAvatar,
      ...(password ? { password } : {})
    }
  });

  return sendSuccess(res, buildAuthPayload(user), 'profile updated');
}

export async function createRecharge(req, res) {
  await ensureUserFeatureTables();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const amount = Number(req.body.amount);
  await prisma.$executeRawUnsafe(
    'INSERT INTO recharge_records (userId, amount, status, description, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
    user.id,
    amount,
    'completed',
    `余额充值 ¥${amount.toFixed(2)}`
  );

  const rechargeRecords = await listRechargeRecords(user.id);
  return sendSuccess(
    res,
    rechargeRecords.map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      status: item.status,
      description: item.description ?? '',
      createdAt: item.createdAt
    })),
    'recharge created',
    201
  );
}

export async function listFavorites(req, res) {
  await ensureUserFeatureTables();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const favorites = await loadFavoriteCollections(user.id);
  return sendSuccess(res, favorites);
}

export async function toggleFavorite(req, res) {
  await ensureUserFeatureTables();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const contentType = normalizeString(req.body.contentType).trim();
  const contentId = normalizeString(req.body.contentId).trim();

  if (contentType === 'app') {
    const app = await prisma.app.findUnique({ where: { slug: contentId }, select: { slug: true } });
    if (!app) {
      return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
    }
  } else {
    const post = await prisma.post.findUnique({ where: { slug: contentId }, select: { slug: true } });
    if (!post) {
      return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
    }
  }

  const existed = await prisma.$queryRawUnsafe(
    'SELECT contentId FROM favorites WHERE userId = ? AND contentType = ? AND contentId = ? LIMIT 1',
    user.id,
    contentType,
    contentId
  );

  let favorited = false;
  if (existed.length > 0) {
    await prisma.$executeRawUnsafe(
      'DELETE FROM favorites WHERE userId = ? AND contentType = ? AND contentId = ?',
      user.id,
      contentType,
      contentId
    );
  } else {
    await prisma.$executeRawUnsafe(
      'INSERT INTO favorites (userId, contentType, contentId, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      user.id,
      contentType,
      contentId
    );
    favorited = true;
  }

  return sendSuccess(res, { favorited }, favorited ? 'favorited' : 'unfavorited');
}
