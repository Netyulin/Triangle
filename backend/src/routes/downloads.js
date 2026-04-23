import express from 'express';
import { getDownloadInfo, recordAdClick, slugValidation } from '../controllers/downloadController.js';
import { downloadTrackingRateLimit, generalApiRateLimit } from '../middleware/authRateLimit.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/:slug', authenticate, generalApiRateLimit, slugValidation, getDownloadInfo);
router.post('/:slug/ad-click', downloadTrackingRateLimit, slugValidation, recordAdClick);

export default router;
