const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Tenant slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    enum: ['acme', 'globex'], // As per assignment requirements
    index: true
  },
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxLength: [100, 'Tenant name cannot exceed 100 characters']
  },
  subscription_plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
    index: true
  },
  note_limit: {
    type: Number,
    default: 3,
    min: [0, 'Note limit cannot be negative']
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
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

// Indexes for performance [10]
tenantSchema.index({ slug: 1 });
tenantSchema.index({ subscription_plan: 1, is_active: 1 });

// Instance method to upgrade subscription
tenantSchema.methods.upgradeToPro = function() {
  this.subscription_plan = 'pro';
  this.note_limit = -1; // -1 means unlimited
  return this.save();
};

// Static method to find active tenants
tenantSchema.statics.findActiveTenants = function() {
  return this.find({ is_active: true });
};

module.exports = mongoose.model('Tenant', tenantSchema);
