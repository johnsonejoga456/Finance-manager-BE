import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import cron from 'node-cron';
import { write as createCsvStream } from 'fast-csv';
import PDFDocument from 'pdfkit';
import { getPeriodDates } from '../../utils/dateUtils.js';

// Standardized response helper
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Create a new budget
export const createBudget = async (req, res) => {
  try {
    const { category, amount, currency, period, customPeriod, recurrence, rollover, alertThreshold } = req.body;

    if (!category || !amount || !period) {
      return sendResponse(res, 400, false, null, 'Missing required fields: category, amount, period');
    }
    if (period === 'custom' && (!customPeriod?.startDate || !customPeriod?.endDate)) {
      return sendResponse(res, 400, false, null, 'Custom period requires startDate and endDate');
    }
    if (period === 'custom' && new Date(customPeriod.startDate) >= new Date(customPeriod.endDate)) {
      return sendResponse(res, 400, false, null, 'startDate must be before endDate');
    }

    const budget = new Budget({
      user: req.user.id,
      category,
      amount,
      currency: currency || 'USD',
      period,
      customPeriod: period === 'custom' ? {
        startDate: new Date(customPeriod.startDate),
        endDate: new Date(customPeriod.endDate),
      } : undefined,
      recurrence: recurrence || 'none',
      rollover: !!rollover,
      alertThreshold: alertThreshold || 90,
    });

    await budget.save();
    console.log(`Budget created: ${budget._id} for user ${req.user.id}`);
    sendResponse(res, 201, true, budget, 'Budget created successfully');
  } catch (error) {
    console.error('Create budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to create budget: ${error.message}`);
  }
};

// Get all budgets for the user
export const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, budgets, 'Budgets retrieved successfully');
  } catch (error) {
    console.error('Get budgets error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budgets: ${error.message}`);
  }
};

// Get a single budget by ID
export const getBudgetById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid budget ID');
    }
    sendResponse(res, 200, true, req.budget, 'Budget retrieved successfully');
  } catch (error) {
    console.error('Get budget by ID error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget: ${error.message}`);
  }
};

// Update a budget
export const updateBudget = async (req, res) => {
  try {
    const { category, amount, currency, period, customPeriod, recurrence, rollover, alertThreshold } = req.body;
    const budget = req.budget;

    if (period === 'custom' && (!customPeriod?.startDate || !customPeriod?.endDate)) {
      return sendResponse(res, 400, false, null, 'Custom period requires startDate and endDate');
    }
    if (period === 'custom' && new Date(customPeriod.startDate) >= new Date(customPeriod.endDate)) {
      return sendResponse(res, 400, false, null, 'startDate must be before endDate');
    }

    budget.category = category || budget.category;
    budget.amount = amount !== undefined ? amount : budget.amount;
    budget.currency = currency || budget.currency;
    budget.period = period || budget.period;
    budget.customPeriod = period === 'custom' ? {
      startDate: new Date(customPeriod?.startDate),
      endDate: new Date(customPeriod?.endDate),
    } : budget.customPeriod;
    budget.recurrence = recurrence || budget.recurrence;
    budget.rollover = rollover !== undefined ? rollover : budget.rollover;
    budget.alertThreshold = alertThreshold !== undefined ? alertThreshold : budget.alertThreshold;

    await budget.save();
    console.log(`Budget updated: ${budget._id} for user ${req.user.id}`);
    sendResponse(res, 200, true, budget, 'Budget updated successfully');
  } catch (error) {
    console.error('Update budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to update budget: ${error.message}`);
  }
};

// Delete a budget
export const deleteBudget = async (req, res) => {
  try {
    await req.budget.deleteOne();
    console.log(`Budget deleted: ${req.budget._id} for user ${req.user.id}`);
    sendResponse(res, 200, true, null, 'Budget deleted successfully');
  } catch (error) {
    console.error('Delete budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to delete budget: ${error.message}`);
  }
};

// Get budget status (spending tracking)
export const getBudgetStatus = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id });
    if (!budgets.length) {
      return sendResponse(res, 200, true, [], 'No budgets found');
    }

    const status = await Promise.all(budgets.map(async (budget) => {
      const { startDate, endDate } = getPeriodDates(budget.period, budget.customPeriod);
      const transactions = await Transaction.find({
        user: req.user.id,
        type: 'expense',
        category: budget.category,
        date: { $gte: startDate, $lte: endDate },
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const alertTriggered = percentage >= budget.alertThreshold;

      return {
        id: budget._id,
        category: budget.category,
        budgeted: budget.amount,
        currency: budget.currency,
        spent,
        remaining,
        percentage,
        period: budget.period,
        periodDates: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        recurrence: budget.recurrence,
        rollover: budget.rollover,
        alertThreshold: budget.alertThreshold,
      };
    }));

    sendResponse(res, 200, true, status, 'Budget status retrieved successfully');
  } catch (error) {
    console.error('Get budget status error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget status: ${error.message}`);
  }
};

// Get budget insights (for visualizations)
export const getBudgetInsights = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id });
    if (!budgets.length) {
      return sendResponse(res, 200, true, { categories: [], spending: [] }, 'No budgets found');
    }

    const insights = await Promise.all(budgets.map(async (budget) => {
      const { startDate, endDate } = getPeriodDates(budget.period, budget.customPeriod);
      const transactions = await Transaction.find({
        user: req.user.id,
        type: 'expense',
        category: budget.category,
        date: { $gte: startDate, $lte: endDate },
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        category: budget.category,
        budgeted: budget.amount,
        spent,
      };
    }));

    const categories = insights.map(i => i.category);
    const spending = insights.map(i => ({
      category: i.category,
      budgeted: i.budgeted,
      spent: i.spent,
    }));

    sendResponse(res, 200, true, { categories, spending }, 'Budget insights retrieved successfully');
  } catch (error) {
    console.error('Get budget insights error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget insights: ${error.message}`);
  }
};

