const { User, Tenant } = require('../models');
const { generateToken } = require('../utils/jwt');
const { comparePassword } = require('../utils/bcrypt');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class AuthService {
  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Authentication result
   */
  async login(email, password) {
    try {
      // Find user with password and populate tenant info
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        is_active: true 
      })
      .select('+password_hash')
      .populate('tenant_id', 'slug name subscription_plan');

      console.log("User fetched:", user);

      if (!user) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
      }

      // Check if tenant is active
      if (!user.tenant_id || !user.tenant_id.slug) {
        throw new Error(ERROR_MESSAGES.TENANT.NOT_FOUND);
      }

      console.log("Tenant info:", user.tenant_id);

      // Compare password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
      }
      console.log('Password valid');

      console.log('Generating token for user:', user._id);
      // Update last login
      // user.last_login = new Date();
      // await user.save();
      await User.findOneAndUpdate(
        { _id: user._id },
        { last_login: new Date() },
        { new: true }
      );
      console.log('Last login updated');

      // Generate JWT token
      const tokenPayload = {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id._id,
        tenant_slug: user.tenant_id.slug
      };

      console.log("Token payload:", tokenPayload);
      const token = generateToken(tokenPayload);
      console.log('Token generated', token);

      // Prepare response (exclude sensitive data)
      const userResponse = {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant_id._id,
          slug: user.tenant_id.slug,
          name: user.tenant_id.name,
          subscription_plan: user.tenant_id.subscription_plan
        },
        last_login: user.last_login
      };

      console.log('User response prepared', userResponse);
      return {
        success: true,
        message: SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
        data: {
          user: userResponse,
          token,
          expires_in: '24h'
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID for isolation
   * @returns {Promise<Object>} - User profile
   */
  async getUserProfile(userId, tenantId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenant_id: tenantId,
        is_active: true
      }).populate('tenant_id', 'slug name subscription_plan');

      if (!user) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
      }

      const userProfile = {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant_id._id,
          slug: user.tenant_id.slug,
          name: user.tenant_id.name,
          subscription_plan: user.tenant_id.subscription_plan
        },
        created_at: user.created_at,
        last_login: user.last_login
      };

      return {
        success: true,
        data: userProfile
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate user permissions
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {string} requiredRole - Required role
   * @returns {Promise<boolean>} - Permission result
   */
  async validateUserPermissions(userId, tenantId, requiredRole = null) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenant_id: tenantId,
        is_active: true
      });

      if (!user) {
        return false;
      }

      if (requiredRole && user.role !== requiredRole) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new AuthService();
