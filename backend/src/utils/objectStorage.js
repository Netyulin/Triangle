import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const localUploadsRoot = path.resolve(backendRoot, 'uploads');

function sanitizeSegment(value = 'misc') {
  return String(value || 'misc')
    .trim()
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '') || 'misc';
}

function normalizeExtension(extension = '.bin') {
  const value = String(extension || '.bin').trim();
  if (!value) return '.bin';
  return value.startsWith('.') ? value.toLowerCase() : `.${value.toLowerCase()}`;
}

function buildObjectKey(folder, fileName) {
  const safeFolder = sanitizeSegment(folder);
  const safeName = String(fileName || '')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `${Date.now()}-${crypto.randomUUID()}`;

  return `${safeFolder}/${safeName}`;
}

function buildRandomFileName(extension = '.bin') {
  return `${Date.now()}-${crypto.randomUUID()}${normalizeExtension(extension)}`;
}

function readStorageDriver() {
  return String(process.env.OBJECT_STORAGE_DRIVER || 'local').trim().toLowerCase();
}

function useObjectStorage() {
  return readStorageDriver() !== 'local';
}

function parseReference(reference) {
  const raw = String(reference || '').trim();
  if (!raw) {
    return null;
  }

  if (/^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('/') || raw.startsWith('\\\\')) {
    return {
      driver: 'local',
      value: raw,
    };
  }

  if (raw.startsWith('local:')) {
    return {
      driver: 'local',
      value: raw.slice('local:'.length),
    };
  }

  if (raw.startsWith('s3:')) {
    return {
      driver: 's3',
      value: raw.slice('s3:'.length),
    };
  }

  return {
    driver: useObjectStorage() ? 's3' : 'local',
    value: raw,
  };
}

function ensurePublicBaseUrl() {
  return String(process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
}

function buildLocalPublicUrl(relativePath) {
  const baseUrl = String(process.env.PUBLIC_SITE_URL || process.env.SIGN_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`)
    .trim()
    .replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production' && /^http:\/\/(localhost|127(?:\.\d{1,3}){3}|::1)(:\d+)?$/i.test(baseUrl)) {
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  }

  return `${baseUrl}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
}

let cachedS3Client = null;

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const endpoint = String(process.env.OBJECT_STORAGE_ENDPOINT || '').trim();
  const region = String(process.env.OBJECT_STORAGE_REGION || 'auto').trim();
  const accessKeyId = String(process.env.OBJECT_STORAGE_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || '').trim();

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('对象存储未配置完整，请检查 OBJECT_STORAGE_ENDPOINT、OBJECT_STORAGE_ACCESS_KEY_ID 和 OBJECT_STORAGE_SECRET_ACCESS_KEY');
  }

  cachedS3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle: String(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'true').trim().toLowerCase() === 'true',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedS3Client;
}

function getBucketName() {
  const bucket = String(process.env.OBJECT_STORAGE_BUCKET || '').trim();
  if (!bucket) {
    throw new Error('对象存储桶未配置，请检查 OBJECT_STORAGE_BUCKET');
  }
  return bucket;
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body instanceof Readable ? body : Readable.from(body)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function saveLocalBuffer(buffer, { folder, fileName, isPublic }) {
  const key = buildObjectKey(folder, fileName);
  const absolutePath = path.join(localUploadsRoot, key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  const relativePath = `/uploads/${key.replace(/\\/g, '/')}`;

  return {
    driver: 'local',
    key,
    reference: `local:${absolutePath}`,
    absolutePath,
    relativePath,
    publicUrl: isPublic ? buildLocalPublicUrl(relativePath) : null,
  };
}

async function saveS3Buffer(buffer, { folder, fileName, contentType, isPublic }) {
  const key = buildObjectKey(folder, fileName);
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    }),
  );

  const publicBaseUrl = ensurePublicBaseUrl();
  return {
    driver: 's3',
    key,
    reference: `s3:${key}`,
    absolutePath: null,
    relativePath: null,
    publicUrl: isPublic && publicBaseUrl ? `${publicBaseUrl}/${key}` : null,
  };
}

export async function saveBufferToStorage(buffer, options = {}) {
  const extension = normalizeExtension(options.extension || '.bin');
  const fileName = options.fileName || buildRandomFileName(extension);
  const folder = options.folder || 'misc';
  const isPublic = options.isPublic !== false;
  const contentType = options.contentType || 'application/octet-stream';

  if (useObjectStorage()) {
    return saveS3Buffer(buffer, { folder, fileName, contentType, isPublic });
  }

  return saveLocalBuffer(buffer, { folder, fileName, isPublic });
}

export async function saveTextToStorage(text, options = {}) {
  return saveBufferToStorage(Buffer.from(String(text || ''), options.encoding || 'utf8'), {
    ...options,
    contentType: options.contentType || 'text/plain; charset=utf-8',
  });
}

export async function readStorageReference(reference) {
  const parsed = parseReference(reference);
  if (!parsed) {
    throw new Error('无效的存储引用');
  }

  if (parsed.driver === 'local') {
    return fs.readFile(parsed.value);
  }

  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: parsed.value,
    }),
  );
  return streamToBuffer(response.Body);
}

export async function deleteStorageReference(reference) {
  const parsed = parseReference(reference);
  if (!parsed) return;

  if (parsed.driver === 'local') {
    await fs.rm(parsed.value, { force: true });
    return;
  }

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: parsed.value,
    }),
  );
}

export async function materializeStorageReference(reference, targetPath) {
  const parsed = parseReference(reference);
  if (!parsed) {
    throw new Error('无效的存储引用');
  }

  if (parsed.driver === 'local') {
    return parsed.value;
  }

  const buffer = await readStorageReference(reference);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}

export function resolvePublicUrlFromStored(record) {
  if (!record) return null;
  if (record.publicUrl) return record.publicUrl;
  if (record.relativePath) return buildLocalPublicUrl(record.relativePath);
  return null;
}

export function storageReferenceToPublicUrl(reference) {
  const parsed = parseReference(reference);
  if (!parsed) return null;

  if (parsed.driver === 'local') {
    const absolutePath = parsed.value;
    const relativePath = absolutePath.replace(localUploadsRoot, '').replace(/\\/g, '/');
    return buildLocalPublicUrl(`/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`);
  }

  const publicBaseUrl = ensurePublicBaseUrl();
  return publicBaseUrl ? `${publicBaseUrl}/${parsed.value}` : null;
}

export function getUploadsRoot() {
  return localUploadsRoot;
}

export function isObjectStorageEnabled() {
  return useObjectStorage();
}
