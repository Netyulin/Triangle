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
// 注意：精确路径必须放在参数路径前面，否则 /content/click 会被 /content/:slotId 错误匹配
router.get('/', listValidation, listSlots);
router.get('/slots/:id', slotEntityIdValidation, getSlot);
router.post('/content/click', clickValidation, trackClick);  // 必须在 /content/:slotId 前面
router.get('/content/:slotId', adContentValidation, getAdContent);

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
