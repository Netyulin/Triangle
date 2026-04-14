import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteStorageReference,
  getUploadsRoot,
  isObjectStorageEnabled,
  materializeStorageReference,
  saveBufferToStorage,
  saveTextToStorage,
  storageReferenceToPublicUrl,
} from './objectStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const uploadsRoot = path.resolve(backendRoot, 'uploads', 'sign');
const assetsRoot = path.resolve(backendRoot, 'uploads', 'sign-assets');

export function getSignUploadsRoot() {
  return uploadsRoot;
}

export function getSignAssetsRoot() {
  return assetsRoot;
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function taskDirectory(taskId) {
  return path.join(uploadsRoot, `task-${taskId}`);
}

export function relativeUploadPath(absolutePath) {
  const localUploadsRoot = getUploadsRoot();
  const normalizedPath = String(absolutePath || '');
  if (!normalizedPath) return '';
  const relativePath = normalizedPath.replace(localUploadsRoot, '').replace(/\\/g, '/');
  return `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
}

export async function prepareTaskDirectory(taskId) {
  const dir = taskDirectory(taskId);
  await ensureDir(dir);
  return dir;
}

export function certificateDirectory() {
  return path.join(assetsRoot, 'certificates');
}

export function profileDirectory() {
  return path.join(assetsRoot, 'profiles');
}

export function createSafeFileName(originalName, fallbackExtension = '.ipa') {
  const extension = path.extname(originalName || '') || fallbackExtension;
  const base = path.basename(originalName || `upload${fallbackExtension}`, extension);
  const normalizedBase = base
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'upload';

  return `${normalizedBase}-${crypto.randomBytes(6).toString('hex')}${extension}`;
}

export async function saveTaskInputIpa(taskId, originalName, buffer) {
  const fileName = createSafeFileName(originalName, '.ipa');
  return saveBufferToStorage(buffer, {
    folder: `sign/tasks/${taskId}/input`,
    fileName,
    extension: '.ipa',
    contentType: 'application/octet-stream',
    isPublic: false,
  });
}

export async function saveCertificateAsset(file) {
  const fileName = createSafeFileName(file.originalname || 'certificate.p12', '.p12');
  return saveBufferToStorage(file.buffer, {
    folder: 'sign-assets/certificates',
    fileName,
    extension: '.p12',
    contentType: 'application/x-pkcs12',
    isPublic: false,
  });
}

export async function saveProfileAsset(file) {
  const fileName = createSafeFileName(file.originalname || 'profile.mobileprovision', '.mobileprovision');
  return saveBufferToStorage(file.buffer, {
    folder: 'sign-assets/profiles',
    fileName,
    extension: '.mobileprovision',
    contentType: 'application/octet-stream',
    isPublic: false,
  });
}

export async function materializeSignInput(taskId, reference, originalName = 'upload.ipa') {
  const dir = await prepareTaskDirectory(taskId);
  const targetPath = path.join(dir, createSafeFileName(originalName, '.ipa'));
  return materializeStorageReference(reference, targetPath);
}

export async function saveSignedIpa(taskId, filePath) {
  const buffer = await fs.readFile(filePath);
  const stored = await saveBufferToStorage(buffer, {
    folder: `sign/tasks/${taskId}/output`,
    fileName: 'signed.ipa',
    extension: '.ipa',
    contentType: 'application/octet-stream',
    isPublic: true,
  });

  return {
    reference: stored.reference,
    publicUrl: stored.publicUrl || stored.relativePath || storageReferenceToPublicUrl(stored.reference),
    localPath: filePath,
  };
}

export async function saveManifest(taskId, manifestText) {
  const stored = await saveTextToStorage(manifestText, {
    folder: `sign/tasks/${taskId}/output`,
    fileName: 'manifest.plist',
    extension: '.plist',
    contentType: 'application/xml',
    isPublic: true,
  });

  return {
    reference: stored.reference,
    publicUrl: stored.publicUrl || stored.relativePath || storageReferenceToPublicUrl(stored.reference),
  };
}

export async function deleteStoredArtifact(reference) {
  try {
    await deleteStorageReference(reference);
  } catch {
    // ignore cleanup failures
  }
}

export function publicUrlFromReference(reference) {
  return storageReferenceToPublicUrl(reference);
}

export function shouldServeLocalUploads() {
  return !isObjectStorageEnabled();
}

