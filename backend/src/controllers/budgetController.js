import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import winston from 'winston';
import cron from 'node-cron';

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ],
});

// Standardized response helper
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Calculate period dates
const getPeriodDates = (period, customPeriod) => {
  const now = new Date();
  let startDate, endDate;
  switch (period) {
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    case 'custom':
      startDate = new Date(customPeriod?.startDate);
      endDate = new Date(customPeriod?.endDate);
      break;
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  return { startDate, endDate };
};

// Create a new budget
export const createBudget = async (req, res) => {
  try {
    const { category, amount, currency, period, customPeriod, recurrence, rollover, alertThreshold } = req.body;

    // Validate input
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
      currency,
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
    logger.info(`Budget created: ${budget._id} for user ${req.user.id}`);
    sendResponse(res, 201, true, budget, 'Budget created successfully');
  } catch (error) {
    logger.error('Create budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to create budget: ${error.message}`);
  }
};

// Get all budgets for the user
export const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, budgets, 'Budgets retrieved successfully');
  } catch (error) {
    logger.error('Get budgets error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budgets: ${error.message}`);
  }
};

// Get a single budget by ID
export const getBudgetById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid budget ID');
    }
    const budget = req.budget;
    sendResponse(res, 200, true, budget, 'Budget retrieved successfully');
  } catch (error) {
    logger.error('Get budget by ID error:', error.message);
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
    logger.info(`Budget updated: ${budget._id} for user ${req.user.id}`);
    sendResponse(res, 200, true, budget, 'Budget updated successfully');
  } catch (error) {
    logger.error('Update budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to update budget: ${error.message}`);
  }
};

// Delete a budget
export const deleteBudget = async (req, res) => {
  try {
    const budget = req.budget;
    await budget.deleteOne();
    logger.info(`Budget deleted: ${budget._id} for user ${req.user.id}`);
    sendResponse(res, 200, true, null, 'Budget deleted successfully');
  } catch (error) {
    logger.error('Delete budget error:', error.message);
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
        periodDates: { startDate, endDate },
        recurrence: budget.recurrence,
        rollover: budget.rollover,
        alertTriggered,
      };
    }));

    sendResponse(res, 200, true, status, 'Budget status retrieved successfully');
  } catch (error) {
    logger.error('Get budget status error:', error.message);
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
      budgeted: i.budgeted,
      spent: i.spent,
    }));

    sendResponse(res, 200, true, { categories, spending }, 'Budget insights retrieved successfully');
  } catch (error) {
    logger.error('Get budget insights error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget insights: ${error.message}`);
  }
};

// Handle recurring budgets
export const handleRecurringBudgets = () => {
  cron.schedule('0 0 1 * *', async () => { // Run monthly on the 1st
    try {
      const now = new Date();
      const budgets = await Budget.find({ recurrence: { $ne: 'none' } });

      for (const budget of budgets) {
        const { startDate, endDate } = getPeriodDates(budget.period, budget.customPeriod);
        let shouldRenew = false;

        switch (budget.recurrence) {
          case 'daily':
            shouldRenew = true;
            break;
          case 'weekly':
            shouldRenew = now.getDay() === 0; // Renew on Sunday
            break;
          case 'monthly':
            shouldRenew = now.getDate() === 1;
            break;
        }

        if (shouldRenew && endDate < now) {
          const newPeriod = getPeriodDates(budget.period, budget.customPeriod);
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
          logger.info(`Recurring budget created: ${newBudget._id} for user ${budget.user}`);
        }
      }
      logger.info('Recurring budgets processed successfully');
    } catch (error) {
      logger.error('Recurring budgets error:', error.message);
    }
  });
};