import { body, param } from 'express-validator';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import {
  countPostsByCategory,
  deletePostCategory,
  getPostCategory,
  listPostCategories,
  renamePostCategory,
  upsertPostCategory
} from '../utils/postCategories.js';
import { normalizeString } from '../utils/serializers.js';

export const listValidation = validate([]);

export const createValidation = validate([
  body('name').trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid')
]);

export const updateValidation = validate([
  body('name').trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid')
]);

export const nameParamValidation = validate([
  param('name').trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid')
]);

export async function list(_req, res) {
  const items = await listPostCategories({ publishedOnly: false });
  return sendSuccess(res, items);
}

export async function create(req, res) {
  const name = normalizeString(req.body?.name).trim();
  const existed = await getPostCategory(name);
  if (existed) {
    return sendError(res, ErrorCodes.APP_CATEGORY_EXISTS, 'category already exists');
  }

  const item = await upsertPostCategory(name);
  return sendSuccess(res, item, 'created', 201);
}

export async function update(req, res) {
  const currentName = normalizeString(req.params.name).trim();
  const nextName = normalizeString(req.body?.name).trim();

  const current = await getPostCategory(currentName);
  if (!current) {
    return sendError(res, ErrorCodes.APP_CATEGORY_NOT_FOUND, 'category not found');
  }

  if (currentName !== nextName) {
    const existed = await getPostCategory(nextName);
    if (existed) {
      return sendError(res, ErrorCodes.APP_CATEGORY_EXISTS, 'category already exists');
    }
  }

  const item = await renamePostCategory(currentName, nextName);
  return sendSuccess(res, item, 'updated');
}

export async function remove(req, res) {
  const name = normalizeString(req.params.name).trim();
  const current = await getPostCategory(name);
  if (!current) {
    return sendError(res, ErrorCodes.APP_CATEGORY_NOT_FOUND, 'category not found');
  }

  const postCount = await countPostsByCategory(name, { publishedOnly: false });
  if (postCount > 0) {
    return sendError(res, ErrorCodes.APP_CATEGORY_IN_USE, 'category is in use');
  }

  await deletePostCategory(name);
  return sendSuccess(res, null, 'deleted');
}
