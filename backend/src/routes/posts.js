import express from 'express';
import {
  list,
  featured,
  categories,
  detail,
  create,
  update,
  remove,
  importFromUrl,
  listValidation,
  createValidation,
  updateValidation,
  slugParamValidation,
  importContentValidation
} from '../controllers/postController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, listValidation, list);
router.get('/featured', featured);
router.get('/categories', categories);
router.post('/import-from-url', authenticate, requireAdmin, importContentValidation, importFromUrl);
router.get('/:slug', optionalAuthenticate, slugParamValidation, detail);

router.post('/', authenticate, requireAdmin, createValidation, create);
router.put('/:slug', authenticate, requireAdmin, slugParamValidation, updateValidation, update);
router.delete('/:slug', authenticate, requireAdmin, slugParamValidation, remove);

export default router;
