import { body, param } from 'express-validator';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import {
  countAppsByCategory,
  deleteAppCategory,
  getAppCategory,
  listAppCategories,
  reorderAppCategories,
  renameAppCategory,
  upsertAppCategory
} from '../utils/appCategories.js';
import { normalizeString } from '../utils/serializers.js';

export const listValidation = validate([]);

export const createValidation = validate([
  body('name').trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid')
]);

export const updateValidation = validate([
  body('name').optional().trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('sortOrder is invalid'),
]);

export const reorderValidation = validate([
  body('names').isArray({ min: 1 }).withMessage('names is invalid')
]);

export const nameParamValidation = validate([
  param('name').trim().notEmpty().isLength({ min: 1, max: 40 }).withMessage('name is invalid')
]);

export async function list(_req, res) {
  const items = await listAppCategories({ publishedOnly: false });
  return sendSuccess(res, items);
}

export async function create(req, res) {
  const name = normalizeString(req.body?.name).trim();
  const existed = await getAppCategory(name);
  if (existed) {
    return sendError(res, ErrorCodes.APP_CATEGORY_EXISTS, 'category already exists');
  }

  const item = await upsertAppCategory(name);
  return sendSuccess(res, item, 'created', 201);
}

export async function update(req, res) {
  const currentName = normalizeString(req.params.name).trim();
  const nextName = normalizeString(req.body?.name ?? currentName).trim();
  const hasSortOrder = req.body?.sortOrder !== undefined;
  const nextSortOrder = hasSortOrder ? Number.parseInt(req.body.sortOrder, 10) : null;

  const current = await getAppCategory(currentName);
  if (!current) {
    return sendError(res, ErrorCodes.APP_CATEGORY_NOT_FOUND, 'category not found');
  }

  if (currentName !== nextName) {
    const existed = await getAppCategory(nextName);
    if (existed) {
      return sendError(res, ErrorCodes.APP_CATEGORY_EXISTS, 'category already exists');
    }
  }

  const item = await renameAppCategory(currentName, nextName);
  if (nextSortOrder !== null && Number.isFinite(nextSortOrder)) {
    await reorderAppCategories(
      (await listAppCategories({ publishedOnly: false }))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((category) => category.name)
        .filter((name) => name !== nextName)
        .toSpliced(nextSortOrder, 0, nextName)
    );
  }
  return sendSuccess(res, item, 'updated');
}

export async function reorder(req, res) {
  const names = Array.isArray(req.body?.names) ? req.body.names : [];
  const items = await reorderAppCategories(names);
  return sendSuccess(res, items, 'updated');
}

export async function remove(req, res) {
  const name = normalizeString(req.params.name).trim();
  const current = await getAppCategory(name);
  if (!current) {
    return sendError(res, ErrorCodes.APP_CATEGORY_NOT_FOUND, 'category not found');
  }

  const appCount = await countAppsByCategory(name, { publishedOnly: false });
  if (appCount > 0) {
    return sendError(res, ErrorCodes.APP_CATEGORY_IN_USE, 'category is in use');
  }

  await deleteAppCategory(name);
  return sendSuccess(res, null, 'deleted');
}
