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
  getCategoricalExpenseBreakdown
} from '../controllers/transactionController.js';
import { 
  validateTransaction,
  validateTransactionId,
  validateSearchTransactions 
} from '../middleware/transactionValidation.js';
import authMiddleware from '../middleware/auth.js';

const transactionRouter = express.Router();

transactionRouter.get('/', authMiddleware, getTransactions); // List all transactions
transactionRouter.get('/:id', authMiddleware, validateTransactionId, getTransactionById); // Get single transaction
transactionRouter.post('/', authMiddleware, validateTransaction, addTransaction); // Add transaction
transactionRouter.put('/:id', authMiddleware, validateTransactionId, validateTransaction, updateTransaction); // Update transaction
transactionRouter.delete('/:id', authMiddleware, validateTransactionId, deleteTransaction); // Delete transaction
transactionRouter.post('/bulk', authMiddleware, bulkUpdateTransactions); // Bulk actions
transactionRouter.get('/search', authMiddleware, validateSearchTransactions, searchTransactions); // Search transactions
transactionRouter.get('/export/csv', authMiddleware, exportTransactions); // Export CSV
transactionRouter.get('/export/pdf', authMiddleware, exportTransactionsAsPDF); // Export PDF
transactionRouter.get('/budget-status', authMiddleware, getBudgetStatus); // Budget status
transactionRouter.get('/analytics/income-expenses', authMiddleware, getTotalIncomeAndExpenses); // Total income/expenses
transactionRouter.get('/analytics/income-vs-expenses', authMiddleware, getIncomeVsExpensesReport); // Income vs expenses report
transactionRouter.get('/analytics/expense-breakdown', authMiddleware, getCategoricalExpenseBreakdown); // Expense breakdown
transactionRouter.get('/plaid/link', authMiddleware, getPlaidLinkToken);
transactionRouter.post('/plaid/exchange', authMiddleware, exchangePlaidToken);
transactionRouter.get('/plaid/sync', authMiddleware, syncBankTransactionsManual);

export default transactionRouter;
