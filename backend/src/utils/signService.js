import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import prisma from './prisma.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { ensureSignTables, isPostgresDatabase } from './signTables.js';
import { assertSigningSecrets, resolveSigningSecrets, resolveTargetedEnvValue } from './signSecrets.js';
import {
  deleteStoredArtifact,
  materializeSignInput,
  prepareTaskDirectory,
  publicUrlFromReference,
  saveManifest,
  saveSignedIpa,
  saveTaskInputIpa,
} from './signStorage.js';
import { getSigningUserSummary, listCertificatesByOwner, listProfilesByOwner } from './signAdminService.js';
import { getUserSignPermissions } from './signPermissions.js';

const runningTaskIds = new Set();
const SIGN_RETENTION_MS = 24 * 60 * 60 * 1000;

function columnName(name) {
  if (!isPostgresDatabase()) {
    return name;
  }

  return `"${name}"`;
}

function publicBaseUrl() {
  return (
    resolveTargetedEnvValue('SIGN_PUBLIC_BASE_URL')
    || process.env.PUBLIC_SITE_URL
    || `http://localhost:${process.env.PORT || 3001}`
  ).replace(/\/$/, '');
}

function formatDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function parseRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.userId,
    deviceId: row.deviceId ?? null,
    certificateId: row.certificateId ?? null,
    profileId: row.profileId ?? null,
    status: row.status,
    progress: Number(row.progress || 0),
    stage: row.stage || '等待签名',
    ipaName: row.ipaName || '',
    downloadUrl: row.downloadUrl || publicUrlFromReference(row.signedIpaPath) || null,
    installUrl: row.installUrl || null,
    errorCode: row.errorCode || null,
    errorMessage: row.errorMessage || null,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
    startedAt: formatDate(row.startedAt),
    completedAt: formatDate(row.completedAt),
    expiresAt: formatDate(row.expiresAt),
    cleanedAt: formatDate(row.cleanedAt),
  };
}

function mapSignFailure(stderr) {
  const rawMessage = String(stderr || '');
  const message = rawMessage.toLowerCase();

  if (rawMessage.includes('签名证书未配置')) {
    return {
      code: 'CERT_NOT_CONFIGURED',
      message: '签名证书未配置，请先设置可用的 .p12 证书。',
    };
  }

  if (rawMessage.includes('mobileprovision 未配置')) {
    return {
      code: 'PROFILE_NOT_CONFIGURED',
      message: '描述文件未配置，请先设置可用的 mobileprovision 文件。',
    };
  }

  if (message.includes('timed out')) {
    return {
      code: 'SIGN_TIMEOUT',
      message: '签名超时，请稍后重试，或先检查 IPA 文件大小。',
    };
  }

  if (message.includes('no such file') || message.includes('not found')) {
    return {
      code: 'ZSIGN_NOT_FOUND',
      message: '签名环境未就绪，服务器未找到 zsign 或签名文件。',
    };
  }

  if (message.includes('maximum number of devices reached') || message.includes('too many devices') || message.includes('device registration')) {
    return {
      code: 'APPLE_DEVICE_LIMIT',
      message: '开发者账号设备名额已满，请更换描述文件或证书后再试。',
    };
  }

  if (message.includes('mobileprovision') || message.includes('provision')) {
    return {
      code: 'PROFILE_INVALID',
      message: '描述文件不可用，请确认目标设备已经加入描述文件后再重新签名。',
    };
  }

  return {
    code: 'SIGN_FAILED',
    message: '签名失败，请检查证书、描述文件与 IPA 是否匹配。',
  };
}

