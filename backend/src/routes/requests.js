import express from 'express';
import {
  publicList,
  myList,
  create,
  adminList,
  update,
  remove,
  removeOwn,
  vote,
  publicListValidation,
  adminListValidation,
  createValidation,
  requestIdValidation,
  updateValidation
} from '../controllers/requestController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, publicListValidation, publicList);
router.post('/', optionalAuthenticate, createValidation, create);
router.get('/mine', authenticate, publicListValidation, myList);
router.delete('/:id', authenticate, requestIdValidation, removeOwn);
router.post('/:id/vote', authenticate, requestIdValidation, vote);
router.get('/admin/list', authenticate, requireAdmin, adminListValidation, adminList);
router.put('/admin/:id', authenticate, requireAdmin, updateValidation, update);
router.delete('/admin/:id', authenticate, requireAdmin, requestIdValidation, remove);

export default router;
