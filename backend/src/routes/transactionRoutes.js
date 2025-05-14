import express from 'express';
import {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkUpdateTransactions,
  searchTransactions,
  exportTransactions,
  exportTransactionsAsPDF,
  getBudgetStatus,
  getTotalIncomeAndExpenses,
  getIncomeVsExpensesReport,
  getCategoricalExpenseBreakdown,
} from '../controllers/transactionController.js';
import authMiddleware from '../middleware/auth.js';

const transactionRouter = express.Router();

// Transaction Routes
transactionRouter.post('/', authMiddleware, addTransaction);
transactionRouter.get('/', authMiddleware, getTransactions);
transactionRouter.get('/:id', authMiddleware, getTransactionById);
transactionRouter.put('/:id', authMiddleware, updateTransaction);
transactionRouter.delete('/:id', authMiddleware, deleteTransaction);
transactionRouter.post('/bulk', authMiddleware, bulkUpdateTransactions);
transactionRouter.get('/search', authMiddleware, searchTransactions);
transactionRouter.get('/export/csv', authMiddleware, exportTransactions);
transactionRouter.get('/export/pdf', authMiddleware, exportTransactionsAsPDF);
transactionRouter.get('/budget-status', authMiddleware, getBudgetStatus);
transactionRouter.post('/import/csv', authMiddleware, importCSV);

// Analytics Routes
transactionRouter.get('/analytics/income-expenses', authMiddleware, getTotalIncomeAndExpenses);
transactionRouter.get('/analytics/income-vs-expenses', authMiddleware, getIncomeVsExpensesReport);
transactionRouter.get('/analytics/expense-breakdown', authMiddleware, getCategoricalExpenseBreakdown);

export default transactionRouter;