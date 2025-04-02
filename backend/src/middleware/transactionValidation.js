import { body, param, query } from 'express-validator';

// Validation rules for adding and updating a transaction
export const validateTransaction = [
    body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('category').isString().notEmpty().withMessage('Category cannot be empty'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings'),
    body('recurrence').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Recurrence must be one of the following: daily, weekly, monthly'),
    body('currency').optional().isString().withMessage('Currency must be a string'),
];

// Validation for getting a transaction by ID
export const validateTransactionId = [
    param('id').isMongoId().withMessage('Invalid transaction ID format'),
];

// Validation for search queries
export const validateSearchTransactions = [
    query('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    query('minAmount').optional().isFloat().withMessage('Minimum amount must be a number'),
    query('maxAmount').optional().isFloat().withMessage('Maximum amount must be a number'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
];
