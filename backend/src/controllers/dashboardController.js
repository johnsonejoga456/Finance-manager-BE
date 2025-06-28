// controllers/dashboardController.js

import asyncHandler from 'express-async-handler';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goals.js';
import Debt from '../models/Debt.js';
import Investment from '../models/Investment.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Accounts summary
    const accounts = await Account.find({ userId });
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const topAccounts = accounts
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 3);

    // Transactions summary
    const recentTransactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(5);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalSpentThisMonth = await Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Budgets summary
    const activeBudgets = await Budget.find({ userId });
    const overBudget = activeBudgets.some(budget => budget.spent > budget.limit);

    // Goals summary
    const activeGoals = await Goal.find({ userId }).limit(3);

    // Debts summary
    const debts = await Debt.find({ userId });
    const totalDebt = debts.reduce((sum, debt) => sum + (debt.amountRemaining || 0), 0);
    const nextPayment = debts
        .flatMap(debt => debt.payments || [])
        .filter(payment => new Date(payment.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null;

    // Investments summary
    const investments = await Investment.find({ userId });
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const topInvestments = investments
        .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
        .slice(0, 3);

    res.json({
        accounts: {
            totalBalance,
            topAccounts,
        },
        transactions: {
            recent: recentTransactions,
            totalSpentThisMonth: totalSpentThisMonth[0]?.total || 0,
        },
        budgets: {
            activeBudgets,
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
            topInvestments,
        },
    });
});