import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken: { type: String, required: true },
  itemId: { type: String, required: true },
  institutionName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('BankAccount', BankAccountSchema);