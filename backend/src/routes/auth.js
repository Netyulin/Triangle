import express from 'express';
import {
  createRecharge,
  favoriteValidation,
  listFavorites,
  login,
  me,
  permissions,
  profile,
  rechargeValidation,
  register,
  loginValidation,
  registerValidation,
  toggleFavorite,
  updateProfile,
  updateProfileValidation
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { loginRateLimit, registerRateLimit } from '../middleware/authRateLimit.js';

const router = express.Router();

router.post('/register', registerRateLimit, registerValidation, register);
router.post('/login', loginRateLimit, loginValidation, login);
router.get('/me', authenticate, me);
router.get('/permissions', authenticate, permissions);
router.get('/profile', authenticate, profile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.get('/favorites', authenticate, listFavorites);
router.post('/favorites', authenticate, favoriteValidation, toggleFavorite);
router.post('/recharge', authenticate, rechargeValidation, createRecharge);

export default router;
