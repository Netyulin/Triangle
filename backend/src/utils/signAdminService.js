import prisma from './prisma.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { ensureSignTables } from './signTables.js';
import { deleteStoredArtifact, saveCertificateAsset, saveProfileAsset } from './signStorage.js';

function normalizeBrokenText(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (/^\?+$/.test(text)) return fallback;
  return text;
}

function inferAssetName(row) {
  const fileName = String(row.fileName || row.filename || '').trim();
  if (!fileName) return '未命名签名资产';
  if (fileName.toLowerCase().endsWith('.p12')) return `证书 · ${fileName}`;
  if (fileName.toLowerCase().endsWith('.mobileprovision')) return `描述文件 · ${fileName}`;
  return fileName;
}

function formatRow(row) {
  if (!row) return null;
  // PostgreSQL 返回的列名保留双引号内的原始大小写，但 Prisma $queryRawUnsafe 可能返回小写 key
  // 同时处理 camelCase 和 lowercase 两种情况
  return {
    id: row.id,
    ownerUserId: row.ownerUserId ?? row.owneruserid ?? null,
    scope: row.scope || 'system',
    name: normalizeBrokenText(row.name, inferAssetName(row)),
    fileName: row.fileName ?? row.filename,
    filePath: row.filePath ?? row.filepath,
    subjectCn: row.subjectCn ?? row.subjectcn ?? null,
    teamId: row.teamId ?? row.teamid ?? null,
    note: normalizeBrokenText(row.note, '') || null,
    appId: row.appId ?? row.appid ?? null,
    profileUuid: row.profileUuid ?? row.profileuuid ?? null,
    isActive: Boolean(row.isActive ?? row.isactive),
    createdAt: row.createdAt ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updatedat,
  };
}

async function setSingleActive(table, id) {
  await executeRaw(`UPDATE ${table} SET "isActive" = 0`);
  await executeRaw(`UPDATE ${table} SET "isActive" = 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`, id);
}

async function setSingleActiveForScope(table, id, scope, ownerUserId = null) {
  if (scope === 'user' && ownerUserId) {
    await executeRaw(
      `UPDATE ${table} SET "isActive" = 0 WHERE scope = 'user' AND "ownerUserId" = ?`,
      ownerUserId,
    );
    await executeRaw(
      `UPDATE ${table} SET "isActive" = 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND scope = 'user' AND "ownerUserId" = ?`,
      id,
      ownerUserId,
    );
    return;
  }

  await executeRaw(`UPDATE ${table} SET "isActive" = 0 WHERE scope = 'system' OR scope IS NULL`);
  await executeRaw(
    `UPDATE ${table} SET "isActive" = 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND (scope = 'system' OR scope IS NULL)`,
    id,
  );
}

export async function listCertificates() {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_certificates ORDER BY "isActive" DESC, id DESC');
  return rows.map((row) => formatRow(row));
}

export async function listCertificatesByOwner({ ownerUserId = null, includeSystem = false } = {}) {
  await ensureSignTables();
  if (includeSystem && ownerUserId) {
    const rows = await queryRaw(
      `
        SELECT * FROM sign_certificates
        WHERE (scope = 'user' AND "ownerUserId" = ?)
           OR scope = 'system'
           OR scope IS NULL
        ORDER BY scope ASC, "isActive" DESC, id DESC
      `,
      ownerUserId,
    );
    return rows.map((row) => formatRow(row));
  }

  if (ownerUserId) {
    const rows = await queryRaw(
      'SELECT * FROM sign_certificates WHERE scope = ? AND "ownerUserId" = ? ORDER BY "isActive" DESC, id DESC',
      'user',
      ownerUserId,
    );
    return rows.map((row) => formatRow(row));
  }

  return listCertificates();
}

export async function getActiveCertificate() {
  await ensureSignTables();
  const rows = await queryRaw(
    "SELECT * FROM sign_certificates WHERE \"isActive\" = 1 AND (scope = 'system' OR scope IS NULL) ORDER BY id DESC LIMIT 1",
  );
  return rows[0] ?? null;
}

export async function getActiveCertificateByOwner(ownerUserId) {
  await ensureSignTables();
  const rows = await queryRaw(
    "SELECT * FROM sign_certificates WHERE \"isActive\" = 1 AND scope = 'user' AND \"ownerUserId\" = ? ORDER BY id DESC LIMIT 1",
    ownerUserId,
  );
  return rows[0] ?? null;
}

export async function getCertificateById(id) {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_certificates WHERE id = ? LIMIT 1', id);
  return rows[0] ?? null;
}

export async function createCertificate({
  name,
  originalName,
  absolutePath,
  password,
  subjectCn = null,
  teamId = null,
  isActive = false,
  ownerUserId = null,
  scope = 'system',
}) {
  await ensureSignTables();
  if (isActive) {
    if (scope === 'user' && ownerUserId) {
      await executeRaw("UPDATE sign_certificates SET \"isActive\" = 0 WHERE scope = 'user' AND \"ownerUserId\" = ?", ownerUserId);
    } else {
      await executeRaw("UPDATE sign_certificates SET \"isActive\" = 0 WHERE scope = 'system' OR scope IS NULL");
    }
  }
  const rows = await queryRaw(
    `
      INSERT INTO sign_certificates ("ownerUserId", scope, name, "fileName", "filePath", password, "subjectCn", "teamId", "isActive", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `,
    ownerUserId,
    scope,
    name,
    originalName,
    absolutePath,
    password,
    subjectCn,
    teamId,
    isActive ? 1 : 0,
  );
  return formatRow(rows[0] ?? null);
}

export async function saveCertificateFile(file) {
  const stored = await saveCertificateAsset(file);
  return stored.reference;
}

