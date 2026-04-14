import path from 'node:path';
import multer from 'multer';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { normalizeInteger, normalizeString } from '../utils/serializers.js';
import {
  attachTaskUploadBuffer,
  createSignTask,
  deleteDeviceForAdmin,
  getLatestPendingTaskByUser,
  getSigningRuntimeSummary,
  getSignTaskById,
  listDevicesByUser,
  listSignTasksByUser,
  queueSignTask,
  readTaskStatus,
  saveDeviceForAdmin,
  upsertUserDevice,
} from '../utils/signService.js';
import {
  activateCertificate,
  activateProfile,
  createCertificate,
  createProfile,
  deleteCertificate,
  deleteProfile,
  getCertificateById,
  getProfileById,
  getSigningAdminSummary,
  listCertificates,
  listCertificatesByOwner,
  listProfiles,
  listProfilesByOwner,
  saveCertificateFile,
  saveProfileFile,
  updateCertificatePassword,
  updateProfileMeta,
} from '../utils/signAdminService.js';
import { getUserSignPermissions } from '../utils/signPermissions.js';
import { validateCertificateProfilePair } from '../utils/signAssetValidator.js';

const MAX_IPA_SIZE = Number(process.env.SIGN_MAX_IPA_BYTES || 1024 * 1024 * 1024);
const MAX_CERT_SIZE = 10 * 1024 * 1024;
const MAX_PROFILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IPA_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.ipa' && file.mimetype !== 'application/octet-stream' && file.mimetype !== 'application/zip') {
      callback(new Error('仅支持上传 IPA 安装包'));
      return;
    }

    callback(null, true);
  },
});

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CERT_SIZE },
}).single('certificate');

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_SIZE },
}).single('profile');

const bundleUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(MAX_CERT_SIZE, MAX_PROFILE_SIZE),
  },
}).fields([
  { name: 'certificate', maxCount: 1 },
  { name: 'profile', maxCount: 1 },
]);

export const uploadSignIpaMiddleware = upload.single('ipa');

export const upsertDeviceValidation = validate([
  body('udid').trim().isLength({ min: 8, max: 128 }).withMessage('UDID 无效'),
  body('product').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 64 }).withMessage('设备型号无效'),
  body('version').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 64 }).withMessage('系统版本无效'),
  body('deviceName').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('设备名称无效'),
]);

export const signTaskIdValidation = validate([
  param('taskId').isInt({ gt: 0 }).withMessage('任务编号无效'),
]);

export const entityIdValidation = validate([
  param('id').isInt({ gt: 0 }).withMessage('编号无效'),
]);

export const adminUserDeviceValidation = validate([
  param('id').isInt({ gt: 0 }).withMessage('用户编号无效'),
  body('udid').trim().isLength({ min: 8, max: 128 }).withMessage('UDID 无效'),
  body('product').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 64 }).withMessage('设备型号无效'),
  body('version').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 64 }).withMessage('系统版本无效'),
  body('deviceName').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('设备名称无效'),
  body('deviceId').optional({ nullable: true }).isInt({ gt: 0 }).withMessage('设备编号无效'),
]);

export const adminUserDeviceDeleteValidation = validate([
  param('id').isInt({ gt: 0 }).withMessage('用户编号无效'),
  param('deviceId').isInt({ gt: 0 }).withMessage('设备编号无效'),
]);

export const certificateMetaValidation = validate([
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('证书名称不能为空'),
  body('password').isLength({ min: 1, max: 200 }).withMessage('证书密码不能为空'),
  body('isActive').optional().isBoolean().withMessage('isActive 必须是布尔值'),
]);

export const certificatePasswordValidation = validate([
  body('password').isLength({ min: 1, max: 200 }).withMessage('证书密码不能为空'),
]);

export const profileMetaValidation = validate([
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('描述文件名称不能为空'),
  body('note').optional({ nullable: true }).isLength({ max: 300 }).withMessage('备注过长'),
  body('isActive').optional().isBoolean().withMessage('isActive 必须是布尔值'),
]);

