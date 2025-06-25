import express from 'express';
import {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  exportToCSV,
  exportToPDF,
} from '../controllers/investmentController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, getInvestments);
router.post('/', authMiddleware, addInvestment);
router.put('/:id', authMiddleware, updateInvestment);
router.delete('/:id', authMiddleware, deleteInvestment);
router.get('/export/csv', authMiddleware, exportToCSV);
router.get('/export/pdf', authMiddleware, exportToPDF);

export default router;
