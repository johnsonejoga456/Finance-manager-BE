import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['income', 'expense', 'transfer', 'investment'], 
    required: true 
  },
  subType: { 
    type: String,
    enum: ['salary', 'bonus', 'freelance', 'groceries', 'rent', 'utilities', 'stocks', 'bonds', 'savings', 'gift', 'refund', 'subscription'],
    required: false 
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0, 'Amount must be positive'] 
  },
  originalAmount: { 
    type: Number, 
    required: false,
    min: [0, 'Original amount must be positive'] 
  },
  currency: { 
    type: String, 
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP'],
  },
  category: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String, 
    required: false, 
    maxlength: [500, 'Notes cannot exceed 500 characters'] 
  },
  recurrence: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'], 
    required: false 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false,
  },
  splitTransactions: [{
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    notes: { type: String, required: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ type: 1, category: 1 });
TransactionSchema.index({ user: 1, account: 1 });

TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