async function updateTask(taskId, patch) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${columnName(key)} = ?`);
    values.push(value);
  }

  fields.push(`${columnName('updatedAt')} = CURRENT_TIMESTAMP`);
  values.push(taskId);

  await executeRaw(`UPDATE sign_tasks SET ${fields.join(', ')} WHERE ${columnName('id')} = ?`, ...values);
}

async function cleanupLocalFile(filePath) {
  if (!filePath) return;
  try {
    await fs.rm(filePath, { force: true, recursive: false });
  } catch {
    // ignore
  }
}

async function queryExpiredTasks() {
  if (isPostgresDatabase()) {
    return queryRaw(
      `
        SELECT ${columnName('id')} AS id,
               ${columnName('ipaPath')} AS "ipaPath",
               ${columnName('signedIpaPath')} AS "signedIpaPath",
               ${columnName('manifestPath')} AS "manifestPath"
        FROM sign_tasks
        WHERE ${columnName('cleanedAt')} IS NULL
          AND ${columnName('expiresAt')} IS NOT NULL
          AND ${columnName('expiresAt')} <= NOW()
      `,
    );
  }

  return queryRaw(
    `
      SELECT id, ipaPath, signedIpaPath, manifestPath
      FROM sign_tasks
      WHERE cleanedAt IS NULL
        AND expiresAt IS NOT NULL
        AND datetime(expiresAt) <= datetime('now')
    `,
  );
}

export async function cleanupExpiredSignArtifacts() {
  await ensureSignTables();
  const rows = await queryExpiredTasks();

  for (const row of rows) {
    await deleteStoredArtifact(row.ipaPath);
    await deleteStoredArtifact(row.signedIpaPath);
    await deleteStoredArtifact(row.manifestPath);
    await executeRaw(
      `
        UPDATE sign_tasks
        SET ${columnName('downloadUrl')} = NULL,
            ${columnName('installUrl')} = NULL,
            ${columnName('ipaPath')} = NULL,
            ${columnName('signedIpaPath')} = NULL,
            ${columnName('manifestPath')} = NULL,
            ${columnName('cleanedAt')} = CURRENT_TIMESTAMP,
            ${columnName('updatedAt')} = CURRENT_TIMESTAMP
        WHERE ${columnName('id')} = ?
      `,
      row.id,
    );
  }
}

function buildManifest({ bundleIdentifier, bundleVersion, title, ipaUrl }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${ipaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${bundleIdentifier}</string>
        <key>bundle-version</key>
        <string>${bundleVersion}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${title}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}

async function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;

      if (timedOut) {
        const error = new Error('timed out');
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      if (code !== 0) {
        const error = new Error(`command exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

export async function createSignTask({ userId, deviceId, certificateId = null, profileId = null, ipaName, ipaPath }) {
  await ensureSignTables();
  const normalizedPath = ipaPath ? String(ipaPath).trim() : null;
  const rows = await queryRaw(
    `
      INSERT INTO sign_tasks (
        ${columnName('userId')}, ${columnName('deviceId')}, ${columnName('certificateId')}, ${columnName('profileId')},
        status, progress, stage, ${columnName('ipaName')}, ${columnName('ipaPath')}, ${columnName('createdAt')}, ${columnName('updatedAt')}
      ) VALUES (?, ?, ?, ?, 'queued', 5, '等待签名', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `,
    userId,
    deviceId ?? null,
    certificateId,
    profileId,
    ipaName,
    normalizedPath,
  );

  const task = parseRow(rows[0] ?? null);
  if (!task) {
    throw new Error('签名任务创建失败');
  }

  void prepareTaskDirectory(task.id);
  return task;
}

export async function attachTaskUpload(taskId, source) {
  if (Buffer.isBuffer(source)) {
    throw new Error('attachTaskUpload 不再接受 Buffer，请先调用 saveTaskInputIpa');
  }

  await updateTask(taskId, {
    ipaPath: String(source || ''),
  });
}

export async function attachTaskUploadBuffer(taskId, originalName, buffer) {
  const stored = await saveTaskInputIpa(taskId, originalName, buffer);
  await updateTask(taskId, {
    ipaPath: stored.reference,
  });
  return stored.reference;
}

export async function listSignTasksByUser(userId) {
  await cleanupExpiredSignArtifacts();
  await ensureSignTables();
  const rows = await queryRaw(
    `SELECT * FROM sign_tasks WHERE ${columnName('userId')} = ? ORDER BY ${columnName('id')} DESC LIMIT 20`,
    userId,
  );
  return rows.map((row) => parseRow(row));
}

export async function getSignTaskById(taskId, userId) {
  await cleanupExpiredSignArtifacts();
  await ensureSignTables();
  const rows = await queryRaw(
    `SELECT * FROM sign_tasks WHERE ${columnName('id')} = ? AND ${columnName('userId')} = ? LIMIT 1`,
    taskId,
    userId,
  );
  return parseRow(rows[0] ?? null);
}

