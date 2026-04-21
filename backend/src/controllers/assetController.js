import path from 'node:path';
import { body } from 'express-validator';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { saveBufferToUploads } from '../utils/assetStorage.js';
import { normalizeString } from '../utils/serializers.js';
import { deleteStorageReference, getUploadsRoot } from '../utils/objectStorage.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif'
]);
const ALLOWED_FILE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.heic', '.heif']);
const REMOVABLE_PREFIXES = ['app-covers/', 'post-covers/'];

function buildUnsupportedImageError() {
  const err = new Error('仅支持 JPG、PNG、WebP、GIF、SVG、HEIC 或 HEIF 图片');
  err.status = 400;
  err.code = 'UNSUPPORTED_IMAGE_TYPE';
  return err;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = normalizeString(file?.mimetype).toLowerCase();
    const extension = path.extname(normalizeString(file?.originalname)).toLowerCase();
    const mimeAllowed = ALLOWED_MIME_TYPES.has(mimeType);
    const extensionAllowed = ALLOWED_FILE_EXTENSIONS.has(extension);

    if (!mimeAllowed && !extensionAllowed) {
      callback(buildUnsupportedImageError());
      return;
    }

    callback(null, true);
  }
});

function extensionFromMime(mimeType, originalName = '') {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/svg+xml':
      return '.svg';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return path.extname(normalizeString(originalName)).toLowerCase() || '.bin';
  }
}

function folderFromKind(kind) {
  return kind === 'app-cover' ? 'app-covers' : 'post-covers';
}

async function storeImageBuffer(buffer, mimeType, kind, originalName = '') {
  return saveBufferToUploads(buffer, {
    folder: folderFromKind(kind),
    extension: extensionFromMime(mimeType, originalName)
  });
}

export const uploadImageMiddleware = upload.single('image');

export const uploadImageValidation = validate([
  body('kind').optional().isIn(['post-cover', 'app-cover']).withMessage('kind is invalid')
]);

export const importRemoteImageValidation = validate([
  body('url').trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('url is invalid'),
  body('kind').optional().isIn(['post-cover', 'app-cover']).withMessage('kind is invalid')
]);

export const removeImageValidation = validate([
  body('path').trim().notEmpty().withMessage('path is required')
]);

function toStorageReferenceFromPath(inputPath) {
  const raw = normalizeString(inputPath).trim();
  if (!raw) return null;

  const objectStorageBase = normalizeString(process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  let candidate = raw;
  try {
    if (/^https?:\/\//i.test(candidate)) {
      const url = new URL(candidate);
      if (objectStorageBase && candidate.startsWith(`${objectStorageBase}/`)) {
        const key = decodeURIComponent(candidate.slice(objectStorageBase.length + 1)).replace(/^\/+/, '');
        if (!REMOVABLE_PREFIXES.some((prefix) => key.startsWith(prefix))) return null;
        return `s3:${key}`;
      }
      candidate = decodeURIComponent(url.pathname || '');
    }
  } catch {
    // fallback to raw string handling
  }

  const noHash = candidate.split('#')[0];
  const noQuery = noHash.split('?')[0];
  const normalized = noQuery.replace(/\\/g, '/').trim();

  if (normalized.startsWith('local:') || normalized.startsWith('s3:')) {
    const value = normalized.replace(/^(local:|s3:)/, '');
    if (!REMOVABLE_PREFIXES.some((prefix) => value.includes(`/${prefix}`) || value.startsWith(prefix))) {
      return null;
    }
    return normalized;
  }

  let relative = normalized;
  if (relative.startsWith('/uploads/')) relative = relative.slice('/uploads/'.length);
  if (relative.startsWith('uploads/')) relative = relative.slice('uploads/'.length);
  relative = relative.replace(/^\/+/, '');

  if (!relative || relative.includes('..')) return null;
  if (!REMOVABLE_PREFIXES.some((prefix) => relative.startsWith(prefix))) return null;

  return `local:${path.join(getUploadsRoot(), relative)}`;
}

export async function uploadImage(req, res) {
  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择图片文件');
  }

  const kind = normalizeString(req.body.kind, 'post-cover').trim() || 'post-cover';
  const stored = await storeImageBuffer(file.buffer, file.mimetype, kind, file.originalname);

  return sendSuccess(
    res,
    {
      path: stored.relativePath,
      mimeType: file.mimetype,
      size: file.size
    },
    'uploaded',
    201
  );
}

export async function importRemoteImage(req, res) {
  const url = normalizeString(req.body.url).trim();
  const kind = normalizeString(req.body.kind, 'post-cover').trim() || 'post-cover';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TrianglePortalAssetImporter/1.0'
      }
    });

    if (!response.ok) {
      return sendError(res, ErrorCodes.PARAM_ERROR, `图片抓取失败，目标返回 ${response.status}`);
    }

    const mimeType = normalizeString(response.headers.get('content-type')).split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return sendError(res, ErrorCodes.PARAM_ERROR, '目标地址不是受支持的图片格式');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return sendError(res, ErrorCodes.PARAM_ERROR, '目标图片内容为空');
    }
    if (buffer.length > MAX_IMAGE_SIZE) {
      return sendError(res, ErrorCodes.PARAM_ERROR, '目标图片过大，请换一张 8MB 以内的图片');
    }

    const stored = await storeImageBuffer(buffer, mimeType, kind);
    return sendSuccess(
      res,
      {
        path: stored.relativePath,
        sourceUrl: url,
        mimeType,
        size: buffer.length
      },
      'imported',
      201
    );
  } catch (err) {
    return sendError(res, ErrorCodes.PARAM_ERROR, err instanceof Error ? err.message : '图片抓取失败');
  }
}

export async function removeImage(req, res) {
  const inputPath = normalizeString(req.body.path).trim();
  const reference = toStorageReferenceFromPath(inputPath);

  if (!reference) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'image path is invalid');
  }

  try {
    await deleteStorageReference(reference);
    return sendSuccess(res, { path: inputPath, deleted: true }, 'deleted');
  } catch (err) {
    return sendError(res, ErrorCodes.INTERNAL_ERROR, err instanceof Error ? err.message : 'delete image failed');
  }
}
