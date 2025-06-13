import Debt from '../models/Debt.js';

const checkDebtOwnership = async (req, res, next) => {
  try {
    const debt = await Debt.findById(req.params.id);
    if (!debt) {
      console.warn(`Debt not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Debt not found' });
    }
    if (debt.user.toString() !== req.user.id) {
      console.warn(`Unauthorized access to debt: ${req.params.id} by user ${req.user.id}`);
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.debt = debt;
    next();
  } catch (error) {
    console.error('Debt ownership middleware error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

export default checkDebtOwnership;