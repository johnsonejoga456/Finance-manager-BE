import Budget from '../models/Budget.js';

// Middleware to validate budget ownership
const checkBudgetOwnership = async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    if (budget.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.budget = budget; // Attach budget to request for controller use
    next();
  } catch (error) {
    console.error('Budget ownership middleware error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

export default checkBudgetOwnership;