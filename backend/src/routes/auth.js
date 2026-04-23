import express from 'express';
import {
  createRecharge,
  favoriteValidation,
  forgotPassword,
  forgotPasswordValidation,
  listFavorites,
  login,
  me,
  permissions,
  profile,
  resetPassword,
  resetPasswordValidation,
  rechargeValidation,
  register,
  loginValidation,
  registerValidation,
  verifyResetToken,
  verifyResetTokenValidation,
  toggleFavorite,
  updateProfile,
  updateProfileValidation
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resetPasswordRateLimit
} from '../middleware/authRateLimit.js';

const router = express.Router();

router.post('/register', registerRateLimit, registerValidation, register);
router.post('/login', loginRateLimit, loginValidation, login);
router.post('/forgot-password', forgotPasswordRateLimit, forgotPasswordValidation, forgotPassword);
router.post('/reset-password/verify', resetPasswordRateLimit, verifyResetTokenValidation, verifyResetToken);
router.post('/reset-password', resetPasswordRateLimit, resetPasswordValidation, resetPassword);
router.get('/me', authenticate, me);
router.get('/permissions', authenticate, permissions);
router.get('/profile', authenticate, profile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.get('/favorites', authenticate, listFavorites);
router.post('/favorites', authenticate, favoriteValidation, toggleFavorite);
router.post('/recharge', authenticate, rechargeValidation, createRecharge);

export default router;
