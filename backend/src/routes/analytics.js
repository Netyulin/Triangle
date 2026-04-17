import express from 'express';
import { pageViewValidation, recordPageView } from '../controllers/analyticsController.js';

const router = express.Router();

router.post('/page-view', pageViewValidation, recordPageView);

export default router;