export const profileUpdateValidation = validate([
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('描述文件名称不能为空'),
  body('note').optional({ nullable: true }).isLength({ max: 300 }).withMessage('备注过长'),
]);

export function uploadCertificateMiddleware(req, res, next) {
  certificateUpload(req, res, (error) => {
    if (error) {
      return sendError(res, ErrorCodes.PARAM_ERROR, error.message || '证书上传失败');
    }
    return next();
  });
}

export function uploadProfileMiddleware(req, res, next) {
  profileUpload(req, res, (error) => {
    if (error) {
      return sendError(res, ErrorCodes.PARAM_ERROR, error.message || '描述文件上传失败');
    }
    return next();
  });
}

export function uploadBundleMiddleware(req, res, next) {
  bundleUpload(req, res, (error) => {
    if (error) {
      return sendError(res, ErrorCodes.PARAM_ERROR, error.message || '签名方案上传失败');
    }
    return next();
  });
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  return String(value || '').trim().toLowerCase() === 'true';
}

async function assertSignPermission(user, requireSelfSign = false) {
  const permissions = await getUserSignPermissions(user);

  if (!permissions.canSign) {
    return {
      ok: false,
      code: ErrorCodes.PERMISSION_DENIED,
      message: '当前账号等级未开通签名功能',
      permissions,
    };
  }

  if (requireSelfSign && !permissions.canSelfSign) {
    return {
      ok: false,
      code: ErrorCodes.PERMISSION_DENIED,
      message: '当前账号等级未开通自备证书签名功能',
      permissions,
    };
  }

  return {
    ok: true,
    permissions,
  };
}

function replyPermissionError(res, permissionResult) {
  return sendError(res, permissionResult.code || ErrorCodes.PERMISSION_DENIED, permissionResult.message || '没有权限');
}

async function assertOwnedDevice(userId, deviceId) {
  const devices = await listDevicesByUser(userId);
  return devices.find((item) => item.id === deviceId) || null;
}

async function resolveSelectedAssets(user, { certificateId, profileId }) {
  const summary = await getSigningRuntimeSummary(user);
  const selectedCertificateId = certificateId || summary.activeCertificate?.id || null;
  const selectedProfileId = profileId || summary.activeProfile?.id || null;

  if (!selectedCertificateId) {
    return { error: '当前没有可用的签名证书，请先选择或上传证书。' };
  }

  if (!selectedProfileId) {
    return { error: '当前没有可用的描述文件，请先选择或上传描述文件。' };
  }

  const [certificate, profile] = await Promise.all([
    getCertificateById(selectedCertificateId),
    getProfileById(selectedProfileId),
  ]);

  if (!certificate) {
    return { error: '所选证书不存在或已被删除。' };
  }

  if (!profile) {
    return { error: '所选描述文件不存在或已被删除。' };
  }

  const certificateBelongsToUser = certificate.scope === 'user' && Number(certificate.ownerUserId) === Number(user.id);
  const profileBelongsToUser = profile.scope === 'user' && Number(profile.ownerUserId) === Number(user.id);

  if (certificate.scope === 'user' && !certificateBelongsToUser) {
    return { error: '不能使用其他用户上传的证书。' };
  }

  if (profile.scope === 'user' && !profileBelongsToUser) {
    return { error: '不能使用其他用户上传的描述文件。' };
  }

  return {
    certificate,
    profile,
  };
}

export async function saveUserDevice(req, res) {
  const device = await upsertUserDevice({
    userId: req.user.id,
    udid: normalizeString(req.body.udid).trim(),
    product: normalizeString(req.body.product).trim(),
    version: normalizeString(req.body.version).trim(),
    deviceName: normalizeString(req.body.deviceName).trim(),
    source: normalizeString(req.body.source || 'profile_service').trim() || 'profile_service',
  });

  return sendSuccess(res, device, 'udid saved');
}

export async function listMyDevices(req, res) {
  const devices = await listDevicesByUser(req.user.id);
  return sendSuccess(res, devices);
}

