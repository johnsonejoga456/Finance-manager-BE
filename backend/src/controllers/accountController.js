import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { createWriteStream } from 'fs';
import { parse } from 'fast-csv';
import PDFDocument from 'pdfkit';

// Standardized response helper
const sendResponse = (res, status, success, data = {}, message = '') => {
  res.status(status).json({ success, data, message });
};

// Get all accounts
export const getAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const accounts = await Account.find({ user: req.user._id })
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Account.countDocuments({ user: req.user._id });
    console.log(`Fetched ${accounts.length} accounts for user ${req.user._id}, page ${page}`);
    sendResponse(res, 200, true, { accounts, total });
  } catch (error) {
    console.error('Get accounts error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Add account
export const addAccount = async (req, res) => {
  try {
    const { name, type, balance, currency, institution, notes } = req.body;
    if (!name || !type || balance == null || !currency) {
      return sendResponse(res, 400, false, {}, 'Missing required fields');
    }
    if (!['checking', 'savings', 'credit card', 'investment', 'loan', 'cash'].includes(type)) {
      return sendResponse(res, 400, false, {}, 'Invalid account type');
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      return sendResponse(res, 400, false, {}, 'Invalid currency');
    }

    const account = new Account({
      user: req.user._id,
      name,
      type,
      balance: parseFloat(balance),
      currency,
      institution,
      notes,
    });

    await account.save();
    console.log(`Added account ${name} for user ${req.user._id}`);
    sendResponse(res, 201, true, { account }, 'Account added successfully');
  } catch (error) {
    console.error('Add account error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Update account
export const updateAccount = async (req, res) => {
  try {
    const { name, type, balance, currency, institution, notes } = req.body;
    const account = await Account.findById(req.params.id).where({ user: req.user._id });

    if (!account) {
      return sendResponse(res, 404, false, {}, 'Account not found');
    }
    if (type && !['checking', 'savings', 'credit card', 'investment', 'loan', 'cash'].includes(type)) {
      return sendResponse(res, 400, false, {}, 'Invalid account type');
    }
    if (currency && !['USD', 'EUR', 'GBP'].includes(currency)) {
      return sendResponse(res, 400, false, {}, 'Invalid currency');
    }

    Object.assign(account, {
      name: name || account.name,
      type: type || account.type,
      balance: balance != null ? parseFloat(balance) : account.balance,
      currency: currency || account.currency,
      institution: institution || account.institution,
      notes: notes || account.notes,
    });

    await account.save();
    console.log(`Updated account ${account._id} for user ${req.user._id}`);
    sendResponse(res, 200, true, { account }, 'Account updated successfully');
  } catch (error) {
    console.error('Update account error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const { cascade = 'false' } = req.query;
    const account = await Account.findById(req.params.id).where({ user: req.user._id });
    if (!account) {
      return sendResponse(res, 404, false, {}, 'Account not found');
    }

    const transactionCount = await Transaction.countDocuments({ account: account._id });
    if (transactionCount > 0 && cascade !== 'true') {
      return sendResponse(res, 400, false, {}, 'Cannot delete account with linked transactions. Use ?cascade=true to delete transactions.');
    }

    if (cascade === 'true') {
      await Transaction.deleteMany({ account: account._id, user: req.user._id });
      console.log(`Deleted ${transactionCount} transactions for account ${account._id}`);
    }

    await account.deleteOne();
    console.log(`Deleted account ${account._id} for user ${req.user._id}`);
    sendResponse(res, 200, true, {}, 'Account deleted successfully');
  } catch (error) {
    console.error('Delete account error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Get transactions for an account
export const getAccountTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, dateRange, category } = req.query;
    const account = await Account.findById(req.params.id).where({ user: req.user._id });
    if (!account) {
      return sendResponse(res, 404, false, {}, 'Account not found');
    }

    const filter = { user: req.user._id, account: req.params.id };
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category) {
      filter.category = category;
    }

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Transaction.countDocuments(filter);
    console.log(`Fetched ${transactions.length} transactions for account ${req.params.id}, page ${page}`);
    sendResponse(res, 200, true, { transactions, total });
  } catch (error) {
    console.error('Get account transactions error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Update account balance
export const updateAccountBalance = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).where({ user: req.user._id });
    if (!account) {
      return sendResponse(res, 404, false, {}, 'Account not found');
    }

    const transactions = await Transaction.find({ account: account._id });
    let balance = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else if (['expense', 'transfer'].includes(tx.type)) {
        balance -= tx.amount;
      }
    });

    account.balance = balance;
    await account.save();
    console.log(`Updated balance for account ${account._id}: $${balance}`);
    sendResponse(res, 200, true, { account }, 'Account balance updated successfully');
  } catch (error) {
    console.error('Update account balance error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Export accounts to CSV
export const exportAccountsToCSV = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ name: 1 });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="accounts.csv"',
    });

    const csvStream = parse({ headers: ['Name', 'Type', 'Balance', 'Currency', 'Institution', 'Notes'] });
    accounts.forEach(acc => {
      csvStream.write({
        Name: acc.name,
        Type: acc.type,
        Balance: acc.balance.toFixed(2),
        Currency: acc.currency,
        Institution: acc.institution || '',
        Notes: acc.notes || '',
      });
    });

    csvStream.pipe(res);
    csvStream.end();
    console.log(`Exported accounts to CSV for user ${req.user._id}`);
  } catch (error) {
    console.error('Export accounts CSV error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};

// Export accounts to PDF
export const exportAccountsToPDF = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ name: 1 });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="accounts.pdf"',
    });

    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(16).text('Accounts Summary', { align: 'center' });
    doc.moveDown();

    accounts.forEach((acc, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${acc.name} (${acc.type}): $${acc.balance.toFixed(2)} ${acc.currency}`
      );
      if (acc.institution) doc.text(`   Institution: ${acc.institution}`);
      if (acc.notes) doc.text(`   Notes: ${acc.notes}`);
      doc.moveDown();
    });

    doc.end();
    console.log(`Exported accounts to PDF for user ${req.user._id}`);
  } catch (error) {
    console.error('Export accounts PDF error:', error.message);
    sendResponse(res, 500, false, {}, error.message);
  }
};