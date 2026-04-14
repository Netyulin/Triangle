import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, getSignUploadsRoot } from './signStorage.js';
import { materializeStorageReference, readStorageReference } from './objectStorage.js';
import { getActiveCertificate, getActiveProfile, getCertificateById, getProfileById } from './signAdminService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cacheDir = path.resolve(path.dirname(getSignUploadsRoot()), '.sign-secrets');

function decodeBase64(value) {
  return Buffer.from(value, 'base64');
}

function fingerprint(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function normalizeRuntimeTarget(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();

  if (!value) {
    return 'LOCAL';
  }

  if (['local', 'dev', 'development'].includes(value)) {
    return 'LOCAL';
  }

  if (['prod', 'production', 'remote'].includes(value)) {
    return 'PRODUCTION';
  }

  if (value === 'staging') {
    return 'STAGING';
  }

  if (value === 'test') {
    return 'TEST';
  }

  return value.toUpperCase();
}

export function resolveRuntimeTarget() {
  return normalizeRuntimeTarget(
    process.env.SIGN_RUNTIME_TARGET
      || process.env.RUNTIME_TARGET
      || process.env.DATABASE_TARGET
      || process.env.NODE_ENV
      || 'local',
  );
}

export function resolveTargetedEnvValue(name, fallback = '') {
  const directValue = process.env[name];
  if (typeof directValue === 'string' && directValue.trim()) {
    return directValue;
  }

  const targetName = `${name}_${resolveRuntimeTarget()}`;
  const targetValue = process.env[targetName];
  if (typeof targetValue === 'string' && targetValue.trim()) {
    return targetValue;
  }

  return fallback;
}

async function materializeSecret(name, filePath, base64Value, fallbackExt) {
  if (filePath) {
    const targetPath = path.join(cacheDir, `${name}-${crypto.randomUUID()}${fallbackExt}`);
    const absolutePath = filePath.startsWith('local:') || filePath.startsWith('s3:')
      ? await materializeStorageReference(filePath, targetPath)
      : path.isAbsolute(filePath)
        ? filePath
        : path.resolve(path.dirname(__dirname), '..', filePath);
    return {
      path: absolutePath,
      fingerprint: absolutePath
    };
  }

  if (!base64Value) {
    return null;
  }

  const buffer = decodeBase64(base64Value);
  const hash = fingerprint(buffer);
  await ensureDir(cacheDir);
  const absolutePath = path.join(cacheDir, `${name}-${hash}${fallbackExt}`);
  await fs.writeFile(absolutePath, buffer);
  return {
    path: absolutePath,
    fingerprint: hash
  };
}

async function readSecretBuffer(filePath, base64Value) {
  if (filePath) {
    if (filePath.startsWith('local:') || filePath.startsWith('s3:')) {
      return readStorageReference(filePath);
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(path.dirname(__dirname), '..', filePath);
    return fs.readFile(absolutePath);
  }

  if (!base64Value) {
    return null;
  }

  return decodeBase64(base64Value);
}

export async function resolveSigningSecrets(options = {}) {
  const selectedCertificate = options.certificateId ? await getCertificateById(options.certificateId) : null;
  const selectedProfile = options.profileId ? await getProfileById(options.profileId) : null;
  const [activeCertificate, activeProfile] = await Promise.all([
    selectedCertificate ? Promise.resolve(selectedCertificate) : getActiveCertificate(),
    selectedProfile ? Promise.resolve(selectedProfile) : getActiveProfile(),
  ]);
  const envCertificatePath = resolveTargetedEnvValue('SIGN_P12_PATH');
  const envCertificateBase64 = resolveTargetedEnvValue('SIGN_P12_BASE64');
  const envProfilePath = resolveTargetedEnvValue('SIGN_MOBILEPROVISION_PATH');
  const envProfileBase64 = resolveTargetedEnvValue('SIGN_MOBILEPROVISION_BASE64');
  const envCertificatePassword = resolveTargetedEnvValue('SIGN_P12_PASSWORD');
  const envZsignBinary = resolveTargetedEnvValue('SIGN_ZSIGN_BIN', 'zsign');
  const envTimeoutMs = Number(resolveTargetedEnvValue('SIGN_TIMEOUT_MS', String(10 * 60 * 1000)));

  const certificate = await materializeSecret(
    'certificate',
    activeCertificate?.filePath || envCertificatePath,
    envCertificateBase64,
    '.p12',
  );

  const mobileProvision = await materializeSecret(
    'mobileprovision',
    activeProfile?.filePath || envProfilePath,
    envProfileBase64,
    '.mobileprovision',
  );

  return {
    certificate,
    certificateBuffer: await readSecretBuffer(activeCertificate?.filePath || envCertificatePath, envCertificateBase64),
    mobileProvision,
    mobileProvisionBuffer: await readSecretBuffer(
      activeProfile?.filePath || envProfilePath,
      envProfileBase64,
    ),
    certificatePassword: activeCertificate?.password || envCertificatePassword || '',
    zsignBinary: envZsignBinary || 'zsign',
    timeoutMs: envTimeoutMs,
    activeCertificate,
    activeProfile,
  };
}

export function assertSigningSecrets(secrets) {
  if (!secrets.certificate?.path) {
    throw new Error('签名证书未配置，请先设置 SIGN_P12_PATH 或 SIGN_P12_BASE64');
  }

  if (!secrets.mobileProvision?.path) {
    throw new Error('mobileprovision 未配置，请先设置 SIGN_MOBILEPROVISION_PATH 或 SIGN_MOBILEPROVISION_BASE64');
  }
}
