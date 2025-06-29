import asyncHandler from 'express-async-handler';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goals.js';
import Debt from '../models/Debt.js';
import Investment from '../models/Investment.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log(`Fetching dashboard data for user: ${userId}`);

  // Accounts summary
  const accounts = await Account.find({ user: userId });
  if (!accounts.length) console.log('No accounts found for user');
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const topAccounts = accounts
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
    .slice(0, 3);

  // Transactions summary
  const recentTransactions = await Transaction.find({ user: userId })
    .sort({ date: -1 })
    .limit(5);
  if (!recentTransactions.length) console.log('No transactions found for user');
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const totalSpentThisMonth = await Transaction.aggregate([
    { $match: { user: userId, type: 'expense', date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Budgets summary
  const activeBudgets = await Budget.find({ user: userId });
  if (!activeBudgets.length) console.log('No budgets found for user');
  const budgetsWithSpent = await Promise.all(
    activeBudgets.map(async (budget) => {
      const spent = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'expense',
            category: budget.category,
            date: {
              $gte: budget.period === 'monthly' ? startOfMonth : new Date(budget.createdAt),
              $lte: budget.customPeriod?.endDate || new Date(),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return {
        ...budget.toObject(),
        spent: spent[0]?.total || 0,
        limit: budget.amount,
      };
    })
  );
  const overBudget = budgetsWithSpent.some(b => (b.spent || 0) > (b.limit || 0));

  // Goals summary
  const activeGoals = await Goal.find({ user: userId, status: 'in-progress' }).limit(3);
  if (!activeGoals.length) console.log('No goals found for user');

  // Debts summary
  const debts = await Debt.find({ user: userId });
  if (!debts.length) console.log('No debts found for user');
  const totalDebt = debts.reduce((sum, debt) => sum + (debt.balance || 0), 0);
  const nextPayment = debts
    .filter(debt => debt.dueDate && new Date(debt.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null;

  // Investments summary
  const investments = await Investment.find({ userId });
  if (!investments.length) console.log('No investments found for user');
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  const recentInvestments = investments
    .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
    .slice(0, 3);

  const response = {
    accounts: {
      totalBalance,
      topAccounts,
    },
    transactions: {
      recent: recentTransactions,
      totalSpentThisMonth: totalSpentThisMonth[0]?.total || 0,
    },
    budgets: {
      activeBudgets: budgetsWithSpent,
      overBudget,
    },
    goals: {
      activeGoals,
    },
    debts: {
      totalDebt,
      nextPayment,
    },
    investments: {
      totalValue: totalInvestmentValue,
      recentInvestments,
    },
  };

  console.log('Dashboard summary response:', JSON.stringify(response, null, 2));
  res.json(response);
});