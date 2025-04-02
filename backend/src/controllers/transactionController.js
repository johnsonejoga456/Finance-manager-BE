import Transaction from '../models/Transaction.js';
import cron from 'node-cron';
import { createObjectCsvWriter } from 'csv-writer';

export const addTransaction = async (req, res) => {
    try {
        const {
            type,
            amount,
            category,
            date,
            note,
            recurrence,
            currency = 'USD' } = req.body;

        // Convert to USD if necessary
        let convertedAmount = amount;
        if (currency !== 'USD') {
            convertedAmount = await convertToUSD(amount, currency);
        }

        const transaction = new Transaction({
            user: req.user.id,
            type,
            subType: req.body.subType || null,
            amount: convertedAmount,
            originalAmount: amount,
            currency,
            category,
            date,
            note,
            recurrence,
        });

        await transaction.save();
        res.status(201).json({ message: 'Transaction added successfully', transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get  transaction
export const getTransactions = async (req, res) => {
    try {
        const { type, category, dateRange, query } = req.query;
        const filter = { user: req.user.id };

        if (type) filter.type = type;
        if (category) filter.category = category;
        if (dateRange) {
            const [startDate, endDate] = dateRange.split(',');
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (query) {
            filter.$or = [
                { note: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
            ];
        }

        const transactions = await Transaction.find(filter).sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Add recurring transaction
export const addRecurringTransaction = async (req, res) => {
    try {
        const { type, amount, category, recurrence } = req.body;
        const transaction = new Transaction({
            type,
            amount,
            category,
            recurrence, // 'daily', 'weekly', 'monthly'
            user: req.user.id
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        await transaction.remove();
        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting transaction', error });
    }
};

// Update transaction to handle types and subtypes
export const updateTransaction = async (req, res) => {
    try {
        const { type, subType, amount, category, notes, tags, recurrence } = req.body;

        // Find the transaction by ID
        const transaction = await Transaction.findById(req.params.id);

        // Check if the transaction exists
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if the transaction belongs to the logged-in user
        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Update the transaction details
        transaction.type = type || transaction.type;
        transaction.subType = subType || transaction.subType;
        transaction.amount = amount || transaction.amount;
        transaction.category = category || transaction.category;
        transaction.notes = notes || transaction.notes;
        transaction.tags = tags || transaction.tags;
        transaction.recurrence = recurrence || transaction.recurrence;

        // Save the updated transaction
        await transaction.save();

        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Update recurring transactions on a schedule
export const handleRecurringTransactions = () => {
    cron.schedule('0 0 * * *', async () => {
        try {
            const transactions = await Transaction.find({ recurrence: { $exists: true } });
            transactions.forEach(async (transaction) => {
                if (transaction.recurrence === 'daily' || 
                    (transaction.recurrence === 'weekly' && new Date().getDay() === transaction.createdAt.getDay()) ||
                    (transaction.recurrence === 'monthly' && new Date().getDate() === transaction.createdAt.getDate())) {
                    
                    const newTransaction = new Transaction({
                        type: transaction.type,
                        amount: transaction.amount,
                        category: transaction.category,
                        user: transaction.user,
                        date: new Date()
                    });
                    await newTransaction.save();
                }
            });
        } catch (error) {
            console.log("Error in handling recurring transactions:", error.message);
        }
    });
};

// Add transaction with notes
export const addTransactionWithNotes = async (req, res) => {
    try {
        const { type, amount, category, notes } = req.body;
        const transaction = new Transaction({
            type,
            amount,
            category,
            notes,  // Adding notes
            user: req.user.id
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add transaction with tags
export const addTransactionWithTags = async (req, res) => {
    try {
        const { type, amount, category, tags } = req.body;
        const transaction = new Transaction({
            type,
            amount,
            category,
            tags,  // Array of tags
            user: req.user.id
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add transaction with multi-currency support
import CurrencyConverter from 'currency-converter-lt';

export const addTransactionWithCurrency = async (req, res) => {
    try {
        const { type, amount, category, currency } = req.body;
        const baseCurrency = 'USD';  // Set the base currency (USD in this case)

        // Initialize the currency converter
        const currencyConverter = new CurrencyConverter({ CLIENTKEY: process.env.CURRENCY_API_KEY });
        
        // Convert the amount from the original currency to the base currency (USD)
        const convertedAmount = await currencyConverter.from(currency).to(baseCurrency).amount(amount).convert();

        // Create the transaction with the converted amount
        const transaction = new Transaction({
            type,
            amount: convertedAmount, // Store the converted amount in base currency
            category,
            originalAmount: amount, // Optionally store the original amount
            currency, // Store the original currency
            user: req.user.id
        });

        // Save the transaction
        await transaction.save();
        
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




// Search and filter transactions
export const searchTransactions = async (req, res) => {
    try {
        const { startDate, endDate, minAmount, maxAmount, category, type } = req.query;
        const filters = { user: req.user.id };

        if (startDate || endDate) {
            filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (minAmount || maxAmount) {
            filters.amount = { $gte: minAmount, $lte: maxAmount };
        }
        if (category) {
            filters.category = category;
        }
        if (type) {
            filters.type = type;
        }

        const transactions = await Transaction.find(filters);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Export transactions as CSV
export const exportTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id });

        const csvWriter = createObjectCsvWriter({
            path: 'transactions.csv',
            header: [
                { id: 'type', title: 'TYPE' },
                { id: 'amount', title: 'AMOUNT' },
                { id: 'category', title: 'CATEGORY' },
                { id: 'date', title: 'DATE' },
            ],
        });

        await csvWriter.writeRecords(transactions);
        res.download('transactions.csv');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Export transactions as PDF
import puppeteer from 'puppeteer';

export const exportTransactionsAsPDF = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id });
        const htmlContent = transactions.map(transaction => `
            <p>${transaction.date}: ${transaction.type} - ${transaction.amount}</p>
        `).join('');

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=transactions.pdf',
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get budget status
export const getBudgetStatus = async (req, res) => {
    try {
        const { budget } = req.query; // User sets their budget in query params
        const transactions = await Transaction.find({ user: req.user.id, type: 'expense' });

        const totalExpenses = transactions.reduce((acc, curr) => acc + curr.amount, 0);
        const remainingBudget = budget - totalExpenses;

        res.json({ totalExpenses, remainingBudget, budget });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get total income and expenses
export const getTotalIncomeAndExpenses = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id });
        
        const totalIncome = transactions
            .filter(transaction => transaction.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const totalExpenses = transactions
            .filter(transaction => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        res.json({ totalIncome, totalExpenses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get income vs. expenses report
export const getIncomeVsExpensesReport = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id });

        const report = {
            income: [],
            expenses: []
        };

        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                report.income.push({ date: transaction.date, amount: transaction.amount, category: transaction.category });
            } else if (transaction.type === 'expense') {
                report.expenses.push({ date: transaction.date, amount: transaction.amount, category: transaction.category });
            }
        });

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get categorical breakdown of expenses
export const getCategoricalExpenseBreakdown = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id, type: 'expense' });

        const breakdown = transactions.reduce((acc, transaction) => {
            acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
            return acc;
        }, {});

        res.json(breakdown);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
