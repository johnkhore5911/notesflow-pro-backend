const { HTTP_STATUS } = require('../utils/constants');

/**
 * Handle 404 Not Found errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = HTTP_STATUS.NOT_FOUND;
  next(error);
};

/**
 * Global error handling middleware [6]
 * Must be defined with 4 parameters to be recognized as error handler
 */
const errorHandler = (err, req, res, next) => {
  // Set default error status if not already set
  let statusCode = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors).map(error => error.message).join(', ');
  } else if (err.name === 'CastError') {
    // Mongoose invalid ObjectId
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = HTTP_STATUS.CONFLICT;
    const duplicateField = Object.keys(err.keyValue);
    message = `${duplicateField} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
  } else if (err.name === 'MongoNetworkError') {
    // MongoDB connection error
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = 'Database connection error';
  }

  // Log error details (exclude 4xx client errors for cleaner logs)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  } else if (process.env.NODE_ENV === 'development') {
    console.log('Client Error:', {
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      statusCode
    });
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    status: statusCode
  };

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      stack: err.stack,
      details: err
    };
  }

  // Include request ID for debugging (if you implement request tracking)
  if (req.requestId) {
    errorResponse.request_id = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper - wraps async route handlers to catch promise rejections
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error with status code
 */
class CustomError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.name = 'CustomError';
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error handler for express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new CustomError(
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST
    );
    error.validationErrors = errors.array();
    return next(error);
  }
  
  next();
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  CustomError,
  handleValidationErrors
};
