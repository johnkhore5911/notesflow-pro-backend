const express = require('express');
const authRoutes = require('./auth');
const notesRoutes = require('./notes');
const tenantsRoutes = require('./tenants');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/tenants', tenantsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Notes SaaS API v1.0.0',
    documentation: {
      auth: '/api/auth - Authentication endpoints',
      notes: '/api/notes - Notes CRUD operations',
      tenants: '/api/tenants - Tenant management'
    }
  });
});

module.exports = router;
