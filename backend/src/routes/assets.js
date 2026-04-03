import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  importRemoteImage,
  importRemoteImageValidation,
  uploadImage,
  uploadImageMiddleware,
  uploadImageValidation
} from '../controllers/assetController.js';

const router = express.Router();

router.post('/images/upload', authenticate, requireAdmin, uploadImageMiddleware, uploadImageValidation, uploadImage);
router.post('/images/import', authenticate, requireAdmin, importRemoteImageValidation, importRemoteImage);

export default router;

