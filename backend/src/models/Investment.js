import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  initialInvestment: {
    type: Number,
    required: true,
  },
  currentValue: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    default: '',
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
}, {
  timestamps: true
});

const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;