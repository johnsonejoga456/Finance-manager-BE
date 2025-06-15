import Debt from '../models/Debt.js';
import Transaction from '../models/Transaction.js';
import { write as csvWrite } from 'fast-csv';
import PDFDocument from 'pdfkit';

// Standardized response helper
const sendResponse = (res, status, success, data = null, message = '') => {
  res.status(status).json({ success, data, message });
};

// Create a new debt
export const createDebt = async (req, res) => {
  try {
    const { description, creditor, balance, interestRate, minimumPayment, dueDate } = req.body;

    if (!description || !creditor || !balance || !interestRate || !minimumPayment || !dueDate) {
      return sendResponse(res, 400, false, null, 'Missing required fields');
    }

    const parsedBalance = parseFloat(balance);
    if (isNaN(parsedBalance) || parsedBalance <= 0) {
      return sendResponse(res, 400, false, null, 'Invalid balance');
    }

    const debt = new Debt({
      user: req.user.id,
      description,
      creditor,
      balance: parsedBalance,
      initialBalance: parsedBalance, // Ensure initialBalance is set
      interestRate: parseFloat(interestRate),
      minimumPayment: parseFloat(minimumPayment),
      dueDate: new Date(dueDate),
    });

    await debt.save();
    console.log(`Debt created: ${debt._id} for user ${req.user.id}, initialBalance=${debt.initialBalance}`);
    sendResponse(res, 201, true, debt, 'Debt created successfully');
  } catch (error) {
    console.error('Create debt error:', error.message);
    sendResponse(res, 500, false, null, `Failed to create debt: ${error.message}`);
  }
};

// Get all debts for the user
export const getDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user.id }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, debts, 'Debts retrieved successfully');
  } catch (error) {
    console.error('Get debts error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve debts: ${error.message}`);
  }
};

// Get a single debt by ID
export const getDebtById = async (req, res) => {
  try {
    sendResponse(res, 200, true, req.debt, 'Debt retrieved successfully');
  } catch (error) {
    console.error('Get debt by ID error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve debt: ${error.message}`);
  }
};

// Update a debt
export const updateDebt = async (req, res) => {
  try {
    const { description, creditor, balance, interestRate, minimumPayment, dueDate } = req.body;
    const debt = req.debt;

    debt.description = description || debt.description;
    debt.creditor = creditor || debt.creditor;
    debt.balance = balance !== undefined ? parseFloat(balance) : debt.balance;
    debt.interestRate = interestRate !== undefined ? parseFloat(interestRate) : debt.interestRate;
    debt.minimumPayment = minimumPayment !== undefined ? parseFloat(minimumPayment) : debt.minimumPayment;
    debt.dueDate = dueDate ? new Date(dueDate) : debt.dueDate;

    // Update initialBalance only if not set or if creating a new debt
    if (!debt.initialBalance || debt.initialBalance === 0) {
      debt.initialBalance = debt.balance;
    }

    await debt.save();
    console.log(`Debt updated: ${debt._id} for user ${req.user.id}, initialBalance=${debt.initialBalance}`);
    sendResponse(res, 200, true, debt, 'Debt saved successfully');
  } catch (error) {
    console.error('Update debt error:', error.message);
    sendResponse(res, 500, false, null, `Failed to update debt: ${error.message}`);
  }
};

// Delete a debt
export const deleteDebt = async (req, res) => {
  try {
    await req.debt.deleteOne();
    console.log(`Debt deleted: ${req.debt._id} for user ${req.user.id}`);
    sendResponse(res, 200, true, null, 'Debt deleted successfully');
  } catch (error) {
    console.error('Delete debt error:', error.message);
    sendResponse(res, 500, false, null, `Failed to delete debt: ${error.message}`);
  }
};

// Get debt repayment strategies
export const getRepaymentStrategies = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user.id });
    if (!debts.length) {
      return sendResponse(res, 200, true, { snowball: [], avalanche: [] }, 'No debts found');
    }

    // Debt Snowball: Pay minimums, then extra to lowest balance
    const snowball = debts
      .sort((a, b) => a.balance - b.balance)
      .map(d => ({
        id: d._id,
        description: d.description,
        creditor: d.creditor,
        balance: d.balance,
        interestRate: d.interestRate,
        minimumPayment: d.minimumPayment,
        dueDate: d.dueDate,
        paymentPriority: 'Low balance first',
      }));

    // Debt Avalanche: Pay minimums, then extra to highest interest rate
    const avalanche = debts
      .sort((a, b) => b.interestRate - a.interestRate)
      .map(d => ({
        id: d._id,
        description: d.description,
        creditor: d.creditor,
        balance: d.balance,
        interestRate: d.interestRate,
        minimumPayment: d.minimumPayment,
        dueDate: d.dueDate,
        paymentPriority: 'High interest rate first',
      }));

    sendResponse(res, 200, true, { snowball, avalanche }, 'Repayment strategies retrieved successfully');
  } catch (error) {
    console.error('Get repayment strategies error:', error.message);
    sendResponse(res, 500, false, null, `Failed to retrieve strategies: ${error.message}`);
  }
};

