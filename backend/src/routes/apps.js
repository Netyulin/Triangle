import express from 'express';
import {
  list,
  featured,
  categories,
  detail,
  access,
  rating,
  submitRating,
  create,
  update,
  remove,
  importFromUrl,
  listValidation,
  createValidation,
  updateValidation,
  slugParamValidation,
  accessValidation,
  ratingValidation,
  importContentValidation
} from '../controllers/appController.js';
import * as netdiskReportController from '../controllers/netdiskReportController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, listValidation, list);
router.get('/featured', featured);
router.get('/categories', categories);
router.post('/import-from-url', authenticate, requireAdmin, importContentValidation, importFromUrl);
router.get('/:slug/access', optionalAuthenticate, accessValidation, access);
router.get('/:slug/rating', optionalAuthenticate, slugParamValidation, rating);
router.post('/:slug/rating', authenticate, ratingValidation, submitRating);
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
