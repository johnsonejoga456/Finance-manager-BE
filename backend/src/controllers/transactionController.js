import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import cron from 'node-cron';
import { write as createCsvStream } from 'fast-csv';
import PDFDocument from 'pdfkit';
import CurrencyConverter from 'currency-converter-lt';
import { Readable } from 'stream';
import { parse } from 'csv-parse';

// Utility to convert currency to USD
const convertToUSD = async (amount, fromCurrency) => {
  try {
    if (fromCurrency === 'USD') return amount;
    const converter = new CurrencyConverter({ CLIENTKEY: process.env.CURRENCY_API_KEY });
    return await converter.from(fromCurrency).to('USD').amount(amount).convert();
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
};

// Standardized response helper
const sendResponse = (res, status, success, data = {}, message = '') => {
  res.status(status).json({ success, data, message });
};

// Update account balance based on transactions
const updateAccountBalance = async (accountId) => {
  try {
    const transactions = await Transaction.find({ account: accountId });
    let balance = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else if (['expense', 'transfer'].includes(tx.type)) {
        balance -= tx.amount;
      }
    });
    await Account.findByIdAndUpdate(accountId, { balance });
    console.log(`Updated balance for account ${accountId}: ${balance}`);
  } catch (error) {
    console.error('Error updating account balance:', error.message);
  }
};

