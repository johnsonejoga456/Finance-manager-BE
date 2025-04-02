import express from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/auth.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/', authMiddleware, getDashboardData);

export default dashboardRouter;
