import express from 'express';
import { search, hotSearches, searchValidation } from '../controllers/searchController.js';

const router = express.Router();

router.get('/', searchValidation, search);
router.get('/hot', hotSearches);
router.get('/hot-searches', hotSearches);

export default router;