export async function listAdminUserDevices(req, res) {
  const userId = Number(req.params.id);
  const devices = await listDevicesByUser(userId);
  return sendSuccess(res, devices);
}

export async function saveAdminUserDevice(req, res) {
  const userId = Number(req.params.id);
  const device = await saveDeviceForAdmin({
    userId,
    deviceId: req.body.deviceId ? normalizeInteger(req.body.deviceId, 0) : null,
    udid: normalizeString(req.body.udid).trim(),
    product: normalizeString(req.body.product).trim(),
    version: normalizeString(req.body.version).trim(),
    deviceName: normalizeString(req.body.deviceName).trim(),
    source: 'admin_manual',
  });

  return sendSuccess(res, device, 'device saved');
}

export async function removeAdminUserDevice(req, res) {
  const userId = Number(req.params.id);
  const deviceId = Number(req.params.deviceId);
  const removed = await deleteDeviceForAdmin(userId, deviceId);
  if (!removed) {
    return sendError(res, ErrorCodes.NOT_FOUND, '设备不存在');
  }
  return sendSuccess(res, removed, 'device deleted');
}

export async function getSigningConfig(req, res) {
  const summary = await getSigningRuntimeSummary(req.user);
  return sendSuccess(res, summary);
}

export async function createMySignTask(req, res) {
  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先上传 IPA 文件');
  }

  const permissionResult = await assertSignPermission(req.user);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const latestTask = await getLatestPendingTaskByUser(req.user.id);
  if (latestTask) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '你有一个签名任务仍在处理中，请等待完成后再提交新的 IPA');
  }

  const deviceId = req.body.deviceId ? normalizeInteger(req.body.deviceId, 0) : 0;
  if (!deviceId) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先获取 UDID 并选择要签名的设备');
  }

  const device = await assertOwnedDevice(req.user.id, deviceId);
  if (!device) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '所选设备不存在或不属于当前账号');
  }

  const certificateId = req.body.certificateId ? normalizeInteger(req.body.certificateId, 0) : 0;
  const profileId = req.body.profileId ? normalizeInteger(req.body.profileId, 0) : 0;
  const assetResult = await resolveSelectedAssets(req.user, { certificateId, profileId });
  if (assetResult.error) {
    return sendError(res, ErrorCodes.PARAM_ERROR, assetResult.error);
  }

  const usingUserOwnedAssets = assetResult.certificate.scope === 'user' || assetResult.profile.scope === 'user';
  if (usingUserOwnedAssets) {
    const selfSignPermission = await assertSignPermission(req.user, true);
    if (!selfSignPermission.ok) {
      return replyPermissionError(res, selfSignPermission);
    }
  }

  const task = await createSignTask({
    userId: req.user.id,
    deviceId,
    certificateId: assetResult.certificate.id,
    profileId: assetResult.profile.id,
    ipaName: file.originalname,
    ipaPath: '',
  });

  await attachTaskUploadBuffer(task.id, file.originalname, file.buffer);
  void queueSignTask(task.id);
  const latest = await readTaskStatus(task.id, req.user.id);
  return sendSuccess(res, latest || task, 'sign task queued', 201);
}

export async function listMySignTasks(req, res) {
  const tasks = await listSignTasksByUser(req.user.id);
  return sendSuccess(res, tasks);
}

export async function getMySignTask(req, res) {
  const taskId = Number(req.params.taskId);
  const task = await readTaskStatus(taskId, req.user.id);

  if (!task) {
    return sendError(res, ErrorCodes.NOT_FOUND, '签名任务不存在');
  }

  return sendSuccess(res, task);
}

export async function listMyCertificates(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const items = await listCertificatesByOwner({ ownerUserId: req.user.id });
  return sendSuccess(res, items);
}

