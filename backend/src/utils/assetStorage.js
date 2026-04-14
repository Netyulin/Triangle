import { getUploadsRoot as getLocalUploadsRoot, saveBufferToStorage } from './objectStorage.js';

function sanitizeFolder(folder = 'misc') {
  return String(folder || 'misc')
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '') || 'misc';
}

function sanitizeExtension(extension = '.bin') {
  const normalized = String(extension || '.bin').trim();
  if (!normalized) return '.bin';
  return normalized.startsWith('.') ? normalized.toLowerCase() : `.${normalized.toLowerCase()}`;
}

export async function ensureUploadDir(folder = 'misc') {
  const safeFolder = sanitizeFolder(folder);
  return {
    safeFolder,
    targetDir: getUploadsRoot(),
  };
}

export async function saveBufferToUploads(buffer, options = {}) {
  const folder = options.folder || 'misc';
  const extension = options.extension || '.bin';

  const stored = await saveBufferToStorage(buffer, {
    folder,
    extension: sanitizeExtension(extension),
    contentType: options.contentType || 'application/octet-stream',
    isPublic: true,
  });

  return {
    absolutePath: stored.absolutePath,
    relativePath: stored.publicUrl || stored.relativePath,
    publicUrl: stored.publicUrl || stored.relativePath,
    storageReference: stored.reference,
  };
}

export function getUploadsRoot() {
  return getLocalUploadsRoot();
}
