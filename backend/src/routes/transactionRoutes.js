import express from 'express';
import { 
    addTransaction, 
    addRecurringTransaction,
    getTransactions, 
    deleteTransaction, 
    updateTransaction,
    searchTransactions,
    exportTransactions,
    exportTransactionsAsPDF,
    getBudgetStatus,
    getTotalIncomeAndExpenses,
    getIncomeVsExpensesReport,
    getCategoricalExpenseBreakdown
} from '../controllers/transactionController.js';

import { 
    validateTransaction,
    validateTransactionId,
    validateSearchTransactions 
} from '../middleware/transactionValidation.js';

import authMiddleware from '../middleware/auth.js';

const transactionRouter = express.Router();

// Get a transaction by ID
transactionRouter.get('/:id', authMiddleware, validateTransactionId, getTransactions);

// Add a transaction
transactionRouter.post('/', authMiddleware, validateTransaction, addTransaction);

// Add a recurring transaction
transactionRouter.post('/recurring', authMiddleware, addRecurringTransaction);

// Update a transaction
transactionRouter.put('/:id', authMiddleware, validateTransactionId, validateTransaction, updateTransaction);

// Delete a transaction
transactionRouter.delete('/:id', authMiddleware, deleteTransaction);

// Search transactions by filters (date, amount, category)
transactionRouter.get('/search', authMiddleware, validateSearchTransactions, searchTransactions);

// Export transactions (CSV)
transactionRouter.get('/export/csv', authMiddleware, exportTransactions);

// Export transactions (PDF)
transactionRouter.get('/export/pdf', authMiddleware, exportTransactionsAsPDF);

// Get budget status
transactionRouter.get('/budget-status', authMiddleware, getBudgetStatus);

// Get total income and expenses
transactionRouter.get('/analytics/income-expenses', authMiddleware, getTotalIncomeAndExpenses);

// Get income vs expenses report
transactionRouter.get('/analytics/income-vs-expenses', authMiddleware, getIncomeVsExpensesReport);

// Get categorical breakdown of expenses
transactionRouter.get('/analytics/expense-breakdown', authMiddleware, getCategoricalExpenseBreakdown);

export default transactionRouter;