export async function createMyCertificate(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择 .p12 证书文件');
  }

  const absolutePath = await saveCertificateFile(file);
  const item = await createCertificate({
    name: normalizeString(req.body.name).trim(),
    originalName: file.originalname,
    absolutePath,
    password: normalizeString(req.body.password),
    isActive: parseBoolean(req.body.isActive),
    ownerUserId: req.user.id,
    scope: 'user',
  });

  return sendSuccess(res, item, 'certificate created', 201);
}

export async function createMySigningBundle(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const certificateFile = req.files?.certificate?.[0];
  const profileFile = req.files?.profile?.[0];
  const name = normalizeString(req.body.name).trim();
  const password = normalizeString(req.body.password);
  const note = normalizeString(req.body.note).trim();

  if (!certificateFile || !profileFile) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请同时上传证书和描述文件');
  }

  if (!name) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '签名方案名称不能为空');
  }

  if (!password) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '证书密码不能为空');
  }

  let validation;
  try {
    validation = validateCertificateProfilePair({
      certificateBuffer: certificateFile.buffer,
      certificatePassword: password,
      profileBuffer: profileFile.buffer,
    });
  } catch (error) {
    return sendError(res, ErrorCodes.PARAM_ERROR, error instanceof Error ? error.message : '证书与描述文件校验失败');
  }

  const certificatePath = await saveCertificateFile(certificateFile);
  const profilePath = await saveProfileFile(profileFile);

  const certificate = await createCertificate({
    name,
    originalName: certificateFile.originalname,
    absolutePath: certificatePath,
    password,
    teamId: validation.certificateTeamId,
    isActive: true,
    ownerUserId: req.user.id,
    scope: 'user',
  });

  const profile = await createProfile({
    name,
    originalName: profileFile.originalname,
    absolutePath: profilePath,
    note,
    appId: validation.appId,
    teamId: validation.profileTeamId,
    profileUuid: validation.profileUuid,
    isActive: true,
    ownerUserId: req.user.id,
    scope: 'user',
  });

  return sendSuccess(
    res,
    {
      certificate,
      profile,
      validation,
    },
    'bundle created',
    201,
  );
}

export async function activateMyCertificate(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const id = Number(req.params.id);
  const item = await getCertificateById(id);
  if (!item || item.scope !== 'user' || Number(item.ownerUserId) !== Number(req.user.id)) {
    return sendError(res, ErrorCodes.NOT_FOUND, '证书不存在');
  }

  await activateCertificate(id);
  return sendSuccess(res, { id }, 'certificate activated');
}

export async function removeMyCertificate(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const id = Number(req.params.id);
  const item = await getCertificateById(id);
  if (!item || item.scope !== 'user' || Number(item.ownerUserId) !== Number(req.user.id)) {
    return sendError(res, ErrorCodes.NOT_FOUND, '证书不存在');
  }

  const removed = await deleteCertificate(id);
  return sendSuccess(res, removed, 'certificate deleted');
}

export async function listMyProfiles(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const items = await listProfilesByOwner({ ownerUserId: req.user.id });
  return sendSuccess(res, items);
}

export async function createMyProfile(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择 mobileprovision 文件');
  }

  const absolutePath = await saveProfileFile(file);
  const item = await createProfile({
    name: normalizeString(req.body.name).trim(),
    originalName: file.originalname,
    absolutePath,
    note: normalizeString(req.body.note).trim(),
    isActive: parseBoolean(req.body.isActive),
    ownerUserId: req.user.id,
    scope: 'user',
  });

  return sendSuccess(res, item, 'profile created', 201);
}

export async function activateMyProfile(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const id = Number(req.params.id);
  const item = await getProfileById(id);
  if (!item || item.scope !== 'user' || Number(item.ownerUserId) !== Number(req.user.id)) {
    return sendError(res, ErrorCodes.NOT_FOUND, '描述文件不存在');
  }

  await activateProfile(id);
  return sendSuccess(res, { id }, 'profile activated');
}

