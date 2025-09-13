const { Tenant, User, Note } = require('../models');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, SUBSCRIPTION_PLANS, ROLES } = require('../utils/constants');

class TenantService {
  /**
   * Get tenant information
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Tenant data
   */
  async getTenantInfo(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(ERROR_MESSAGES.TENANT.NOT_FOUND);
      }

      // Get tenant statistics
      const [userCount, noteCount] = await Promise.all([
        User.countDocuments({ tenant_id: tenantId, is_active: true }),
        Note.countDocuments({ tenant_id: tenantId, is_deleted: false })
      ]);

      return {
        success: true,
        data: {
          id: tenant._id,
          slug: tenant.slug,
          name: tenant.name,
          subscription_plan: tenant.subscription_plan,
          note_limit: tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO ? -1 : tenant.note_limit,
          statistics: {
            total_users: userCount,
            total_notes: noteCount,
            remaining_notes: tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO 
              ? -1 
              : Math.max(0, tenant.note_limit - noteCount)
          },
          created_at: tenant.created_at,
          updated_at: tenant.updated_at
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upgrade tenant subscription to Pro
   * @param {string} tenantSlug - Tenant slug
   * @param {string} userId - User ID (must be admin)
   * @param {string} userTenantId - User's tenant ID for verification
   * @returns {Promise<Object>} - Upgrade result
   */
  async upgradeSubscription(tenantSlug, userId, userTenantId) {
    try {
      // Verify user is admin and belongs to the tenant
      const user = await User.findOne({
        _id: userId,
        tenant_id: userTenantId,
        role: ROLES.ADMIN,
        is_active: true
      });

      if (!user) {
        throw new Error(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
      }

      // Find tenant by slug and verify it matches user's tenant
      const tenant = await Tenant.findOne({ slug: tenantSlug });
      if (!tenant) {
        throw new Error(ERROR_MESSAGES.TENANT.NOT_FOUND);
      }

      // Verify tenant matches user's tenant
      if (tenant._id.toString() !== userTenantId.toString()) {
        throw new Error(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
      }

      // Check if already Pro
      if (tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO) {
        return {
          success: true,
          message: 'Tenant is already on Pro plan',
          data: {
            id: tenant._id,
            slug: tenant.slug,
            name: tenant.name,
            subscription_plan: tenant.subscription_plan,
            note_limit: -1
          }
        };
      }

      // Upgrade to Pro
      const updatedTenant = await tenant.upgradeToPro();

      return {
        success: true,
        message: SUCCESS_MESSAGES.TENANT.UPGRADED,
        data: {
          id: updatedTenant._id,
          slug: updatedTenant.slug,
          name: updatedTenant.name,
          subscription_plan: updatedTenant.subscription_plan,
          note_limit: -1,
          upgraded_at: updatedTenant.updated_at
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get tenant users (Admin only)
   * @param {string} tenantId - Tenant ID
   * @param {string} requestingUserId - ID of user making request
   * @returns {Promise<Object>} - Tenant users
   */
  async getTenantUsers(tenantId, requestingUserId) {
    try {
      // Verify requesting user is admin of the tenant
      const requestingUser = await User.findOne({
        _id: requestingUserId,
        tenant_id: tenantId,
        role: ROLES.ADMIN,
        is_active: true
      });

      if (!requestingUser) {
        throw new Error(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
      }

      // Get all users for the tenant
      const users = await User.find({
        tenant_id: tenantId,
        is_active: true
      }).select('-password_hash')
        .populate('tenant_id', 'slug name')
        .sort({ created_at: -1 });

      return {
        success: true,
        data: {
          users: users.map(user => ({
            id: user._id,
            email: user.email,
            role: user.role,
            last_login: user.last_login,
            created_at: user.created_at
          })),
          total_count: users.length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get subscription status and limits
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Subscription details
   */
  async getSubscriptionStatus(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(ERROR_MESSAGES.TENANT.NOT_FOUND);
      }

      const noteCount = await Note.countDocuments({
        tenant_id: tenantId,
        is_deleted: false
      });

      const isPro = tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO;
      const noteLimit = isPro ? -1 : tenant.note_limit;
      const remainingNotes = isPro ? -1 : Math.max(0, tenant.note_limit - noteCount);
      const canCreateNotes = isPro || remainingNotes > 0;

      return {
        success: true,
        data: {
          subscription_plan: tenant.subscription_plan,
          note_limit: noteLimit,
          notes_used: noteCount,
          remaining_notes: remainingNotes,
          can_create_notes: canCreateNotes,
          is_pro: isPro,
          upgrade_available: !isPro
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TenantService();
