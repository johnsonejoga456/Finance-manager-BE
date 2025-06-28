// routes/dashboardRoutes.js

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/summary', authMiddleware, getDashboardSummary);

export default router;