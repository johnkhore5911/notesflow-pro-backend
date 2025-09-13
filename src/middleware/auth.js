const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { User } = require('../models');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Authentication middleware - verifies JWT token and sets user context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header [1]
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
      });
    }

    let token;
    try {
      token = extractTokenFromHeader(authHeader);
    } catch (error) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_INVALID
      });
    }

    // Verify JWT token [4]
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_INVALID
      });
    }

    // Verify user still exists and is active
    const user = await User.findOne({
      _id: decoded.id,
      tenant_id: decoded.tenant_id,
      is_active: true
    }).populate('tenant_id', 'slug name subscription_plan is_active');

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
      });
    }

    // Check if tenant is active
    if (!user.tenant_id || !user.tenant_id.is_active) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.TENANT.INVALID_TENANT
      });
    }

    // Set user context for downstream middleware and routes
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id._id.toString(),
      tenant_slug: user.tenant_id.slug,
      tenant_subscription: user.tenant_id.subscription_plan
    };

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Sets user context if valid token is present
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    // Try to authenticate, but don't fail if token is invalid
    try {
      const token = extractTokenFromHeader(authHeader);
      const decoded = verifyToken(token);
      
      const user = await User.findOne({
        _id: decoded.id,
        tenant_id: decoded.tenant_id,
        is_active: true
      }).populate('tenant_id', 'slug name subscription_plan is_active');

      if (user && user.tenant_id && user.tenant_id.is_active) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id._id.toString(),
          tenant_slug: user.tenant_id.slug,
          tenant_subscription: user.tenant_id.subscription_plan
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }

    next();

  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
