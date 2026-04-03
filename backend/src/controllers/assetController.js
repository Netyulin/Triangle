import path from 'node:path';
import { body } from 'express-validator';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { saveBufferToUploads } from '../utils/assetStorage.js';
import { normalizeString } from '../utils/serializers.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error('仅支持 JPG、PNG、WebP、GIF 或 SVG 图片'));
      return;
    }

    callback(null, true);
  }
});

function extensionFromMime(mimeType) {
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
    default:
      return path.extname(mimeType) || '.bin';
  }
}

function folderFromKind(kind) {
  return kind === 'app-cover' ? 'app-covers' : 'post-covers';
}

async function storeImageBuffer(buffer, mimeType, kind) {
  return saveBufferToUploads(buffer, {
    folder: folderFromKind(kind),
    extension: extensionFromMime(mimeType)
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

export async function uploadImage(req, res) {
  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择图片文件');
  }

  const kind = normalizeString(req.body.kind, 'post-cover').trim() || 'post-cover';
  const stored = await storeImageBuffer(file.buffer, file.mimetype, kind);

  return sendSuccess(res, {
    path: stored.relativePath,
    mimeType: file.mimetype,
    size: file.size
  }, 'uploaded', 201);
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
    return sendSuccess(res, {
      path: stored.relativePath,
      sourceUrl: url,
      mimeType,
      size: buffer.length
    }, 'imported', 201);
  } catch (error) {
    return sendError(res, ErrorCodes.PARAM_ERROR, error instanceof Error ? error.message : '图片抓取失败');
  }
}

