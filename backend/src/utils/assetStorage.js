import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Resolve path based on the current module file location, NOT process.cwd()
// This file is at backend/src/utils/assetStorage.js
// Go up 3 levels: backend/src/utils → backend/src → backend → project root → V3/public/uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../../Frontend/public/uploads');

console.log('[assetStorage] uploadsRoot =', uploadsRoot);

function sanitizeFolder(folder = 'misc') {
  return String(folder || 'misc')
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '') || 'misc';
}

function sanitizeExtension(extension = '.bin') {
  const normalized = extension.startsWith('.') ? extension : `.${extension}`;
  return normalized.toLowerCase().replace(/[^.a-z0-9]+/g, '') || '.bin';
}

function buildFileName(extension) {
  return `${Date.now()}-${crypto.randomUUID()}${sanitizeExtension(extension)}`;
}

export async function ensureUploadDir(folder = 'misc') {
  const safeFolder = sanitizeFolder(folder);
  const targetDir = path.join(uploadsRoot, safeFolder);
  await fs.mkdir(targetDir, { recursive: true });
  return {
    safeFolder,
    targetDir
  };
}

export async function saveBufferToUploads(buffer, options = {}) {
  const folder = options.folder || 'misc';
  const extension = options.extension || '.bin';
  const { safeFolder, targetDir } = await ensureUploadDir(folder);
  const fileName = buildFileName(extension);
  const absolutePath = path.join(targetDir, fileName);
  await fs.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath: `/uploads/${safeFolder}/${fileName}`
  };
}

export function getUploadsRoot() {
  return uploadsRoot;
}