// Handle recurring budgets
export const handleRecurringBudgets = () => {
  cron.schedule('0 0 1 * *', async () => {
    try {
      const now = new Date();
      const budgets = await Budget.find({ recurrence: { $ne: 'none' } });

      if (!budgets.length) {
        console.log('No recurring budgets to process');
        return;
      }

      for (const budget of budgets) {
        const { startDate, endDate } = getPeriodDates(budget.period, budget.customPeriod);
        if (endDate >= now) continue;

        let newAmount = budget.amount;
        if (budget.rollover) {
          const transactions = await Transaction.find({
            user: budget.user,
            type: 'expense',
            category: budget.category,
            date: { $gte: startDate, $lte: endDate },
          });
          const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
          const remaining = budget.amount - spent;
          newAmount += remaining > 0 ? remaining : 0;
        }

        const newPeriod = getPeriodDates(budget.period, budget.customPeriod);
        const newBudget = new Budget({
          user: budget.user,
          category: budget.category,
          amount: newAmount,
          currency: budget.currency,
          period: budget.period,
          customPeriod: budget.period === 'custom' ? newPeriod : undefined,
          recurrence: budget.recurrence,
          rollover: budget.rollover,
          alertThreshold: budget.alertThreshold,
        });

        await newBudget.save();
        console.log(`Recurring budget created: ${newBudget._id} for user ${budget.user}`);
      }
      console.log('Recurring budgets processed successfully');
    } catch (error) {
      console.error('Recurring budgets error:', error.message);
    }
  });
};

// Export Budgets as CSV
export const exportBudgets = async (req, res) => {
  try {
    if (!req.user?.id) {
      console.warn('Unauthorized access to export CSV: No user ID');
      return sendResponse(res, 401, false, null, 'Unauthorized: Please log in');
    }

    console.log(`Starting CSV export for user: ${req.user.id}`);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="budgets.csv"',
    });

    const cursor = Budget.find({ user: req.user.id }).cursor();
    const csvStream = createCsvStream({
      headers: ['category', 'amount', 'currency', 'period', 'startDate', 'endDate', 'recurrence', 'rollover', 'alertThreshold'],
    });

    cursor
      .on('data', (b) => {
        const { startDate, endDate } = getPeriodDates(b.period, b.customPeriod);
        csvStream.write({
          category: b.category || '',
          amount: b.amount != null ? b.amount : 0,
          currency: b.currency || 'USD',
          period: b.period || '',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          recurrence: b.recurrence || 'none',
          rollover: b.rollover ? 'Yes' : 'No',
          alertThreshold: b.alertThreshold || 90,
        });
      })
      .on('error', (error) => {
        console.error('CSV cursor error:', error.message);
        if (!res.headersSent) {
          sendResponse(res, 500, false, null, 'Failed to export CSV');
        }
      })
      .on('end', () => {
        csvStream.end();
        console.log('CSV export completed');
      });

    csvStream
      .on('error', (error) => {
        console.error('CSV write stream error:', error.message);
      })
      .pipe(res);
  } catch (error) {
    console.error('Export CSV error:', error.message);
    if (!res.headersSent) {
      sendResponse(res, 500, false, null, `Failed to export CSV: ${error.message}`);
    }
  }
};

// Export Budgets as PDF
export const exportBudgetsAsPDF = async (req, res) => {
  try {
    if (!req.user?.id) {
      console.warn('Unauthorized access to export PDF: No user ID');
      return sendResponse(res, 401, false, null, 'Unauthorized: Please log in');
    }

    console.log(`Starting PDF export for user: ${req.user.id}`);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="budgets.pdf"',
    });

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(16).text('Budget Report', { align: 'center' });
    doc.moveDown();

    const budgets = await Budget.find({ user: req.user.id });
    let yPosition = doc.y;

    budgets.forEach((b, index) => {
      const { startDate, endDate } = getPeriodDates(b.period, b.customPeriod);
      doc.fontSize(12).text(`Budget ${index + 1}`, { align: 'left' });
      doc.text(`Category: ${b.category || '-'}`);
      doc.text(`Amount: ${b.amount != null ? b.amount.toFixed(2) : '0.00'} ${b.currency || 'USD'}`);
      doc.text(`Period: ${b.period || '-'}`);
      doc.text(`Start Date: ${startDate.toLocaleDateString()}`);
      doc.text(`End Date: ${endDate.toLocaleDateString()}`);
      doc.text(`Recurrence: ${b.recurrence || 'none'}`);
      doc.text(`Rollover: ${b.rollover ? 'Yes' : 'No'}`);
      doc.text(`Alert Threshold: ${b.alertThreshold}%`);
      doc.moveDown();
      yPosition = doc.y;
      if (yPosition > 700) {
        doc.addPage();
        yPosition = doc.y;
      }
    });

    doc.end();
    console.log('PDF export completed');

    doc.on('error', (error) => {
      console.error('PDF document error:', error.message);
      if (!res.headersSent) {
        sendResponse(res, 500, false, null, 'Failed to export PDF');
      }
    });
  } catch (error) {
    console.error('Export PDF error:', error.message);
    if (!res.headersSent) {
      sendResponse(res, 500, false, null, `Failed to export PDF: ${error.message}`);
    }
  }
};