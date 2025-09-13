const { Tenant, Note } = require('../models');
const { HTTP_STATUS, ERROR_MESSAGES, SUBSCRIPTION_PLANS } = require('../utils/constants');

/**
 * Check if tenant can create new notes based on subscription limits
 */
const checkNoteLimit = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
      });
    }

    // Get tenant subscription info
    const tenant = await Tenant.findById(req.user.tenant_id);
    if (!tenant) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.TENANT.NOT_FOUND
      });
    }

    // Skip check for Pro subscribers
    if (tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO) {
      return next();
    }

    // Count existing notes for free plan
    const noteCount = await Note.countDocuments({
      tenant_id: req.user.tenant_id,
      is_deleted: false
    });

    // Check if limit is reached
    if (noteCount >= tenant.note_limit) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.NOTE.LIMIT_EXCEEDED,
        current_count: noteCount,
        limit: tenant.note_limit,
        subscription_plan: tenant.subscription_plan,
        upgrade_required: true
      });
    }

    // Add note limit info to request for potential use in routes
    req.noteLimitInfo = {
      current_count: noteCount,
      limit: tenant.note_limit,
      remaining: tenant.note_limit - noteCount,
      subscription_plan: tenant.subscription_plan
    };

    next();

  } catch (error) {
    console.error('Note limit check error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to check subscription limits'
    });
  }
};

/**
 * Check subscription plan and add info to request
 */
const addSubscriptionInfo = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next();
    }

    const tenant = await Tenant.findById(req.user.tenant_id);
    if (!tenant) {
      return next();
    }

    // Add subscription info to request
    req.subscription = {
      plan: tenant.subscription_plan,
      is_pro: tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO,
      note_limit: tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO ? -1 : tenant.note_limit
    };

    next();

  } catch (error) {
    console.error('Add subscription info error:', error);
    next(); // Continue even if this fails
  }
};

/**
 * Require specific subscription plan
 * @param {string} requiredPlan - Required subscription plan
 */
const requireSubscriptionPlan = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant_id) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      const tenant = await Tenant.findById(req.user.tenant_id);
      if (!tenant) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.TENANT.NOT_FOUND
        });
      }

      if (tenant.subscription_plan !== requiredPlan) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `This feature requires ${requiredPlan} subscription`,
          current_plan: tenant.subscription_plan,
          required_plan: requiredPlan,
          upgrade_required: true
        });
      }

      next();

    } catch (error) {
      console.error('Subscription plan check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to verify subscription plan'
      });
    }
  };
};

/**
 * Feature gate middleware - check if feature is available for subscription plan
 * @param {string} featureName - Name of the feature to check
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant_id) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      const tenant = await Tenant.findById(req.user.tenant_id);
      if (!tenant) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.TENANT.NOT_FOUND
        });
      }

      // Define feature availability by plan
      const featureAccess = {
        [SUBSCRIPTION_PLANS.FREE]: [
          'basic_notes',
          'basic_search'
        ],
        [SUBSCRIPTION_PLANS.PRO]: [
          'basic_notes',
          'basic_search',
          'unlimited_notes',
          'advanced_search',
          'note_tags',
          'note_archive',
          'export_notes',
          'team_collaboration'
        ]
      };

      const availableFeatures = featureAccess[tenant.subscription_plan] || [];

      if (!availableFeatures.includes(featureName)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Feature '${featureName}' is not available on ${tenant.subscription_plan} plan`,
          current_plan: tenant.subscription_plan,
          available_features: availableFeatures,
          upgrade_required: true
        });
      }

      next();

    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to check feature access'
      });
    }
  };
};

/**
 * Usage tracking middleware - track API usage for billing/analytics
 */
const trackUsage = (action) => {
  return async (req, res, next) => {
    try {
      // This is a placeholder for usage tracking
      // In production, you might want to track API calls, note operations, etc.
      
      const usageData = {
        tenant_id: req.user?.tenant_id,
        user_id: req.user?.id,
        action,
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date(),
        ip: req.ip,
        user_agent: req.get('User-Agent')
      };

      // Log usage (in production, save to database or analytics service)
      if (process.env.NODE_ENV === 'development') {
        console.log('Usage tracked:', usageData);
      }

      // Add usage info to response headers for debugging
      res.set('X-Usage-Tracked', action);

      next();

    } catch (error) {
      console.error('Usage tracking error:', error);
      next(); // Continue even if tracking fails
    }
  };
};

module.exports = {
  checkNoteLimit,
  addSubscriptionInfo,
  requireSubscriptionPlan,
  checkFeatureAccess,
  trackUsage
};
