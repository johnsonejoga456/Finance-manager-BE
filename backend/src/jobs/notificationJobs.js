import cron from 'node-cron';
import { checkBudgetLimitNotifications, checkUpcomingRecurringTransactions } from '../services/notificationService.js';

cron.schedule('0 0 * * *', async () => {
    // Run this every day at midnight
    const users = await User.find(); // Fetch all users
    for (const user of users) {
        await checkBudgetLimitNotifications(user._id);
        await checkUpcomingRecurringTransactions(user._id);
    }
});
