import Transaction from '../models/Transaction.js';
import cron from 'node-cron';
import { createObjectCsvWriter } from 'csv-writer';
import puppeteer from 'puppeteer';
import CurrencyConverter from 'currency-converter-lt';
import { Readable } from 'stream';
import Plaid from 'plaid';
import BankAccount from '../models/BankAccount.js';

// Utility to convert currency to USD
const convertToUSD = async (amount, fromCurrency) => {
  if (fromCurrency === 'USD') return amount;
  const converter = new CurrencyConverter({ CLIENTKEY: process.env.CURRENCY_API_KEY });
  return await converter.from(fromCurrency).to('USD').amount(amount).convert();
};

// Standardized response helper
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Add Transaction (Unified with notes, tags, currency, recurrence)
export const addTransaction = async (req, res) => {
  try {
    const { type, subType, amount, category, date, notes, tags, recurrence, currency = 'USD', splitTransactions } = req.body;

    const convertedAmount = await convertToUSD(amount, currency);
    const transaction = new Transaction({
      user: req.user.id,
      type,
      subType: subType || null,
      amount: splitTransactions ? splitTransactions.reduce((sum, split) => sum + split.amount, 0) : convertedAmount,
      originalAmount: amount,
      currency,
      category,
      date: date || Date.now(),
      notes,
      tags,
      recurrence,
      splitTransactions: splitTransactions || [],
    });

    await transaction.save();
    sendResponse(res, 201, true, transaction, 'Transaction added successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Transactions
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
        { notes: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ];
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    sendResponse(res, 200, true, transactions);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Single Transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).where({ user: req.user.id });
    if (!transaction) {
      return sendResponse(res, 404, false, null, 'Transaction not found');
    }
    sendResponse(res, 200, true, transaction);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Update Transaction (including splits)
export const updateTransaction = async (req, res) => {
  try {
    const { type, subType, amount, category, notes, tags, recurrence, currency, splitTransactions } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) return sendResponse(res, 404, false, null, 'Transaction not found');
    if (transaction.user.toString() !== req.user.id) return sendResponse(res, 401, false, null, 'Not authorized');

    const convertedAmount = currency && amount ? await convertToUSD(amount, currency) : transaction.amount;
    Object.assign(transaction, {
      type: type || transaction.type,
      subType: subType || transaction.subType,
      amount: splitTransactions ? splitTransactions.reduce((sum, split) => sum + split.amount, 0) : convertedAmount,
      originalAmount: amount || transaction.originalAmount,
      currency: currency || transaction.currency,
      category: category || transaction.category,
      notes: notes || transaction.notes,
      tags: tags || transaction.tags,
      recurrence: recurrence || transaction.recurrence,
      splitTransactions: splitTransactions || transaction.splitTransactions,
    });

    await transaction.save();
    sendResponse(res, 200, true, transaction, 'Transaction updated successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Delete Transaction
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).where({ user: req.user.id });
    if (!transaction) return sendResponse(res, 404, false, null, 'Transaction not found');
    await transaction.deleteOne();
    sendResponse(res, 200, true, null, 'Transaction deleted successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Bulk Actions (Categorize, Tag, Delete)
export const bulkUpdateTransactions = async (req, res) => {
  try {
    const { transactionIds, category, tags, action } = req.body;
    if (!transactionIds || !Array.isArray(transactionIds)) {
      return sendResponse(res, 400, false, null, 'transactionIds must be an array');
    }

    const transactions = await Transaction.find({ _id: { $in: transactionIds }, user: req.user.id });
    if (transactions.length !== transactionIds.length) {
      return sendResponse(res, 404, false, null, 'Some transactions not found or not authorized');
    }

    if (action === 'delete') {
      await Transaction.deleteMany({ _id: { $in: transactionIds } });
      return sendResponse(res, 200, true, null, 'Transactions deleted successfully');
    }

    const updates = {};
    if (category) updates.category = category;
    if (tags) updates.tags = tags;

    const updatedTransactions = await Transaction.updateMany(
      { _id: { $in: transactionIds } },
      { $set: updates },
      { new: true }
    );

    sendResponse(res, 200, true, updatedTransactions, 'Transactions updated successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Handle Recurring Transactions
export const handleRecurringTransactions = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const recurringTransactions = await Transaction.find({ recurrence: { $exists: true, $ne: null } });
      const now = new Date();

      for (const transaction of recurringTransactions) {
        const createdDate = new Date(transaction.createdAt);
        let shouldCreate = false;

        switch (transaction.recurrence) {
          case 'daily':
            shouldCreate = true;
            break;
          case 'weekly':
            shouldCreate = now.getDay() === createdDate.getDay();
            break;
          case 'monthly':
            shouldCreate = now.getDate() === createdDate.getDate();
            break;
        }

        if (shouldCreate) {
          const newTransaction = new Transaction({
            user: transaction.user,
            type: transaction.type,
            subType: transaction.subType,
            amount: transaction.amount,
            originalAmount: transaction.originalAmount,
            currency: transaction.currency,
            category: transaction.category,
            date: now,
            notes: transaction.notes,
            tags: transaction.tags,
          });
          await newTransaction.save();
        }
      }
      console.log('Recurring transactions processed successfully');
    } catch (error) {
      console.error('Error in recurring transactions:', error.message);
    }
  });
};

// Search Transactions
export const searchTransactions = async (req, res) => {
  try {
    const { startDate, endDate, minAmount, maxAmount, category, type, tags } = req.query;
    const filters = { user: req.user.id };

    if (startDate || endDate) filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (minAmount || maxAmount) filters.amount = { $gte: Number(minAmount), $lte: Number(maxAmount) };
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (tags) filters.tags = { $in: tags.split(',') };

    const transactions = await Transaction.find(filters).sort({ date: -1 });
    sendResponse(res, 200, true, transactions);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Export Transactions as CSV (Streamed)
export const exportTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    const csvWriter = createObjectCsvWriter({
      header: [
        { id: 'type', title: 'Type' },
        { id: 'amount', title: 'Amount' },
        { id: 'currency', title: 'Currency' },
        { id: 'category', title: 'Category' },
        { id: 'date', title: 'Date' },
        { id: 'notes', title: 'Notes' },
      ],
    });

    const csvStream = csvWriter.streamify(transactions);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=transactions.csv',
    });
    csvStream.pipe(res);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Export Transactions as PDF (Streamed)
export const exportTransactionsAsPDF = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    const htmlContent = `
      <h1>Transaction Report</h1>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><th>Type</th><th>Amount</th><th>Category</th><th>Date</th></tr>
        ${transactions.map(t => `
          <tr>
            <td>${t.type}</td>
            <td>${t.amount} ${t.currency}</td>
            <td>${t.category}</td>
            <td>${new Date(t.date).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </table>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=transactions.pdf',
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Budget Status
export const getBudgetStatus = async (req, res) => {
  try {
    const { budget } = req.query;
    if (!budget) return sendResponse(res, 400, false, null, 'Budget parameter is required');
    
    const transactions = await Transaction.find({ user: req.user.id, type: 'expense' });
    const totalExpenses = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const remainingBudget = Number(budget) - totalExpenses;

    sendResponse(res, 200, true, { totalExpenses, remainingBudget, budget });
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Total Income and Expenses
export const getTotalIncomeAndExpenses = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    sendResponse(res, 200, true, { totalIncome, totalExpenses });
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Income vs. Expenses Report
export const getIncomeVsExpensesReport = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    const report = {
      income: transactions.filter(t => t.type === 'income').map(t => ({ date: t.date, amount: t.amount, category: t.category })),
      expenses: transactions.filter(t => t.type === 'expense').map(t => ({ date: t.date, amount: t.amount, category: t.category })),
    };

    sendResponse(res, 200, true, report);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get Categorical Expense Breakdown
export const getCategoricalExpenseBreakdown = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id, type: 'expense' });
    const breakdown = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    sendResponse(res, 200, true, breakdown);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

const plaidClient = new Plaid.Client({
  clientID: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  env: process.env.PLAID_ENV === 'sandbox' ? Plaid.environments.sandbox : Plaid.environments.development,
});

// Generate Plaid Link Token
export const getPlaidLinkToken = async (req, res) => {
  try {
    const response = await plaidClient.createLinkToken({
      user: { client_user_id: req.user.id },
      client_name: 'Finance Manager',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    sendResponse(res, 200, true, response.link_token);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Exchange Public Token for Access Token
export const exchangePlaidToken = async (req, res) => {
  try {
    const { publicToken } = req.body;
    const response = await plaidClient.exchangePublicToken(publicToken);
    const bankAccount = new BankAccount({
      user: req.user.id,
      accessToken: response.access_token,
      itemId: response.item_id,
    });
    await bankAccount.save();
    await syncBankTransactions(response.access_token, req.user.id);
    sendResponse(res, 200, true, null, 'Bank account linked successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};

// Sync Transactions from Plaid
const syncBankTransactions = async (accessToken, userId) => {
  const response = await plaidClient.getTransactions(accessToken, '2023-01-01', new Date().toISOString().split('T')[0], { count: 100 });
  const transactions = response.transactions.map(t => ({
    user: userId,
    type: t.amount > 0 ? 'expense' : 'income',
    amount: Math.abs(t.amount),
    category: t.category ? t.category[0] : 'Uncategorized',
    notes: t.name,
    date: t.date,
    currency: t.iso_currency_code || 'USD',
  }));

  await Transaction.insertMany(transactions, { ordered: false });
};

// Manual Sync Endpoint
export const syncBankTransactionsManual = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user: req.user.id });
    for (const account of accounts) {
      await syncBankTransactions(account.accessToken, req.user.id);
    }
    sendResponse(res, 200, true, null, 'Transactions synced successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
};