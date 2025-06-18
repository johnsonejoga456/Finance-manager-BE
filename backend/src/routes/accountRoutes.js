import express from 'express';
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  updateAccountBalance,
} from '../controllers/accountController.js';
import authMiddleware from '../middleware/auth.js';

const accountRouter = express.Router();

accountRouter.get('/', authMiddleware, getAccounts);
accountRouter.post('/', authMiddleware, addAccount);
accountRouter.put('/:id', authMiddleware, updateAccount);
accountRouter.delete('/:id', authMiddleware, deleteAccount);
accountRouter.get('/:id/transactions', authMiddleware, getAccountTransactions);
accountRouter.patch('/:id/update-balance', authMiddleware, updateAccountBalance);

export default accountRouter;