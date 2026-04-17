import express from 'express';
import {
  createOrder,
  wechatWebhook,
  alipayWebhook,
  getOrders,
  cancelOrder,
  getBalance,
  getMembershipLevels,
  upgradeMembership,
  createOrderValidation,
  orderNoParamValidation,
  upgradeMembershipValidation
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ============ 用户支付相关（需要登录） ============

router.post('/create-order', authenticate, createOrderValidation, createOrder);
router.get('/orders', authenticate, getOrders);
router.post('/order/:orderNo/cancel', authenticate, orderNoParamValidation, cancelOrder);
router.get('/balance', authenticate, getBalance);
router.get('/membership-levels', authenticate, getMembershipLevels);
router.post('/upgrade-membership', authenticate, upgradeMembershipValidation, upgradeMembership);

// ============ 支付回调（无需登录，由第三方调用） ============

router.post('/webhook/wechat', wechatWebhook);
router.post('/webhook/alipay', alipayWebhook);

export default router;
