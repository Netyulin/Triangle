import express from 'express';
import {
  list,
  all,
  detail,
  create,
  update,
  remove,
  listValidation,
  createValidation,
  updateValidation,
  slugParamValidation
} from '../controllers/topicController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, listValidation, list);
router.get('/all', all);
router.get('/:slug', optionalAuthenticate, slugParamValidation, detail);

router.post('/', authenticate, requireAdmin, createValidation, create);
router.put('/:slug', authenticate, requireAdmin, slugParamValidation, updateValidation, update);
router.delete('/:slug', authenticate, requireAdmin, slugParamValidation, remove);

export default router;