export async function executeSignTask(taskId) {
  await ensureSignTables();
  const rows = await queryRaw(`SELECT * FROM sign_tasks WHERE ${columnName('id')} = ? LIMIT 1`, taskId);
  const rawTask = rows[0];
  if (!rawTask) {
    return;
  }

  const secrets = await resolveSigningSecrets({
    certificateId: rawTask.certificateId ?? null,
    profileId: rawTask.profileId ?? null,
  });
  assertSigningSecrets(secrets);

  await updateTask(taskId, {
    status: 'running',
    progress: 15,
    stage: '准备签名环境',
    startedAt: new Date().toISOString(),
    certificateFingerprint: secrets.certificate.fingerprint,
  });

  const taskDir = await prepareTaskDirectory(taskId);
  const sourceIpaPath = await materializeSignInput(taskId, rawTask.ipaPath, rawTask.ipaName || 'upload.ipa');
  const signedIpaPath = path.join(taskDir, 'signed.ipa');

  await updateTask(taskId, {
    progress: 35,
    stage: '执行签名',
  });

  await runCommand(
    secrets.zsignBinary,
    ['-k', secrets.certificate.path, '-p', secrets.certificatePassword, '-m', secrets.mobileProvision.path, '-o', signedIpaPath, sourceIpaPath],
    secrets.timeoutMs,
  );

  await updateTask(taskId, {
    progress: 80,
    stage: '上传签名产物',
  });

  const signedStored = await saveSignedIpa(taskId, signedIpaPath);
  const ipaUrl = signedStored.publicUrl;
  if (!ipaUrl) {
    throw new Error('对象存储公开地址未配置，请先设置 OBJECT_STORAGE_PUBLIC_BASE_URL 或改用本地上传模式。');
  }
  const manifestText = buildManifest({
    bundleIdentifier: process.env.SIGN_BUNDLE_IDENTIFIER || 'com.triangle.signed',
    bundleVersion: process.env.SIGN_BUNDLE_VERSION || '1.0.0',
    title: rawTask.ipaName || '已签名应用',
    ipaUrl,
  });

  const manifestStored = await saveManifest(taskId, manifestText);
  if (!manifestStored.publicUrl) {
    throw new Error('描述文件公开地址生成失败，请检查对象存储公开域名配置。');
  }
  const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestStored.publicUrl)}`;

  await updateTask(taskId, {
    status: 'completed',
    progress: 100,
    stage: '签名完成',
    signedIpaPath: signedStored.reference,
    manifestPath: manifestStored.reference,
    downloadUrl: ipaUrl,
    installUrl,
    completedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SIGN_RETENTION_MS).toISOString(),
  });

  await cleanupLocalFile(sourceIpaPath);
  await cleanupLocalFile(signedIpaPath);
}

async function invokeRemoteSignService(taskId) {
  const serviceUrl = String(resolveTargetedEnvValue('SIGN_SERVICE_URL') || '').trim().replace(/\/$/, '');
  if (!serviceUrl) {
    return false;
  }

  const response = await fetch(`${serviceUrl}/internal/sign/tasks/${taskId}/execute`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sign-service-token': String(process.env.SIGN_SERVICE_TOKEN || '').trim(),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`远程签名服务调用失败：${response.status} ${text}`);
  }

  return true;
}

export async function queueSignTask(taskId) {
  if (runningTaskIds.has(taskId)) {
    return;
  }

  if (await invokeRemoteSignService(taskId)) {
    return;
  }

  runningTaskIds.add(taskId);

  try {
    await executeSignTask(taskId);
  } catch (error) {
    const stderr = error?.stderr || error?.message || '';
    const mapped = mapSignFailure(stderr);

    await updateTask(taskId, {
      status: 'failed',
      progress: 100,
      stage: '签名失败',
      errorCode: mapped.code,
      errorMessage: mapped.message,
      completedAt: new Date().toISOString(),
    });
  } finally {
    runningTaskIds.delete(taskId);
  }
}

export async function listDevicesByUser(userId) {
  await ensureSignTables();
  return queryRaw(
    `SELECT ${columnName('id')} AS id, udid, product, version, ${columnName('deviceName')} AS "deviceName", source,
            ${columnName('createdAt')} AS "createdAt", ${columnName('updatedAt')} AS "updatedAt"
     FROM sign_devices
     WHERE ${columnName('userId')} = ?
     ORDER BY ${columnName('id')} DESC`,
    userId,
  );
}

export async function upsertUserDevice({ userId, udid, product, version, deviceName, source = 'profile_service' }) {
  await ensureSignTables();
  const existing = await queryRaw(
    `SELECT * FROM sign_devices WHERE ${columnName('userId')} = ? AND udid = ? LIMIT 1`,
    userId,
    udid,
  );

  if (existing.length > 0) {
    await executeRaw(
      `
        UPDATE sign_devices
        SET product = ?, version = ?, ${columnName('deviceName')} = ?, source = ?, ${columnName('updatedAt')} = CURRENT_TIMESTAMP
        WHERE ${columnName('userId')} = ? AND udid = ?
      `,
      product || null,
      version || null,
      deviceName || null,
      source,
      userId,
      udid,
    );
  } else {
    await executeRaw(
      `
        INSERT INTO sign_devices (${columnName('userId')}, udid, product, version, ${columnName('deviceName')}, source, ${columnName('createdAt')}, ${columnName('updatedAt')})
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      userId,
      udid,
      product || null,
      version || null,
      deviceName || null,
      source,
    );
  }

  const rows = await queryRaw(
    `SELECT ${columnName('id')} AS id, udid, product, version, ${columnName('deviceName')} AS "deviceName", source,
            ${columnName('createdAt')} AS "createdAt", ${columnName('updatedAt')} AS "updatedAt"
     FROM sign_devices
     WHERE ${columnName('userId')} = ? AND udid = ? LIMIT 1`,
    userId,
    udid,
  );
  return rows[0] ?? null;
}

