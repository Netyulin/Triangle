import express from 'express';
import {
  list,
  create,
  like,
  dislike,
  remove,
  listValidation,
  createValidation,
  actionValidation
} from '../controllers/commentController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, listValidation, list);
router.post('/', optionalAuthenticate, createValidation, create);
router.post('/:id/like', authenticate, actionValidation, like);
router.post('/:id/dislike', authenticate, actionValidation, dislike);
router.delete('/:id', authenticate, actionValidation, remove);

export default router;
