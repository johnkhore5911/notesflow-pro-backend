const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

class AuthController {
  /**
   * Handle user login
   * @route POST /api/auth/login
   */
  async login(req, res) {
    try {
      // Check validation errors [3]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Call service layer for business logic [5]
      const result = await authService.login(email, password);

      // Set cookie for additional security (optional)
      if (result.success && result.data.token) {
        res.cookie('auth_token', result.data.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Login error:', error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: error.message || ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
      });
    }
  }

  /**
   * Get current user profile
   * @route GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      // User data is already available from auth middleware
      const result = await authService.getUserProfile(
        req.user.id, 
        req.user.tenant_id
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve profile'
      });
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // Clear cookie if it exists
      res.clearCookie('auth_token');

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout successful. Please remove token from client storage.'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to logout'
      });
    }
  }

  /**
   * Verify token validity
   * @route GET /api/auth/verify
   */
  async verifyToken(req, res) {
    try {
      // Token is already verified by auth middleware
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            tenant_id: req.user.tenant_id,
            tenant_slug: req.user.tenant_slug
          }
        }
      });

    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_INVALID
      });
    }
  }

  /**
   * Refresh token (if implementing refresh token logic)
   * @route POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      // This is a placeholder for refresh token logic
      // You can implement this based on your security requirements
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token refresh not implemented in this version'
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }
}

module.exports = new AuthController();
