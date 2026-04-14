import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { signMutationRateLimit, signStatusRateLimit, uploadRateLimit } from '../middleware/authRateLimit.js';
import {
  activateMyCertificate,
  activateMyProfile,
  activateSignCertificate,
  activateSignProfile,
  createMySignTask,
  createMyCertificate,
  createMyProfile,
  createMySigningBundle,
  createSignCertificate,
  createSignProfile,
  adminUserDeviceDeleteValidation,
  entityIdValidation,
  adminUserDeviceValidation,
  certificateMetaValidation,
  certificatePasswordValidation,
  getMySignTask,
  getSigningConfig,
  listMyCertificates,
  getSignCertificates,
  listMyProfiles,
  getSignProfiles,
  getSigningAdminConfig,
  listAdminUserDevices,
  listMyDevices,
  listMySignTasks,
  profileMetaValidation,
  profileUpdateValidation,
  removeAdminUserDevice,
  removeMyCertificate,
  removeMyProfile,
  removeSignCertificate,
  removeSignProfile,
  saveAdminUserDevice,
  saveUserDevice,
  signTaskIdValidation,
  updateSignCertificatePassword,
  updateMyProfile,
  updateSignProfile,
  uploadSignIpaMiddleware,
  uploadCertificateMiddleware,
  uploadBundleMiddleware,
  uploadProfileMiddleware,
  upsertDeviceValidation,
} from '../controllers/signController.js';

const router = express.Router();

router.get('/devices', authenticate, signStatusRateLimit, listMyDevices);
router.post('/devices', authenticate, signMutationRateLimit, upsertDeviceValidation, saveUserDevice);
router.get('/config', authenticate, signStatusRateLimit, getSigningConfig);
router.get('/certificates', authenticate, signStatusRateLimit, listMyCertificates);
router.post('/bundles', authenticate, uploadRateLimit, uploadBundleMiddleware, createMySigningBundle);
router.post('/certificates', authenticate, uploadRateLimit, uploadCertificateMiddleware, certificateMetaValidation, createMyCertificate);
router.patch('/certificates/:id/activate', authenticate, signMutationRateLimit, entityIdValidation, activateMyCertificate);
router.delete('/certificates/:id', authenticate, signMutationRateLimit, entityIdValidation, removeMyCertificate);
router.get('/profiles', authenticate, signStatusRateLimit, listMyProfiles);
router.post('/profiles', authenticate, uploadRateLimit, uploadProfileMiddleware, profileMetaValidation, createMyProfile);
router.patch('/profiles/:id/activate', authenticate, signMutationRateLimit, entityIdValidation, activateMyProfile);
router.put('/profiles/:id', authenticate, signMutationRateLimit, entityIdValidation, profileUpdateValidation, updateMyProfile);
router.delete('/profiles/:id', authenticate, signMutationRateLimit, entityIdValidation, removeMyProfile);
router.get('/tasks', authenticate, signStatusRateLimit, listMySignTasks);
router.post('/tasks', authenticate, signMutationRateLimit, uploadRateLimit, uploadSignIpaMiddleware, createMySignTask);
router.get('/tasks/:taskId', authenticate, signStatusRateLimit, signTaskIdValidation, getMySignTask);

router.get('/admin/users/:id/devices', authenticate, requireAdmin, signStatusRateLimit, entityIdValidation, listAdminUserDevices);
router.post('/admin/users/:id/devices', authenticate, requireAdmin, signMutationRateLimit, adminUserDeviceValidation, saveAdminUserDevice);
router.delete('/admin/users/:id/devices/:deviceId', authenticate, requireAdmin, signMutationRateLimit, adminUserDeviceDeleteValidation, removeAdminUserDevice);

router.get('/admin/config', authenticate, requireAdmin, signStatusRateLimit, getSigningAdminConfig);
router.get('/admin/certificates', authenticate, requireAdmin, signStatusRateLimit, getSignCertificates);
router.post('/admin/certificates', authenticate, requireAdmin, uploadRateLimit, uploadCertificateMiddleware, certificateMetaValidation, createSignCertificate);
router.patch('/admin/certificates/:id/activate', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, activateSignCertificate);
router.patch('/admin/certificates/:id/password', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, certificatePasswordValidation, updateSignCertificatePassword);
router.delete('/admin/certificates/:id', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, removeSignCertificate);

router.get('/admin/profiles', authenticate, requireAdmin, signStatusRateLimit, getSignProfiles);
router.post('/admin/profiles', authenticate, requireAdmin, uploadRateLimit, uploadProfileMiddleware, profileMetaValidation, createSignProfile);
router.patch('/admin/profiles/:id/activate', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, activateSignProfile);
router.put('/admin/profiles/:id', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, profileUpdateValidation, updateSignProfile);
router.delete('/admin/profiles/:id', authenticate, requireAdmin, signMutationRateLimit, entityIdValidation, removeSignProfile);

export default router;
