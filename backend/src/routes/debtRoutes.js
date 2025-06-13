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

router.use(authenticate);

router.post('/', createDebt);
router.get('/', getDebts);
router.get('/:id', checkDebtOwnership, getDebtById);
router.put('/:id', checkDebtOwnership, updateDebt);
router.delete('/:id', checkDebtOwnership, deleteDebt);
router.get('/strategies', getRepaymentStrategies);
router.post('/:id/payment', checkDebtOwnership, recordPayment);
router.get('/export/csv', exportDebtsAsCSV);
router.get('/export/pdf', exportDebtsAsPDF);

export default router;