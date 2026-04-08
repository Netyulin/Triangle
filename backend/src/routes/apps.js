import express from 'express';
import {
  list,
  featured,
  categories,
  detail,
  access,
  create,
  update,
  remove,
  listValidation,
  createValidation,
  updateValidation,
  slugParamValidation,
  accessValidation
} from '../controllers/appController.js';
import * as netdiskReportController from '../controllers/netdiskReportController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, listValidation, list);
router.get('/featured', featured);
router.get('/categories', categories);
router.get('/:slug/access', optionalAuthenticate, accessValidation, access);
router.post(
  '/:slug/netdisk-reports',
  optionalAuthenticate,
  netdiskReportController.createValidation,
  netdiskReportController.create
);
router.get('/:slug', optionalAuthenticate, slugParamValidation, detail);

router.post('/', authenticate, requireAdmin, createValidation, create);
router.put('/:slug', authenticate, requireAdmin, slugParamValidation, updateValidation, update);
router.delete('/:slug', authenticate, requireAdmin, slugParamValidation, remove);

export default router;
