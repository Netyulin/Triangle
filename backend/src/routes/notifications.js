import express from 'express';
import {
  list,
  unreadCount,
  markRead,
  markAllRead,
  remove,
  listValidation,
  idValidation
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, listValidation, list);
router.get('/unread-count', authenticate, unreadCount);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, idValidation, markRead);
router.delete('/:id', authenticate, idValidation, remove);

export default router;
