import express from 'express';
import {
  stats,
  trends,
  recent,
  activeIps,
  trendsValidation,
  recentValidation,
  activeIpsValidation
} from '../controllers/adminController.js';
import {
  adminList,
  update,
  remove,
  adminListValidation,
  requestIdValidation,
  updateValidation as requestUpdateValidation
} from '../controllers/requestController.js';
import * as topicController from '../controllers/topicController.js';
import * as appCategoryController from '../controllers/appCategoryController.js';
import * as postCategoryController from '../controllers/postCategoryController.js';
import * as netdiskReportController from '../controllers/netdiskReportController.js';
import * as settingsController from '../controllers/settingsController.js';
import * as inviteCodeController from '../controllers/inviteCodeController.js';
import * as adminUserController from '../controllers/adminUserController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as contentPickerController from '../controllers/contentPickerController.js';
import * as levelController from '../controllers/adminLevelController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, stats);
router.get('/trends', authenticate, requireAdmin, trendsValidation, trends);
router.get('/recent', authenticate, requireAdmin, recentValidation, recent);
router.get('/active-ips', authenticate, requireAdmin, activeIpsValidation, activeIps);
router.get('/settings', authenticate, requireAdmin, settingsController.getAdminSettings);
router.put('/settings', authenticate, requireAdmin, settingsController.updateValidation, settingsController.updateSettings);
router.get('/invite-codes', authenticate, requireAdmin, inviteCodeController.listValidation, inviteCodeController.list);
router.post('/invite-codes/batch', authenticate, requireAdmin, inviteCodeController.createBatchValidation, inviteCodeController.createBatch);
router.get('/users', authenticate, requireAdmin, adminUserController.listValidation, adminUserController.list);
router.get('/users/levels', authenticate, requireAdmin, adminUserController.levels);

// ============ 等级管理 CRUD ============
router.get('/levels', authenticate, requireAdmin, levelController.list);
router.post('/levels', authenticate, requireAdmin, levelController.createValidation, levelController.create);
router.put('/levels/:key', authenticate, requireAdmin, levelController.updateValidation, levelController.update);
router.delete('/levels/:key', authenticate, requireAdmin, levelController.remove);
router.patch('/users/:id', authenticate, requireAdmin, adminUserController.updateValidation, adminUserController.update);
router.patch(
  '/users/:id/password',
  authenticate,
  requireAdmin,
  adminUserController.passwordValidation,
  adminUserController.updatePassword
);
router.delete('/users/:id', authenticate, requireAdmin, adminUserController.deleteValidation, adminUserController.remove);
router.get('/notification-templates', authenticate, requireAdmin, notificationController.templates);
router.put(
  '/notification-templates/:key',
  authenticate,
  requireAdmin,
  notificationController.templateValidation,
  notificationController.updateTemplate
);
router.post('/notifications/send', authenticate, requireAdmin, notificationController.sendValidation, notificationController.send);
router.post('/notifications/users/:id', authenticate, requireAdmin, notificationController.sendValidation, notificationController.createForUser);
router.get('/content-picker/apps', authenticate, requireAdmin, contentPickerController.listValidation, contentPickerController.appPicker);
router.get('/content-picker/posts', authenticate, requireAdmin, contentPickerController.listValidation, contentPickerController.postPicker);

router.get('/requests', authenticate, requireAdmin, adminListValidation, adminList);
router.put('/requests/:id', authenticate, requireAdmin, requestUpdateValidation, update);
router.delete('/requests/:id', authenticate, requireAdmin, requestIdValidation, remove);

router.post('/topics', authenticate, requireAdmin, topicController.createValidation, topicController.create);
router.put(
  '/topics/:slug',
  authenticate,
  requireAdmin,
  topicController.slugParamValidation,
  topicController.updateValidation,
  topicController.update
);
router.delete('/topics/:slug', authenticate, requireAdmin, topicController.slugParamValidation, topicController.remove);

router.get('/app-categories', authenticate, requireAdmin, appCategoryController.listValidation, appCategoryController.list);
router.post(
  '/app-categories',
  authenticate,
  requireAdmin,
  appCategoryController.createValidation,
  appCategoryController.create
);
router.put(
  '/app-categories/order',
  authenticate,
  requireAdmin,
  appCategoryController.reorderValidation,
  appCategoryController.reorder
);
router.put(
  '/app-categories/:name',
  authenticate,
  requireAdmin,
  appCategoryController.nameParamValidation,
  appCategoryController.updateValidation,
  appCategoryController.update
);
router.delete(
  '/app-categories/:name',
  authenticate,
  requireAdmin,
  appCategoryController.nameParamValidation,
  appCategoryController.remove
);

router.get('/post-categories', authenticate, requireAdmin, postCategoryController.listValidation, postCategoryController.list);
router.post(
  '/post-categories',
  authenticate,
  requireAdmin,
  postCategoryController.createValidation,
  postCategoryController.create
);
router.put(
  '/post-categories/order',
  authenticate,
  requireAdmin,
  postCategoryController.reorderValidation,
  postCategoryController.reorder
);
router.put(
  '/post-categories/:name',
  authenticate,
  requireAdmin,
  postCategoryController.nameParamValidation,
  postCategoryController.updateValidation,
  postCategoryController.update
);
router.delete(
  '/post-categories/:name',
  authenticate,
  requireAdmin,
  postCategoryController.nameParamValidation,
  postCategoryController.remove
);

router.get(
  '/netdisk-reports',
  authenticate,
  requireAdmin,
  netdiskReportController.adminListValidation,
  netdiskReportController.adminList
);
router.patch(
  '/netdisk-reports/:id',
  authenticate,
  requireAdmin,
  netdiskReportController.adminUpdateValidation,
  netdiskReportController.adminUpdate
);

export default router;
