const { body, param, query } = require('express-validator');

// Auth validation schemas [12][19]
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Note validation schemas
const createNoteValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters')
];

const updateNoteValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid note ID'),
  ...createNoteValidation
];

const noteIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid note ID')
];

// Tenant validation schemas
const tenantSlugValidation = [
  param('slug')
    .isIn(['acme', 'globex'])
    .withMessage('Invalid tenant slug. Must be either "acme" or "globex"')
];

// Query validation schemas
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
];

module.exports = {
  loginValidation,
  createNoteValidation,
  updateNoteValidation,
  noteIdValidation,
  tenantSlugValidation,
  paginationValidation
};
