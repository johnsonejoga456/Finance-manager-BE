import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters'],
  },
  type: {
    type: String,
    enum: ['checking', 'savings', 'credit card', 'investment', 'loan', 'cash'],
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    required: true,
  },
  institution: {
    type: String,
    trim: true,
    maxlength: [100, 'Institution name cannot exceed 100 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

AccountSchema.index({ user: 1, name: 1 });
AccountSchema.index({ user: 1, type: 1 });

AccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Account = mongoose.model('Account', AccountSchema);
export default Account;