// Add Transaction
export const addTransaction = async (req, res) => {
  try {
    const { type, subType, amount, category, date, notes, tags, recurrence, currency = 'USD', splitTransactions, account } = req.body;

    const convertedAmount = await convertToUSD(amount, currency);
    const transaction = new Transaction({
      user: req.user._id,
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
      account,
    });

    await transaction.save();
    if (account) await updateAccountBalance(account);
    sendResponse(res, 201, true, { transaction }, 'Transaction added successfully');
  } catch (error) {
    console.error('Add transaction error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get Transactions
export const getTransactions = async (req, res) => {
  try {
    const { type, category, dateRange, query, sort, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user._id };

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

    const transactions = await Transaction.find(filter)
      .sort(sort ? { [sort]: -1 } : { date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Transaction.countDocuments(filter);
    sendResponse(res, 200, true, { transactions, total });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get Single Transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).where({ user: req.user._id });
    if (!transaction) {
      return sendResponse(res, 404, false, {}, 'Transaction not found');
    }
    sendResponse(res, 200, true, { transaction });
  } catch (error) {
    console.error('Get transaction by ID:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Update Transaction
export const updateTransaction = async (req, res) => {
  try {
    const { type, subType, amount, currency, category, notes, tags, recurrence, splitTransactions, account } = req.body;
    const transaction = await Transaction.findById(req.params.id).where({ user: req.user._id });

    if (!transaction) {
      return sendResponse(res, 404, false, {}, 'Transaction not found');
    }

    const oldAccount = transaction.account;
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
      account: account || transaction.account,
    });

    await transaction.save();
    if (oldAccount) await updateAccountBalance(oldAccount);
    if (account && account !== oldAccount) await updateAccountBalance(account);
    sendResponse(res, 200, true, { transaction }, 'Transaction updated successfully');
  } catch (error) {
    console.error('Update transaction error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Delete Transaction
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).where({ user: req.user._id });
    if (!transaction) {
      return sendResponse(res, 404, false, {}, 'Transaction not found');
    }
    const accountId = transaction.account;
    await transaction.deleteOne();
    if (accountId) await updateAccountBalance(accountId);
    sendResponse(res, 200, true, {}, 'Transaction deleted successfully');
  } catch (error) {
    console.error('Delete transaction error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Bulk Update Transactions
export const bulkUpdateTransactions = async (req, res) => {
  try {
    const { transactionIds, category, tags, action } = req.body;
    if (!transactionIds || !Array.isArray(transactionIds)) {
      return sendResponse(res, 400, false, {}, 'transactionIds must be an array');
    }

    const transactions = await Transaction.find({ _id: { $in: transactionIds }, user: req.user._id });
    if (transactions.length !== transactionIds.length) {
      return sendResponse(res, 404, false, {}, 'Some transactions not found or not authorized');
    }

    const accountIds = transactions.map(t => t.account).filter(Boolean);
    if (action === 'delete') {
      await Transaction.deleteMany({ _id: { $in: transactionIds } });
      for (const accountId of new Set(accountIds)) {
        await updateAccountBalance(accountId);
      }
      return sendResponse(res, 200, true, {}, 'Transactions deleted successfully');
    }

    const updates = {};
    if (category) updates.category = category;
    if (tags) updates.tags = tags;

    await Transaction.updateMany(
      { _id: { $in: transactionIds } },
      { $set: updates }
    );
    for (const accountId of new Set(accountIds)) {
      await updateAccountBalance(accountId);
    }
    sendResponse(res, 200, true, {}, 'Transactions updated successfully');
  } catch (error) {
    console.error('Bulk update error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
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
            account: transaction.account,
          });
          await newTransaction.save();
          if (transaction.account) await updateAccountBalance(transaction.account);
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
    const { startDate, endDate, minAmount, maxAmount, category, type, tags, page = 1, limit = 10 } = req.query;
    const filters = { user: req.user._id };

    if (startDate || endDate) filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (minAmount || maxAmount) filters.amount = { $gte: Number(minAmount), $lte: Number(maxAmount) };
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (tags) filters.tags = { $in: tags.split(',') };

    const transactions = await Transaction.find(filters)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Transaction.countDocuments(filters);
    sendResponse(res, 200, true, { transactions, total });
  } catch (error) {
    console.error('Search transactions error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Export Transactions as CSV
export const exportTransactions = async (req, res) => {
  try {
    if (!req.user?._id) {
      console.warn('Unauthorized access to export CSV: No user ID');
      return sendResponse(res, 401, false, {}, 'Unauthorized: Please log in');
    }

    console.log(`Starting CSV export for user: ${req.user._id}`);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="transactions.csv"',
    });

    const transactions = await Transaction.find({ user: req.user._id }).limit(1000).lean();
    console.log(`Fetched ${transactions.length} transactions for CSV export`);

    if (!Array.isArray(transactions)) {
      console.error('Transactions is not an array:', transactions);
      return sendResponse(res, 500, false, {}, 'Invalid transaction data');
    }

    if (transactions.length === 0) {
      console.log('No transactions found for CSV export');
      const csvStream = createCsvStream({ headers: ['type', 'amount', 'currency', 'category', 'date', 'notes', 'account'] });
      csvStream.pipe(res);
      csvStream.end();
      return;
    }

    const csvStream = createCsvStream({
      headers: ['type', 'amount', 'currency', 'category', 'date', 'notes', 'account'],
    });

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      try {
        if (!t || typeof t !== 'object') {
          throw new Error(`Invalid transaction at index ${i}`);
        }
        console.log(`Processing transaction ${i + 1}: ${t._id}`);
        csvStream.write({
          type: t.type || '',
          amount: t.amount != null ? t.amount : 0,
          currency: t.currency || 'USD',
          category: t.category || '',
          date: t.date ? new Date(t.date).toLocaleDateString() : '',
          notes: t.notes || '',
          account: t.account || '',
        });
      } catch (error) {
        console.error(`Error processing transaction ${i + 1}: ${error.message}`);
      }
    }

    csvStream
      .on('error', (error) => {
        console.error(`CSV stream error: ${error.message}`);
      })
      .on('end', () => {
        console.log(`CSV export completed: ${transactions.length} transactions`);
      })
      .pipe(res);

    csvStream.end();
  } catch (error) {
    console.error(`Export CSV error: ${error.message}`);
    if (!res.headersSent) {
      sendResponse(res, 500, false, {}, `Failed to export CSV: ${error.message}`);
    }
  }
};

// Export Transactions as PDF
export const exportTransactionsAsPDF = async (req, res) => {
  try {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="transactions.pdf"',
    });

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(16).text('Transaction Report', { align: 'center' });
    doc.moveDown();

    const cursor = Transaction.find({ user: req.user._id }).limit(1000).cursor();
    let index = 0;

    cursor
      .on('data', (t) => {
        index++;
        doc.fontSize(12).text(`Transaction ${index}`);
        doc.text(`Type: ${t.type || '-'}`);
        doc.text(`Amount: ${t.amount || 0} ${t.currency || 'USD'}`);
        doc.text(`Category: ${t.category || '-'}`);
        doc.text(`Date: ${new Date(t.date).toLocaleDateString()}`);
        doc.text(`Notes: ${t.notes || '-'}`);
        doc.text(`Account: ${t.account || '-'}`);
        doc.moveDown();
      })
      .on('error', (error) => {
        console.error('PDF cursor error:', error.message);
        if (!res.headersSent) {
          sendResponse(res, 500, false, {}, 'Failed to export PDF');
        }
      })
      .on('end', () => {
        doc.end();
        console.log('PDF export completed');
      });

    doc.on('error', (error) => {
      console.error('PDF document error:', error.message);
    });
  } catch (error) {
    console.error('Export PDF error:', error.message);
    if (!res.headersSent) {
      sendResponse(res, 500, false, {}, error.message);
    }
  }
};

// Get Budget Status
export const getBudgetStatus = async (req, res) => {
  try {
    const { budget } = req.query;
    if (!budget) return sendResponse(res, 400, false, {}, 'Budget parameter is required');

    const transactions = await Transaction.find({ user: req.user._id, type: 'expense' }).limit(1000);
    const totalExpenses = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const remainingBudget = Number(budget) - totalExpenses;

    sendResponse(res, 200, true, { totalExpenses, remainingBudget, budget });
  } catch (error) {
    console.error('Get budget status error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get Total Income and Expenses
export const getTotalIncomeAndExpenses = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).limit(1000);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    sendResponse(res, 200, true, { totalIncome, totalExpenses });
  } catch (error) {
    console.error('Get income/expenses error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get Income vs. Expenses Report
export const getIncomeVsExpensesReport = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).limit(1000);
    const report = {
      income: transactions.filter(t => t.type === 'income').map(t => ({ date: t.date, amount: t.amount, category: t.category })),
      expenses: transactions.filter(t => t.type === 'expense').map(t => ({ date: t.date, amount: t.amount, category: t.category })),
    };

    sendResponse(res, 200, true, { report });
  } catch (error) {
    console.error('Get income vs expenses report error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get Categorical Expense Breakdown
export const getCategoricalExpenseBreakdown = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, type: 'expense' }).limit(1000);
    const breakdown = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    sendResponse(res, 200, true, { breakdown });
  } catch (error) {
    console.error('Get expense breakdown error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Import Transactions from CSV
export const importCSV = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return sendResponse(res, 400, false, {}, 'No file uploaded');
    }
    const file = req.files.file;
    const transactions = [];
    const accountIds = new Set();
    const stream = Readable.from(file.data.toString());
    stream
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (row) => {
        const tx = {
          user: req.user._id,
          type: row.type,
          subType: row.subType || null,
          amount: parseFloat(row.amount),
          originalAmount: parseFloat(row.originalAmount) || parseFloat(row.amount),
          currency: row.currency || 'USD',
          category: row.category,
          notes: row.notes || '',
          tags: row.tags ? row.tags.split(',') : [],
          recurrence: row.recurrence || null,
          date: new Date(row.date),
          account: row.account || null,
          splitTransactions: row.splitTransactions
            ? JSON.parse(row.splitTransactions).map(s => ({
                amount: parseFloat(s.amount),
                category: s.category,
                notes: s.notes || '',
              }))
            : [],
        };
        transactions.push(tx);
        if (tx.account) accountIds.add(tx.account);
      })
      .on('end', async () => {
        try {
          const savedTransactions = await Transaction.insertMany(transactions, { ordered: false });
          for (const accountId of accountIds) {
            await updateAccountBalance(accountId);
          }
          sendResponse(res, 200, true, { transactions: savedTransactions }, 'Transactions imported successfully');
        } catch (error) {
          console.error('CSV import save error:', error.message);
          sendResponse(res, 500, false, {}, `Failed to save transactions: ${error.message}`);
        }
      })
      .on('error', (error) => {
        console.error('CSV parse error:', error.message);
        sendResponse(res, 500, false, {}, `Failed to parse CSV: ${error.message}`);
      });
  } catch (error) {
    console.error('Import CSV error:', error.message);
    sendResponse(res, 500, false, {}, `Failed to import transactions: ${error.message}`);
  }
};