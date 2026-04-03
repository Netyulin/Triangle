import express from 'express';
import { summary } from '../controllers/homeController.js';

const router = express.Router();

router.get('/', summary);

export default router;
