import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ['Bar', 'Entertainment', 'Fuel', 'Shoes/Clothing', 'Credit Card', 'Eating Out', 'Technology', 'Gifts', 'Other'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'custom'],
    default: 'monthly',
  },
  customPeriod: {
    startDate: { type: Date },
    endDate: { type: Date },
  },
  recurrence: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  },
  rollover: {
    type: Boolean,
    default: false,
  },
  alertThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 90, // Notify at 90% spent
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Budget', budgetSchema);