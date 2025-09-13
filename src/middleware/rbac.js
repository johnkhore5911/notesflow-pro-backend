const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../utils/constants');

/**
 * Role-based access control middleware [4][7]
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
const checkRole = (allowedRoles) => {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS,
          required_roles: roles,
          user_role: req.user.role
        });
      }

      next();

    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = checkRole(ROLES.ADMIN);

/**
 * Check if user is member or admin
 */
const requireMember = checkRole([ROLES.MEMBER, ROLES.ADMIN]);

/**
 * Resource ownership middleware - ensures user can only access their own resources
 * @param {string} resourceIdParam - Parameter name containing resource ID
 * @param {Function} getResourceOwner - Function to get resource owner ID
 */
const checkResourceOwnership = (resourceIdParam, getResourceOwner) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Get resource owner ID
      const ownerId = await getResourceOwner(resourceId, req.user.tenant_id);
      
      if (!ownerId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user owns the resource
      if (ownerId.toString() !== req.user.id) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.NOTE.ACCESS_DENIED
        });
      }

      next();

    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Resource ownership check failed'
      });
    }
  };
};

/**
 * Permission-based access control (more granular than roles)
 * @param {string|Array} requiredPermissions - Required permissions
 */
const checkPermissions = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      // Define role-based permissions
      const rolePermissions = {
        [ROLES.ADMIN]: [
          'notes:create', 'notes:read', 'notes:update', 'notes:delete',
          'users:read', 'users:invite', 'tenant:upgrade', 'tenant:manage'
        ],
        [ROLES.MEMBER]: [
          'notes:create', 'notes:read', 'notes:update', 'notes:delete'
        ]
      };

      const userPermissions = rolePermissions[req.user.role] || [];

      // Check if user has all required permissions
      const hasPermission = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS,
          required_permissions: permissions,
          user_permissions: userPermissions
        });
      }

      next();

    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Conditional role check - allows access based on conditions
 * @param {Function} condition - Function that returns boolean based on req, res
 * @param {string|Array} fallbackRoles - Roles to check if condition fails
 */
const conditionalRole = (condition, fallbackRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MESSAGES.AUTH.TOKEN_REQUIRED
        });
      }

      // Check condition first
      if (condition(req, res)) {
        return next();
      }

      // Fall back to role check
      const roles = Array.isArray(fallbackRoles) ? fallbackRoles : [fallbackRoles];
      if (roles.includes(req.user.role)) {
        return next();
      }

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS
      });

    } catch (error) {
      console.error('Conditional role check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

module.exports = {
  checkRole,
  requireAdmin,
  requireMember,
  checkResourceOwnership,
  checkPermissions,
  conditionalRole
};
