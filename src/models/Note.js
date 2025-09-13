const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxLength: [255, 'Title cannot exceed 255 characters'],
    index: 'text' // Text search index
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxLength: [10000, 'Content cannot exceed 10000 characters'],
    index: 'text' // Text search index
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxLength: [50, 'Tag cannot exceed 50 characters']
  }],
  is_archived: {
    type: Boolean,
    default: false,
    index: true
  },
  is_deleted: {
    type: Boolean,
    default: false,
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

// Critical compound indexes for tenant isolation and performance [10][13]
noteSchema.index({ tenant_id: 1, user_id: 1 });
noteSchema.index({ tenant_id: 1, created_at: -1 });
noteSchema.index({ tenant_id: 1, is_deleted: 1, is_archived: 1 });
noteSchema.index({ tenant_id: 1, title: 'text', content: 'text' });

// Static method to find notes by tenant with isolation [13]
noteSchema.statics.findByTenant = function(tenantId, options = {}) {
  return this.find({ 
    tenant_id: tenantId,
    is_deleted: false,
    ...options 
  }).populate('user_id', 'email role')
    .populate('tenant_id', 'slug name');
};

// Static method to count notes by tenant (for subscription limits)
noteSchema.statics.countByTenant = function(tenantId, options = {}) {
  return this.countDocuments({ 
    tenant_id: tenantId,
    is_deleted: false,
    ...options 
  });
};

// Instance method for soft delete
noteSchema.methods.softDelete = function() {
  this.is_deleted = true;
  return this.save();
};

// Instance method to archive/unarchive
noteSchema.methods.toggleArchive = function() {
  this.is_archived = !this.is_archived;
  return this.save();
};

module.exports = mongoose.model('Note', noteSchema);
