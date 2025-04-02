// Corrected `dashboardController.js`
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import User from "../models/User.js";

// Updated dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch transactions
    const transactions = await Transaction.find({ user: userId });

    // Total income and expenses
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Net balance
    const netBalance = totalIncome - totalExpenses;

    // Categorical expense breakdown
    const categoryBreakdown = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    // Recurring transactions
    const recurringTransactions = transactions.filter((t) => t.recurrence);

    // Budget usage
    const budgets = await Budget.find({ user: userId });
    const budgetSummary = budgets.map((b) => ({
      category: b.category,
      budget: b.amount,
      spent: transactions
        .filter((t) => t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    }));

    const user = await User.findById(userId);

    // Response
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
      },
      categoryBreakdown,
      recurringTransactions,
      budgetSummary,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};
