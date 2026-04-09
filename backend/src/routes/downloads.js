import express from 'express';
import { getDownloadInfo, recordAdClick, slugValidation } from '../controllers/downloadController.js';

const router = express.Router();

router.get('/:slug', slugValidation, getDownloadInfo);
router.post('/:slug/ad-click', slugValidation, recordAdClick);

export default router;
