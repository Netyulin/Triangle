import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { uploadRateLimit } from '../middleware/authRateLimit.js';
import { requireInternalUploadPassword } from '../middleware/internalUploadAuth.js';
import {
  importRemoteImage,
  importRemoteImageValidation,
  removeImage,
  removeImageValidation,
  uploadImage,
  uploadImageMiddleware,
  uploadImageValidation
} from '../controllers/assetController.js';

const router = express.Router();

router.post('/images/upload', authenticate, requireAdmin, uploadRateLimit, uploadImageMiddleware, uploadImageValidation, uploadImage);
router.post('/images/import', authenticate, requireAdmin, uploadRateLimit, importRemoteImageValidation, importRemoteImage);
router.delete('/images', authenticate, requireAdmin, uploadRateLimit, removeImageValidation, removeImage);
router.post(
  '/images/local-upload',
  requireInternalUploadPassword,
  uploadRateLimit,
  uploadImageMiddleware,
  uploadImageValidation,
  uploadImage,
);

export default router;
