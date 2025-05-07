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
import checkBudgetOwnership from '../middleware/budgetMiddleware.js';

const router = express.Router();

// Routes without budget ID (use authMiddleware)
router.post('/', authMiddleware, createBudget);
router.get('/', authMiddleware, getBudgets);
router.get('/status', authMiddleware, getBudgetStatus);
router.get('/insights', authMiddleware, getBudgetInsights);

// Routes with budget ID (use checkBudgetOwnership)
router.get('/:id', authMiddleware, checkBudgetOwnership, getBudgetById);
router.put('/:id', authMiddleware, checkBudgetOwnership, updateBudget);
router.delete('/:id', authMiddleware, checkBudgetOwnership, deleteBudget);

export default router;