// Application constants
const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
};

const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro'
};

const TENANT_SLUGS = {
  ACME: 'acme',
  GLOBEX: 'globex'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_REQUIRED: 'Access token is required',
    TOKEN_INVALID: 'Invalid or expired token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action'
  },
  TENANT: {
    NOT_FOUND: 'Tenant not found',
    INVALID_TENANT: 'Invalid tenant access'
  },
  NOTE: {
    NOT_FOUND: 'Note not found',
    LIMIT_EXCEEDED: 'Note limit exceeded. Upgrade to Pro plan for unlimited notes',
    ACCESS_DENIED: 'Access denied to this note'
  },
  VALIDATION: {
    INVALID_INPUT: 'Invalid input data provided'
  }
};

const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful'
  },
  NOTE: {
    CREATED: 'Note created successfully',
    UPDATED: 'Note updated successfully',
    DELETED: 'Note deleted successfully'
  },
  TENANT: {
    UPGRADED: 'Subscription upgraded to Pro successfully'
  }
};

module.exports = {
  ROLES,
  SUBSCRIPTION_PLANS,
  TENANT_SLUGS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
