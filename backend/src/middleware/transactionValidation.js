import { body, param, query } from 'express-validator';

export const validateTransaction = [
  body('type').isIn(['income', 'expense', 'transfer', 'investment']).withMessage('Type must be income, expense, transfer, or investment'),
  body('subType').optional().isIn(['salary', 'bonus', 'freelance', 'groceries', 'rent', 'utilities', 'stocks', 'bonds', 'savings', 'gift', 'refund', 'subscription']).withMessage('Invalid subType'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('category').isString().notEmpty().withMessage('Category cannot be empty'),
  body('date').optional().isISO8601().toDate().withMessage('Date must be a valid ISO date'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be a string under 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array').custom((tags) => tags.every(t => typeof t === 'string')).withMessage('Tags must contain only strings'),
  body('recurrence').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Recurrence must be daily, weekly, or monthly'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('splitTransactions').optional().isArray().withMessage('Split transactions must be an array'),
  body('splitTransactions.*.amount').optional().isFloat({ gt: 0 }).withMessage('Split amount must be a positive number'),
  body('splitTransactions.*.category').optional().isString().notEmpty().withMessage('Split category cannot be empty'),
  body('splitTransactions.*.notes').optional().isString().withMessage('Split notes must be a string'),
];

export const validateTransactionId = [
  param('id').isMongoId().withMessage('Invalid transaction ID format'),
];

export const validateSearchTransactions = [
  query('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
  query('minAmount').optional().isFloat().withMessage('Minimum amount must be a number'),
  query('maxAmount').optional().isFloat().withMessage('Maximum amount must be a number'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('type').optional().isIn(['income', 'expense', 'transfer', 'investment']).withMessage('Type must be income, expense, transfer, or investment'),
  query('tags').optional().isString().withMessage('Tags must be a comma-separated string'),
];