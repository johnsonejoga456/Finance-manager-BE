import express from 'express';
import {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  deleteDebt,
  getRepaymentStrategies,
  recordPayment,
  exportDebtsAsCSV,
  exportDebtsAsPDF,
} from '../controllers/debtController.js';
import authenticate from '../middleware/auth.js';
import checkDebtOwnership from '../middleware/debtMiddleware.js';

const router = express.Router();

// Apply authentication to all debt routes
router.use(authenticate);

// Routes without debt ID
router.post('/', createDebt);
router.get('/', getDebts);
router.get('/strategies', getRepaymentStrategies);
router.get('/export/csv', exportDebtsAsCSV);
router.get('/export/pdf', exportDebtsAsPDF);

// Routes with debt ID (apply checkDebtOwnership)
router.get('/:id', checkDebtOwnership, getDebtById);
router.put('/:id', checkDebtOwnership, updateDebt);
router.delete('/:id', checkDebtOwnership, deleteDebt);
router.post('/:id/payment', checkDebtOwnership, recordPayment);

export default router;