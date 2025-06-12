import Budget from '../models/Budget.js';

const checkBudgetOwnership = async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      console.warn(`Budget not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    if (budget.user.toString() !== req.user.id) {
      console.warn(`Unauthorized access to budget ${req.params.id} by user ${req.user.id}`);
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.budget = budget;
    next();
  } catch (error) {
    console.error('Budget ownership middleware error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};
export default checkBudgetOwnership;