export async function activateCertificate(id) {
  await ensureSignTables();
  const row = await getCertificateById(id);
  if (!row) {
    return false;
  }
  await setSingleActiveForScope('sign_certificates', id, row.scope || 'system', row.ownerUserId ?? null);
  return true;
}

export async function updateCertificatePassword(id, password) {
  await ensureSignTables();
  await executeRaw(
    'UPDATE sign_certificates SET password = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?',
    password,
    id,
  );
}

export async function deleteCertificate(id) {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_certificates WHERE id = ? LIMIT 1', id);
  const row = rows[0];
  if (!row) return null;
  await executeRaw('DELETE FROM sign_certificates WHERE id = ?', id);
  await deleteStoredArtifact(row.filePath ?? row.filepath);
  return formatRow(row);
}

export async function listProfiles() {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_profiles ORDER BY "isActive" DESC, id DESC');
  return rows.map((row) => formatRow(row));
}

export async function listProfilesByOwner({ ownerUserId = null, includeSystem = false } = {}) {
  await ensureSignTables();
  if (includeSystem && ownerUserId) {
    const rows = await queryRaw(
      `
        SELECT * FROM sign_profiles
        WHERE (scope = 'user' AND "ownerUserId" = ?)
           OR scope = 'system'
           OR scope IS NULL
        ORDER BY scope ASC, "isActive" DESC, id DESC
      `,
      ownerUserId,
    );
    return rows.map((row) => formatRow(row));
  }

  if (ownerUserId) {
    const rows = await queryRaw(
      'SELECT * FROM sign_profiles WHERE scope = ? AND "ownerUserId" = ? ORDER BY "isActive" DESC, id DESC',
      'user',
      ownerUserId,
    );
    return rows.map((row) => formatRow(row));
  }

  return listProfiles();
}

export async function getActiveProfile() {
  await ensureSignTables();
  const rows = await queryRaw(
    "SELECT * FROM sign_profiles WHERE \"isActive\" = 1 AND (scope = 'system' OR scope IS NULL) ORDER BY id DESC LIMIT 1",
  );
  return rows[0] ?? null;
}

export async function getActiveProfileByOwner(ownerUserId) {
  await ensureSignTables();
  const rows = await queryRaw(
    "SELECT * FROM sign_profiles WHERE \"isActive\" = 1 AND scope = 'user' AND \"ownerUserId\" = ? ORDER BY id DESC LIMIT 1",
    ownerUserId,
  );
  return rows[0] ?? null;
}

export async function getProfileById(id) {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_profiles WHERE id = ? LIMIT 1', id);
  return rows[0] ?? null;
}

export async function createProfile({
  name,
  originalName,
  absolutePath,
  note = '',
  appId = null,
  teamId = null,
  profileUuid = null,
  isActive = false,
  ownerUserId = null,
  scope = 'system',
}) {
  await ensureSignTables();
  if (isActive) {
    if (scope === 'user' && ownerUserId) {
      await executeRaw("UPDATE sign_profiles SET \"isActive\" = 0 WHERE scope = 'user' AND \"ownerUserId\" = ?", ownerUserId);
    } else {
      await executeRaw("UPDATE sign_profiles SET \"isActive\" = 0 WHERE scope = 'system' OR scope IS NULL");
    }
  }
  const rows = await queryRaw(
    `
      INSERT INTO sign_profiles ("ownerUserId", scope, name, "fileName", "filePath", note, "appId", "teamId", "profileUuid", "isActive", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `,
    ownerUserId,
    scope,
    name,
    originalName,
    absolutePath,
    note,
    appId,
    teamId,
    profileUuid,
    isActive ? 1 : 0,
  );
  return formatRow(rows[0] ?? null);
}

export async function saveProfileFile(file) {
  const stored = await saveProfileAsset(file);
  return stored.reference;
}

export async function activateProfile(id) {
  await ensureSignTables();
  const row = await getProfileById(id);
  if (!row) {
    return false;
  }
  await setSingleActiveForScope('sign_profiles', id, row.scope || 'system', row.ownerUserId ?? null);
  return true;
}

export async function updateProfileMeta(id, { name, note }) {
  await ensureSignTables();
  await executeRaw(
    'UPDATE sign_profiles SET name = ?, note = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?',
    name,
    note,
    id,
  );
}

export async function deleteProfile(id) {
  await ensureSignTables();
  const rows = await queryRaw('SELECT * FROM sign_profiles WHERE id = ? LIMIT 1', id);
  const row = rows[0];
  if (!row) return null;
  await executeRaw('DELETE FROM sign_profiles WHERE id = ?', id);
  await deleteStoredArtifact(row.filePath ?? row.filepath);
  return formatRow(row);
}

export async function getSigningAdminSummary() {
  const [certificate, profile] = await Promise.all([getActiveCertificate(), getActiveProfile()]);
  return {
    activeCertificate: certificate ? formatRow(certificate) : null,
    activeProfile: profile ? formatRow(profile) : null,
  };
}

export async function getSigningUserSummary(userId) {
  const [systemCertificate, systemProfile, userCertificate, userProfile] = await Promise.all([
    getActiveCertificate(),
    getActiveProfile(),
    getActiveCertificateByOwner(userId),
    getActiveProfileByOwner(userId),
  ]);

  return {
    activeCertificate: userCertificate ? formatRow(userCertificate) : systemCertificate ? formatRow(systemCertificate) : null,
    activeProfile: userProfile ? formatRow(userProfile) : systemProfile ? formatRow(systemProfile) : null,
    systemCertificate: systemCertificate ? formatRow(systemCertificate) : null,
    systemProfile: systemProfile ? formatRow(systemProfile) : null,
    userCertificate: userCertificate ? formatRow(userCertificate) : null,
    userProfile: userProfile ? formatRow(userProfile) : null,
  };
}
