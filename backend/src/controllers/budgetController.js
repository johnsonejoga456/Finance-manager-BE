import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

// Standardized response helper (reused from transactionController.js)
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Create a new budget
export const createBudget = async (req, res) => {
  try {
    const { category, amount, period, recurrence } = req.body;

    // Validate input
    if (!category || !amount || !period || !period.startDate || !period.endDate) {
      return sendResponse(res, 400, false, null, 'Missing required fields: category, amount, period');
    }
    if (new Date(period.startDate) >= new Date(period.endDate)) {
      return sendResponse(res, 400, false, null, 'startDate must be before endDate');
    }

    const budget = new Budget({
      user: req.user.id,
      category,
      amount,
      period: {
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
      },
      recurrence: recurrence || 'none',
    });

    await budget.save();
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
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return sendResponse(res, 404, false, null, 'Budget not found');
    }
    if (budget.user.toString() !== req.user.id) {
      return sendResponse(res, 401, false, null, 'Not authorized');
    }
    sendResponse(res, 200, true, budget, 'Budget retrieved successfully');
  } catch (error) {
    console.error('Get budget by ID error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget: ${error.message}`);
  }
};

// Update a budget
export const updateBudget = async (req, res) => {
  try {
    const { category, amount, period, recurrence } = req.body;
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return sendResponse(res, 404, false, null, 'Budget not found');
    }
    if (budget.user.toString() !== req.user.id) {
      return sendResponse(res, 401, false, null, 'Not authorized');
    }

    // Validate input
    if (period && (!period.startDate || !period.endDate)) {
      return sendResponse(res, 400, false, null, 'Period must include startDate and endDate');
    }
    if (period && new Date(period.startDate) >= new Date(period.endDate)) {
      return sendResponse(res, 400, false, null, 'startDate must be before endDate');
    }

    // Update fields
    budget.category = category || budget.category;
    budget.amount = amount !== undefined ? amount : budget.amount;
    budget.period = period ? {
      startDate: new Date(period.startDate),
      endDate: new Date(period.endDate),
    } : budget.period;
    budget.recurrence = recurrence || budget.recurrence;

    await budget.save();
    sendResponse(res, 200, true, budget, 'Budget updated successfully');
  } catch (error) {
    console.error('Update budget error:', error.message);
    sendResponse(res, 500, false, null, `Failed to update budget: ${error.message}`);
  }
};

// Delete a budget
export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return sendResponse(res, 404, false, null, 'Budget not found');
    }
    if (budget.user.toString() !== req.user.id) {
      return sendResponse(res, 401, false, null, 'Not authorized');
    }

    await budget.deleteOne();
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
      const transactions = await Transaction.find({
        user: req.user.id,
        type: 'expense',
        category: budget.category,
        date: {
          $gte: new Date(budget.period.startDate),
          $lte: new Date(budget.period.endDate),
        },
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        id: budget._id,
        category: budget.category,
        budgeted: budget.amount,
        spent,
        remaining,
        percentage,
        period: budget.period,
        recurrence: budget.recurrence,
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
      const transactions = await Transaction.find({
        user: req.user.id,
        type: 'expense',
        category: budget.category,
        date: {
          $gte: new Date(budget.period.startDate),
          $lte: new Date(budget.period.endDate),
        },
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
    console.error('Get budget insights error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve budget insights: ${error.message}`);
  }
};