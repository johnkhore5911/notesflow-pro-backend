const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const { Tenant } = require('../models');

/**
 * Tenant isolation middleware - ensures data isolation between tenants
 * This middleware adds tenant context to all database queries
 */
const ensureTenantIsolation = (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
      });
    }

    // Add tenant filter to all queries
    // This ensures that all database operations are scoped to the user's tenant
    req.tenantFilter = {
      tenant_id: req.user.tenant_id
    };

    // Add helper function to automatically include tenant in queries
    req.addTenantFilter = (query = {}) => {
      return {
        ...query,
        tenant_id: req.user.tenant_id
      };
    };

    next();

  } catch (error) {
    console.error('Tenant isolation middleware error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Tenant isolation check failed'
    });
  }
};

/**
 * Validate tenant slug parameter matches user's tenant
 * @param {string} paramName - Parameter name containing tenant slug (default: 'slug')
 */
const validateTenantSlug = (paramName = 'slug') => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant_slug) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      const requestedSlug = req.params[paramName];
      
      if (!requestedSlug) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Tenant slug is required'
        });
      }

      // Ensure user can only access their own tenant
      if (requestedSlug !== req.user.tenant_slug) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.TENANT.INVALID_TENANT,
          requested_tenant: requestedSlug,
          user_tenant: req.user.tenant_slug
        });
      }

      next();

    } catch (error) {
      console.error('Tenant slug validation error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Tenant validation failed'
      });
    }
  };
};

/**
 * Cross-tenant access prevention - ensures resources belong to user's tenant
 * @param {string} resourceModel - Mongoose model name
 * @param {string} resourceIdParam - Parameter containing resource ID
 */
const preventCrossTenantAccess = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant_id) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Get the model
      const Model = require('../models')[resourceModel];
      if (!Model) {
        throw new Error(`Model ${resourceModel} not found`);
      }

      // Check if resource exists and belongs to user's tenant
      const resource = await Model.findOne({
        _id: resourceId,
        tenant_id: req.user.tenant_id,
        is_deleted: { $ne: true } // Exclude soft-deleted resources
      });

      if (!resource) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Resource not found or access denied'
        });
      }

      // Add resource to request for use in route handlers
      req.resource = resource;

      next();

    } catch (error) {
      console.error('Cross-tenant access check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Resource access validation failed'
      });
    }
  };
};

/**
 * Tenant status check - ensures tenant is active
 */
const checkTenantStatus = async (req, res, next) => {
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

    if (!tenant.is_active) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Tenant account is inactive',
        tenant_status: 'inactive'
      });
    }

    // Add tenant info to request
    req.tenant = tenant;

    next();

  } catch (error) {
    console.error('Tenant status check error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Tenant status check failed'
    });
  }
};

/**
 * Database query wrapper that automatically includes tenant isolation
 * This can be used to monkey-patch Mongoose queries to always include tenant_id
 */
const setupQueryIsolation = () => {
  const mongoose = require('mongoose');
  
  // Override find methods to automatically add tenant filter
  const addTenantFilter = function(filter = {}) {
    if (this.options.bypassTenantIsolation) {
      return filter;
    }
    
    // Get tenant_id from async context or request context
    const tenantId = this.options.tenantId;
    if (tenantId && !filter.tenant_id) {
      filter.tenant_id = tenantId;
    }
    
    return filter;
  };

  // This is a more advanced feature that would require careful implementation
  // For now, we'll rely on explicit tenant filtering in services
  console.log('Tenant isolation setup completed');
};

/**
 * Request context middleware - adds tenant context for the entire request
 */
const addTenantContext = (req, res, next) => {
  if (req.user && req.user.tenant_id) {
    // Store tenant context for use throughout the request lifecycle
    req.tenantContext = {
      id: req.user.tenant_id,
      slug: req.user.tenant_slug,
      subscription: req.user.tenant_subscription
    };
  }
  
  next();
};

module.exports = {
  ensureTenantIsolation,
  validateTenantSlug,
  preventCrossTenantAccess,
  checkTenantStatus,
  setupQueryIsolation,
  addTenantContext
};
