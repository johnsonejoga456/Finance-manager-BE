import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['stock', 'bond', 'mutual fund', 'ETF', 'real estate', 'crypto'] },
  initialInvestment: { type: Number, required: true, min: 0 },
  currentValue: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'USD' },
  institution: { type: String },
  purchaseDate: { type: Date, required: true },
  notes: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Assuming user auth
}, { timestamps: true });

export default mongoose.model('Investment', investmentSchema);