export async function updateMyProfile(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const id = Number(req.params.id);
  const item = await getProfileById(id);
  if (!item || item.scope !== 'user' || Number(item.ownerUserId) !== Number(req.user.id)) {
    return sendError(res, ErrorCodes.NOT_FOUND, '描述文件不存在');
  }

  await updateProfileMeta(id, {
    name: normalizeString(req.body.name).trim(),
    note: normalizeString(req.body.note).trim(),
  });
  return sendSuccess(res, { id }, 'profile updated');
}

export async function removeMyProfile(req, res) {
  const permissionResult = await assertSignPermission(req.user, true);
  if (!permissionResult.ok) {
    return replyPermissionError(res, permissionResult);
  }

  const id = Number(req.params.id);
  const item = await getProfileById(id);
  if (!item || item.scope !== 'user' || Number(item.ownerUserId) !== Number(req.user.id)) {
    return sendError(res, ErrorCodes.NOT_FOUND, '描述文件不存在');
  }

  const removed = await deleteProfile(id);
  return sendSuccess(res, removed, 'profile deleted');
}

export async function getSigningAdminConfig(req, res) {
  const summary = await getSigningAdminSummary();
  return sendSuccess(res, summary);
}

export async function getSignCertificates(req, res) {
  const items = await listCertificates();
  return sendSuccess(res, items);
}

export async function createSignCertificate(req, res) {
  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择 .p12 证书文件');
  }

  const absolutePath = await saveCertificateFile(file);
  const item = await createCertificate({
    name: normalizeString(req.body.name).trim(),
    originalName: file.originalname,
    absolutePath,
    password: normalizeString(req.body.password),
    isActive: parseBoolean(req.body.isActive),
    scope: 'system',
  });

  return sendSuccess(res, item, 'certificate created', 201);
}

export async function activateSignCertificate(req, res) {
  const id = Number(req.params.id);
  const ok = await activateCertificate(id);
  if (!ok) {
    return sendError(res, ErrorCodes.NOT_FOUND, '证书不存在');
  }
  return sendSuccess(res, { id }, 'certificate activated');
}

export async function updateSignCertificatePassword(req, res) {
  const id = Number(req.params.id);
  await updateCertificatePassword(id, normalizeString(req.body.password));
  return sendSuccess(res, { id }, 'certificate password updated');
}

export async function removeSignCertificate(req, res) {
  const id = Number(req.params.id);
  const removed = await deleteCertificate(id);
  if (!removed) {
    return sendError(res, ErrorCodes.NOT_FOUND, '证书不存在');
  }
  return sendSuccess(res, removed, 'certificate deleted');
}

export async function getSignProfiles(req, res) {
  const items = await listProfiles();
  return sendSuccess(res, items);
}

export async function createSignProfile(req, res) {
  const file = req.file;
  if (!file) {
    return sendError(res, ErrorCodes.PARAM_ERROR, '请先选择 mobileprovision 文件');
  }

  const absolutePath = await saveProfileFile(file);
  const item = await createProfile({
    name: normalizeString(req.body.name).trim(),
    originalName: file.originalname,
    absolutePath,
    note: normalizeString(req.body.note).trim(),
    isActive: parseBoolean(req.body.isActive),
    scope: 'system',
  });

  return sendSuccess(res, item, 'profile created', 201);
}

export async function activateSignProfile(req, res) {
  const id = Number(req.params.id);
  const ok = await activateProfile(id);
  if (!ok) {
    return sendError(res, ErrorCodes.NOT_FOUND, '描述文件不存在');
  }
  return sendSuccess(res, { id }, 'profile activated');
}

export async function updateSignProfile(req, res) {
  const id = Number(req.params.id);
  await updateProfileMeta(id, {
    name: normalizeString(req.body.name).trim(),
    note: normalizeString(req.body.note).trim(),
  });
  return sendSuccess(res, { id }, 'profile updated');
}

export async function removeSignProfile(req, res) {
  const id = Number(req.params.id);
  const removed = await deleteProfile(id);
  if (!removed) {
    return sendError(res, ErrorCodes.NOT_FOUND, '描述文件不存在');
  }
  return sendSuccess(res, removed, 'profile deleted');
}
