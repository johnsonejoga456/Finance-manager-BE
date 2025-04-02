import Notification from '../models/notificationModel.js';
import Transaction from '../models/transactionModel.js';
import Budget from '../models/budgetModel.js'; // Assuming you already have a budget model

// Notify users when they are close to or exceed the budget limit
export const checkBudgetLimitNotifications = async (userId) => {
    const budget = await Budget.findOne({ userId });
    const transactions = await Transaction.find({ userId });

    // Calculate total expenses
    const totalExpenses = transactions
        .filter(txn => txn.type === 'expense')
        .reduce((sum, txn) => sum + txn.amount, 0);

    if (totalExpenses >= budget.amount * 0.9) {
        // Send notification for exceeding 90% of budget
        const message = `You have spent 90% or more of your budget!`;
        await Notification.create({ userId, message, type: 'budget' });
    }
};

// Notify users of upcoming recurring transactions
export const checkUpcomingRecurringTransactions = async (userId) => {
    const today = new Date();
    const recurringTransactions = await Transaction.find({
        userId,
        isRecurring: true
    });

    recurringTransactions.forEach(async (txn) => {
        const nextDate = calculateNextDate(txn); // Implement this to calculate the next recurring date
        if (isWithinNextWeek(nextDate, today)) {
            const message = `Your recurring transaction for ${txn.category} is coming up soon.`;
            await Notification.create({ userId, message, type: 'recurring' });
        }
    });
};

// Helper: Check if a date is within the next 7 days
const isWithinNextWeek = (nextDate, today) => {
    const diffTime = Math.abs(nextDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
};
