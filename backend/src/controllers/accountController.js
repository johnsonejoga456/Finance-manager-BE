import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

// Standardized response helper
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Get all accounts
export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id }).sort({ name: 1 }).limit(100);
    sendResponse(res, 200, true, accounts);
  } catch (error) {
    console.error('Get accounts error:', error.message);
    sendResponse(res, 500, false, null, error.message);
  }
};

// Add account
export const addAccount = async (req, res) => {
  try {
    const { name, type, balance, currency, institution, notes } = req.body;
    if (!name || !type || balance == null || !currency) {
      return sendResponse(res, 400, false, null, 'Missing required fields');
    }

    const account = new Account({
      user: req.user.id,
      name,
      type,
      balance: parseFloat(balance),
      currency,
      institution,
      notes,
    });

    await account.save();
    sendResponse(res, 201, true, account, 'Account added successfully');
  } catch (error) {
    console.error('Add account error:', error.message);
    sendResponse(res, 500, false, null, error.message);
  }
};

// Update account
export const updateAccount = async (req, res) => {
  try {
    const { name, type, balance, currency, institution, notes } = req.body;
    const account = await Account.findById(req.params.id).where({ user: req.user.id });

    if (!account) {
      return sendResponse(res, 404, false, null, 'Account not found');
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
    sendResponse(res, 200, true, account, 'Account updated successfully');
  } catch (error) {
    console.error('Update account error:', error.message);
    sendResponse(res, 500, false, null, error.message);
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).where({ user: req.user.id });
    if (!account) {
      return sendResponse(res, 404, false, null, 'Account not found');
    }

    const transactionCount = await Transaction.countDocuments({ account: account._id });
    if (transactionCount > 0) {
      return sendResponse(res, 400, false, null, 'Cannot delete account with linked transactions');
    }

    await account.deleteOne();
    sendResponse(res, 200, true, null, 'Account deleted successfully');
  } catch (error) {
    console.error('Delete account error:', error.message);
    sendResponse(res, 500, false, null, error.message);
  }
};

// Get transactions for an account
export const getAccountTransactions = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).where({ user: req.user.id });
    if (!account) {
      return sendResponse(res, 404, false, null, 'Account not found');
    }

    const { dateRange, category } = req.query;
    const filter = { user: req.user.id, account: req.params.id };

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category) {
      filter.category = category;
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 }).limit(1000);
    sendResponse(res, 200, true, transactions);
  } catch (error) {
    console.error('Get account transactions error:', error.message);
    sendResponse(res, 500, false, null, error.message);
  }
};