// Record a debt payment
export const recordPayment = async (req, res) => {
  try {
    const { amount, date = Date.now() } = req.body;
    const debt = req.debt;

    if (!amount || amount <= 0) {
      return sendResponse(res, 400, false, null, 'Invalid payment amount');
    }

    const parsedAmount = parseFloat(amount);
    debt.balance -= parsedAmount;
    debt.paymentHistory.push({ amount: parsedAmount, date: new Date(date) });

    // Link to transaction (assuming Transaction model exists)
    const transaction = new Transaction({
      user: req.user.id,
      type: 'expense',
      category: 'Debt Repayment',
      amount: parsedAmount,
      date: new Date(date),
      notes: `Payment for ${debt.description}`,
    });

    await Promise.all([debt.save(), transaction.save()]);
    console.log(`Payment recorded: ${parsedAmount} for debt ${debt._id}, initialBalance=${debt.initialBalance}`);
    sendResponse(res, 200, true, debt, 'Payment recorded successfully');
  } catch (error) {
    console.error('Record payment error:', error.message);
    sendResponse(res, 500, false, null, `Failed to record payment: ${error.message}`);
  }
};

// Export debts as CSV
export const exportDebtsAsCSV = async (req, res) => {
  try {
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="debts.csv"',
    });

    const debts = await Debt.find({ user: req.user.id });
    const csvStream = csvWrite({
      headers: ['Description', 'Creditor', 'Balance', 'Interest Rate', 'Minimum Payment', 'Due Date'],
    });

    debts.forEach(d => {
      csvStream.write({
        Description: d.description || '',
        Creditor: d.creditor || '',
        Balance: d.balance.toFixed(2),
        InterestRate: d.interestRate.toFixed(2),
        MinimumPayment: d.minimumPayment.toFixed(2),
        DueDate: d.dueDate ? new Date(d.dueDate).toISOString() : '',
      });
    });

    csvStream.pipe(res);
    csvStream.end();
    console.log('CSV export completed');
  } catch (error) {
    console.error('Export CSV error:', error.message);
    sendResponse(res, 500, false, null, `Failed to export CSV: ${error.message}`);
  }
};

// Export debts as PDF
export const exportDebtsAsPDF = async (req, res) => {
  try {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="debts.pdf"',
    });

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(16).text('Debt Report', { align: 'center' });
    doc.moveDown();

    const debts = await Debt.find({ user: req.user.id });
    debts.forEach((d, index) => {
      doc.fontSize(12).text(`Debt ${index + 1}`);
      doc.text(`Description: ${d.description || '-'}`);
      doc.text(`Creditor: ${d.creditor || '-'}`);
      doc.text(`Balance: $${d.balance.toFixed(2)}`);
      doc.text(`Interest Rate: ${d.interestRate.toFixed(2)}%`);
      doc.text(`Minimum Payment: $${d.minimumPayment.toFixed(2)}`);
      doc.text(`Due Date: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '-'}`);
      doc.moveDown();
    });

    doc.end();
    console.log('PDF export completed');
  } catch (error) {
    console.error('Export PDF error:', error.message);
    sendResponse(res, 500, false, null, `Failed to export PDF: ${error.message}`);
  }
};