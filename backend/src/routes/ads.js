import express from 'express';
import {
  listSlots,
  getSlot,
  createSlot,
  updateSlot,
  deleteSlot,
  listValidation,
  createValidation,
  updateValidation
} from '../controllers/adController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listValidation, listSlots);
router.get('/slots/:id', getSlot);
router.post('/', authenticate, requireAdmin, createValidation, createSlot);
router.put('/:id', authenticate, requireAdmin, updateValidation, updateSlot);
router.delete('/:id', authenticate, requireAdmin, deleteSlot);

export default router;
