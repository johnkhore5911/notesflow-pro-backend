const express = require('express');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { loginValidation } = require('../utils/validation');
const { authenticate } = require('../middleware/auth');
const { HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await authService.getUserProfile(req.user.id, req.user.tenant_id);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // This endpoint just confirms the token is valid
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logout successful. Please remove token from client storage.'
  });
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get('/verify', authenticate, (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        tenant_slug: req.user.tenant_slug
      }
    }
  });
});

module.exports = router;