export async function saveDeviceForAdmin({ userId, deviceId = null, udid, product, version, deviceName, source = 'admin_manual' }) {
  await ensureSignTables();

  if (deviceId) {
    await executeRaw(
      `
        UPDATE sign_devices
        SET udid = ?, product = ?, version = ?, ${columnName('deviceName')} = ?, source = ?, ${columnName('updatedAt')} = CURRENT_TIMESTAMP
        WHERE ${columnName('id')} = ? AND ${columnName('userId')} = ?
      `,
      udid,
      product || null,
      version || null,
      deviceName || null,
      source,
      deviceId,
      userId,
    );

    const rows = await queryRaw(
      `SELECT ${columnName('id')} AS id, udid, product, version, ${columnName('deviceName')} AS "deviceName", source,
              ${columnName('createdAt')} AS "createdAt", ${columnName('updatedAt')} AS "updatedAt"
       FROM sign_devices
       WHERE ${columnName('id')} = ? AND ${columnName('userId')} = ? LIMIT 1`,
      deviceId,
      userId,
    );
    return rows[0] ?? null;
  }

  return upsertUserDevice({ userId, udid, product, version, deviceName, source });
}

export async function deleteDeviceForAdmin(userId, deviceId) {
  await ensureSignTables();
  const rows = await queryRaw(
    `SELECT ${columnName('id')} AS id, udid, product, version, ${columnName('deviceName')} AS "deviceName", source,
            ${columnName('createdAt')} AS "createdAt", ${columnName('updatedAt')} AS "updatedAt"
     FROM sign_devices
     WHERE ${columnName('id')} = ? AND ${columnName('userId')} = ? LIMIT 1`,
    deviceId,
    userId,
  );
  if (!rows[0]) {
    return null;
  }

  await executeRaw(`DELETE FROM sign_devices WHERE ${columnName('id')} = ? AND ${columnName('userId')} = ?`, deviceId, userId);
  return rows[0];
}

export async function getLatestPendingTaskByUser(userId) {
  await cleanupExpiredSignArtifacts();
  const rows = await queryRaw(
    `
      SELECT * FROM sign_tasks
      WHERE ${columnName('userId')} = ? AND status IN ('queued', 'running')
      ORDER BY ${columnName('id')} DESC
      LIMIT 1
    `,
    userId,
  );
  return parseRow(rows[0] ?? null);
}

export async function readTaskStatus(taskId, userId) {
  const task = await getSignTaskById(taskId, userId);
  if (!task) {
    return null;
  }

  return task;
}

export async function getSigningRuntimeSummary(user) {
  const userId = user?.id ?? null;
  const permissionInfo = user ? await getUserSignPermissions(user) : { canSign: false, canSelfSign: false };
  const summary = userId
    ? await getSigningUserSummary(userId)
    : {
        activeCertificate: null,
        activeProfile: null,
        systemCertificate: null,
        systemProfile: null,
        userCertificate: null,
        userProfile: null,
      };

  const availableCertificates = userId ? await listCertificatesByOwner({ ownerUserId: userId, includeSystem: true }) : [];
  const availableProfiles = userId ? await listProfilesByOwner({ ownerUserId: userId, includeSystem: true }) : [];
  const envCertificatePath = resolveTargetedEnvValue('SIGN_P12_PATH');
  const envProfilePath = resolveTargetedEnvValue('SIGN_MOBILEPROVISION_PATH');
  const remoteSignServiceUrl = String(resolveTargetedEnvValue('SIGN_SERVICE_URL') || '').trim();

  const fallbackCertificate = !summary.activeCertificate && envCertificatePath
    ? {
        id: 0,
        ownerUserId: null,
        scope: 'system',
        name: '环境变量证书',
        fileName: path.basename(envCertificatePath),
        isActive: true,
        createdAt: null,
        updatedAt: null,
      }
    : null;

  const fallbackProfile = !summary.activeProfile && envProfilePath
    ? {
        id: 0,
        ownerUserId: null,
        scope: 'system',
        name: '环境变量描述文件',
        fileName: path.basename(envProfilePath),
        note: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      }
    : null;

  return {
    activeCertificate: summary.activeCertificate || fallbackCertificate,
    activeProfile: summary.activeProfile || fallbackProfile,
    systemCertificate: summary.systemCertificate || fallbackCertificate,
    systemProfile: summary.systemProfile || fallbackProfile,
    userCertificate: summary.userCertificate || null,
    userProfile: summary.userProfile || null,
    availableCertificates,
    availableProfiles,
    permissions: permissionInfo,
    publicBaseUrl: publicBaseUrl(),
    useRemoteSignService: Boolean(remoteSignServiceUrl),
  };
}
