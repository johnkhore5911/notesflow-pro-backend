const express = require('express');
const { validationResult } = require('express-validator');
const tenantService = require('../services/tenantService');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const { tenantSlugValidation } = require('../utils/validation');
const { HTTP_STATUS, ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/tenants/info
 * @desc    Get current tenant information
 * @access  Private (Admin, Member)
 */
router.get('/info', async (req, res) => {
  try {
    const result = await tenantService.getTenantInfo(req.user.tenant_id);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tenants/subscription
 * @desc    Get subscription status and limits
 * @access  Private (Admin, Member)
 */
router.get('/subscription', async (req, res) => {
  try {
    const result = await tenantService.getSubscriptionStatus(req.user.tenant_id);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tenants/:slug/upgrade
 * @desc    Upgrade tenant subscription to Pro
 * @access  Private (Admin only)
 */
router.post('/:slug/upgrade', [
  checkRole(ROLES.ADMIN),
  tenantSlugValidation
], async (req, res) => {
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

    const result = await tenantService.upgradeSubscription(
      req.params.slug,
      req.user.id,
      req.user.tenant_id
    );

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const statusCode = error.message.includes('permissions') 
      ? HTTP_STATUS.FORBIDDEN
      : error.message.includes('not found')
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tenants/users
 * @desc    Get all users for the tenant
 * @access  Private (Admin only)
 */
router.get('/users', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const result = await tenantService.getTenantUsers(
      req.user.tenant_id,
      req.user.id
    );
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const statusCode = error.message.includes('permissions') 
      ? HTTP_STATUS.FORBIDDEN 
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
