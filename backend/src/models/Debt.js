import mongoose from 'joi';
import mongoose from 'mongoose';

const DebtSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  creditor: {
    type: String,
    required: true,
    trim: true,
  },
  balance: {
    type: Number,
    required: true,
    min: 0,
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  minimumPayment: {
    type: Number,
    required: true,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paymentHistory: [{
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

export default mongoose.model('Debt', DebtSchema);