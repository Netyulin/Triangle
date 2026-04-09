import express from 'express';
import {
  listSlots,
  getSlot,
  createSlot,
  updateSlot,
  deleteSlot,
  getAdContent,
  createAdContent,
  updateAdContent,
  deleteAdContent,
  listAdContents,
  getAdContentById,
  getAdStats,
  trackClick,
  listValidation,
  createValidation,
  updateValidation,
  slotEntityIdValidation,
  adContentValidation,
  adContentListValidation,
  adContentCreateValidation,
  adContentUpdateValidation,
  adContentIdValidation,
  clickValidation
} from '../controllers/adController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public endpoints (for front pages)
router.get('/', listValidation, listSlots);
router.get('/slots/:id', slotEntityIdValidation, getSlot);
router.get('/content/:slotId', adContentValidation, getAdContent);
router.post('/content/click', clickValidation, trackClick);

// Admin endpoints (for admin panel)
router.get('/admin/slots', authenticate, requireAdmin, listValidation, listSlots);
router.post('/', authenticate, requireAdmin, createValidation, createSlot);
router.put('/:id', authenticate, requireAdmin, slotEntityIdValidation, updateValidation, updateSlot);
router.delete('/:id', authenticate, requireAdmin, slotEntityIdValidation, deleteSlot);

router.get('/admin/contents', authenticate, requireAdmin, adContentListValidation, listAdContents);
router.get('/admin/contents/:id', authenticate, requireAdmin, adContentIdValidation, getAdContentById);
router.post('/admin/contents', authenticate, requireAdmin, adContentCreateValidation, createAdContent);
router.put('/admin/contents/:id', authenticate, requireAdmin, adContentUpdateValidation, updateAdContent);
router.delete('/admin/contents/:id', authenticate, requireAdmin, adContentIdValidation, deleteAdContent);

router.get('/admin/stats', authenticate, requireAdmin, getAdStats);

export default router;
