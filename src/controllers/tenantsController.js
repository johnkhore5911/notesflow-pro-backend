const { validationResult } = require('express-validator');
const tenantService = require('../services/tenantService');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../utils/constants');

class TenantController {
  /**
   * Get current tenant information
   * @route GET /api/tenants/info
   */
  async getTenantInfo(req, res) {
    try {
      const result = await tenantService.getTenantInfo(req.user.tenant_id);
      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get tenant info error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve tenant information'
      });
    }
  }

  /**
   * Get subscription status and limits
   * @route GET /api/tenants/subscription
   */
  async getSubscriptionStatus(req, res) {
    try {
      const result = await tenantService.getSubscriptionStatus(req.user.tenant_id);
      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get subscription status error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription status'
      });
    }
  }

  /**
   * Upgrade tenant subscription to Pro
   * @route POST /api/tenants/:slug/upgrade
   */
  async upgradeSubscription(req, res) {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      // Verify user is admin [7]
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
        });
      }

      const tenantSlug = req.params.slug;

      // Call service layer for business logic [5]
      const result = await tenantService.upgradeSubscription(
        tenantSlug,
        req.user.id,
        req.user.tenant_id
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Upgrade subscription error:', error);
      
      // Handle specific error types
      let statusCode = HTTP_STATUS.BAD_REQUEST;
      if (error.message.includes('permissions')) {
        statusCode = HTTP_STATUS.FORBIDDEN;
      } else if (error.message.includes('not found')) {
        statusCode = HTTP_STATUS.NOT_FOUND;
      }

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to upgrade subscription'
      });
    }
  }

  /**
   * Get all users for the tenant (Admin only)
   * @route GET /api/tenants/users
   */
  async getTenantUsers(req, res) {
    try {
      // Verify user is admin
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
        });
      }

      const result = await tenantService.getTenantUsers(
        req.user.tenant_id,
        req.user.id
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get tenant users error:', error);
      
      const statusCode = error.message.includes('permissions')
        ? HTTP_STATUS.FORBIDDEN
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve tenant users'
      });
    }
  }

  /**
   * Get tenant dashboard analytics (Admin only)
   * @route GET /api/tenants/dashboard
   */
  async getDashboardAnalytics(req, res) {
    try {
      // Verify user is admin
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
        });
      }

      // Get comprehensive tenant analytics
      const [tenantInfo, subscriptionStatus, tenantUsers] = await Promise.all([
        tenantService.getTenantInfo(req.user.tenant_id),
        tenantService.getSubscriptionStatus(req.user.tenant_id),
        tenantService.getTenantUsers(req.user.tenant_id, req.user.id)
      ]);

      const dashboardData = {
        tenant: tenantInfo.data,
        subscription: subscriptionStatus.data,
        users: {
          total_count: tenantUsers.data.total_count,
          admin_count: tenantUsers.data.users.filter(user => user.role === ROLES.ADMIN).length,
          member_count: tenantUsers.data.users.filter(user => user.role === ROLES.MEMBER).length,
          recent_users: tenantUsers.data.users.slice(0, 5) // Last 5 users
        },
        quick_stats: {
          can_create_notes: subscriptionStatus.data.can_create_notes,
          upgrade_available: subscriptionStatus.data.upgrade_available,
          notes_usage_percentage: subscriptionStatus.data.is_pro 
            ? 0 // Pro has unlimited
            : Math.round((subscriptionStatus.data.notes_used / subscriptionStatus.data.note_limit) * 100)
        }
      };

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: dashboardData
      });

    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboard analytics'
      });
    }
  }

  /**
   * Update tenant settings (Admin only)
   * @route PUT /api/tenants/settings
   */
  async updateTenantSettings(req, res) {
    try {
      // Verify user is admin
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
        });
      }

      // This is a placeholder for future tenant settings functionality
      // You can implement specific settings updates here
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tenant settings update feature coming soon',
        data: {
          available_settings: [
            'notification_preferences',
            'data_retention_policy',
            'user_invitation_settings'
          ]
        }
      });

    } catch (error) {
      console.error('Update tenant settings error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to update tenant settings'
      });
    }
  }

  /**
   * Get tenant activity logs (Admin only)
   * @route GET /api/tenants/activity
   */
  async getTenantActivity(req, res) {
    try {
      // Verify user is admin
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
        });
      }

      const { page = 1, limit = 20 } = req.query;

      // This is a placeholder for activity logging functionality
      // You would typically implement this with an audit log system
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Activity logs feature coming soon',
        data: {
          activities: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_count: 0,
            per_page: parseInt(limit)
          },
          note: 'Activity logging will track user actions, note changes, and system events'
        }
      });

    } catch (error) {
      console.error('Get tenant activity error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve tenant activity'
      });
    }
  }
}

module.exports = new TenantController();
