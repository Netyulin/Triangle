import express from 'express';
import { stats, trends, recent, trendsValidation, recentValidation } from '../controllers/adminController.js';
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
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, stats);
router.get('/trends', authenticate, requireAdmin, trendsValidation, trends);
router.get('/recent', authenticate, requireAdmin, recentValidation, recent);
router.get('/settings', authenticate, requireAdmin, settingsController.getAdminSettings);
router.put('/settings', authenticate, requireAdmin, settingsController.updateValidation, settingsController.updateSettings);
router.get('/invite-codes', authenticate, requireAdmin, inviteCodeController.listValidation, inviteCodeController.list);
router.post('/invite-codes/batch', authenticate, requireAdmin, inviteCodeController.createBatchValidation, inviteCodeController.createBatch);

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

export default router;
