import express from 'express';
import { getAdContent, createAdContent, trackClick, adContentValidation, clickValidation } from '../controllers/adController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/:slotId', getAdContent);
router.post('/', authenticate, requireAdmin, adContentValidation, createAdContent);
router.post('/click', clickValidation, trackClick);

export default router;
