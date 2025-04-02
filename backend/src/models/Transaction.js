import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['income', 'expense', 'transfer', 'investment'], // Main categories
        required: true 
    },
    subType: { 
        type: String,
        enum: ['salary', 'bonus', 'groceries', 'rent', 'utilities', 'stocks', 'bonds', 'savings'], // Subcategories
        required: false 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    originalAmount: { 
        type: Number, 
        required: false // Optional for transactions with multi-currency support
    },
    currency: { 
        type: String, 
        default: 'USD' // Default to USD if no currency is provided
    },
    category: { 
        type: String, 
        required: true // Category for easy classification
    },
    notes: { 
        type: String, 
        required: false, 
        maxlength: 500 // Optional notes field with a character limit
    },
    tags: { 
        type: [String], 
        required: false // Tags for custom filtering and categorization
    },
    recurrence: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly'], 
        required: false // For recurring transactions
    },
    date: { 
        type: Date, 
        default: Date.now // Date of the transaction
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true // Link transaction to a user
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });


TransactionSchema.index({ user: 1, date: -1 }); // Optimize user-specific queries
TransactionSchema.index({ type: 1, category: 1 }); // For categorical breakdown
// Middleware to update the `updatedAt` field on modification
TransactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Export the model
const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
