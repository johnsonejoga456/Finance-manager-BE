import express from 'express';
import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
  getBudgetInsights,
} from '../controllers/budgetController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Budget routes, all protected by authMiddleware
router.post('/', authMiddleware, createBudget);
router.get('/', authMiddleware, getBudgets);
router.get('/:id', authMiddleware, getBudgetById);
router.put('/:id', authMiddleware, updateBudget);
router.delete('/:id', authMiddleware, deleteBudget);
router.get('/status', authMiddleware, getBudgetStatus);
router.get('/insights', authMiddleware, getBudgetInsights);

export default router;