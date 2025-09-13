const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    index: true
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    required: [true, 'User role is required'],
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  last_login: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Compound indexes for tenant isolation and performance [10][13]
userSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
userSchema.index({ tenant_id: 1, role: 1 });
userSchema.index({ tenant_id: 1, is_active: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  
  try {
    const saltRounds = 12;
    this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Static method to find users by tenant [13]
userSchema.statics.findByTenant = function(tenantId, options = {}) {
  return this.find({ 
    tenant_id: tenantId, 
    is_active: true,
    ...options 
  }).populate('tenant_id', 'slug name subscription_plan');
};

// Virtual for user's full tenant info
userSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenant_id',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('User', userSchema);
