const { Note, Tenant } = require('../models');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, SUBSCRIPTION_PLANS } = require('../utils/constants');

class NotesService {
  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Created note
   */
  async createNote(noteData, userId, tenantId) {
    try {
      // Check subscription limits
      await this.checkNoteLimit(tenantId);

      const note = new Note({
        ...noteData,
        user_id: userId,
        tenant_id: tenantId
      });

      await note.save();
      await note.populate([
        { path: 'user_id', select: 'email role' },
        { path: 'tenant_id', select: 'slug name' }
      ]);

      return {
        success: true,
        message: SUCCESS_MESSAGES.NOTE.CREATED,
        data: note
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all notes for a tenant with pagination and search
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Notes with pagination
   */
  async getNotes(tenantId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        user_id = null,
        archived = false
      } = options;

      // Build query
      const query = {
        tenant_id: tenantId,
        is_deleted: false,
        is_archived: archived
      };

      // Add user filter if specified
      if (user_id) {
        query.user_id = user_id;
      }

      // Add search if specified
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with population
      const [notes, totalCount] = await Promise.all([
        Note.find(query)
          .populate('user_id', 'email role')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Note.countDocuments(query)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          notes,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: totalCount,
            per_page: parseInt(limit),
            has_next_page: hasNextPage,
            has_prev_page: hasPrevPage
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a specific note by ID
   * @param {string} noteId - Note ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional, for member role)
   * @returns {Promise<Object>} - Note data
   */
  async getNoteById(noteId, tenantId, userId = null) {
    try {
      const query = {
        _id: noteId,
        tenant_id: tenantId,
        is_deleted: false
      };

      // If userId is provided (member role), restrict to user's notes
      if (userId) {
        query.user_id = userId;
      }

      const note = await Note.findOne(query)
        .populate('user_id', 'email role')
        .populate('tenant_id', 'slug name');

      if (!note) {
        throw new Error(ERROR_MESSAGES.NOTE.NOT_FOUND);
      }

      return {
        success: true,
        data: note
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a note
   * @param {string} noteId - Note ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional, for member role)
   * @returns {Promise<Object>} - Updated note
   */
  async updateNote(noteId, updateData, tenantId, userId = null) {
    try {
      const query = {
        _id: noteId,
        tenant_id: tenantId,
        is_deleted: false
      };

      // If userId is provided (member role), restrict to user's notes
      if (userId) {
        query.user_id = userId;
      }

      const note = await Note.findOneAndUpdate(
        query,
        { ...updateData, updated_at: new Date() },
        { new: true, runValidators: true }
      ).populate([
        { path: 'user_id', select: 'email role' },
        { path: 'tenant_id', select: 'slug name' }
      ]);

      if (!note) {
        throw new Error(ERROR_MESSAGES.NOTE.NOT_FOUND);
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.NOTE.UPDATED,
        data: note
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a note (soft delete)
   * @param {string} noteId - Note ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional, for member role)
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteNote(noteId, tenantId, userId = null) {
    try {
      const query = {
        _id: noteId,
        tenant_id: tenantId,
        is_deleted: false
      };

      // If userId is provided (member role), restrict to user's notes
      if (userId) {
        query.user_id = userId;
      }

      const note = await Note.findOneAndUpdate(
        query,
        { is_deleted: true, updated_at: new Date() },
        { new: true }
      );

      if (!note) {
        throw new Error(ERROR_MESSAGES.NOTE.NOT_FOUND);
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.NOTE.DELETED
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if tenant has reached note limit
   * @param {string} tenantId - Tenant ID
   * @throws {Error} - If limit exceeded
   */
  async checkNoteLimit(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(ERROR_MESSAGES.TENANT.NOT_FOUND);
      }

      // Skip check for Pro subscribers
      if (tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO) {
        return;
      }

      // Count existing notes
      const noteCount = await Note.countDocuments({
        tenant_id: tenantId,
        is_deleted: false
      });

      if (noteCount >= tenant.note_limit) {
        throw new Error(ERROR_MESSAGES.NOTE.LIMIT_EXCEEDED);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notes statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} - Notes statistics
   */
  async getNotesStats(tenantId) {
    try {
      const [
        totalNotes,
        archivedNotes,
        tenant
      ] = await Promise.all([
        Note.countDocuments({ tenant_id: tenantId, is_deleted: false }),
        Note.countDocuments({ tenant_id: tenantId, is_deleted: false, is_archived: true }),
        Tenant.findById(tenantId)
      ]);

      const activeNotes = totalNotes - archivedNotes;
      const remainingNotes = tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO 
        ? -1 // Unlimited
        : Math.max(0, tenant.note_limit - totalNotes);

      return {
        success: true,
        data: {
          total_notes: totalNotes,
          active_notes: activeNotes,
          archived_notes: archivedNotes,
          note_limit: tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO ? -1 : tenant.note_limit,
          remaining_notes: remainingNotes,
          subscription_plan: tenant.subscription_plan,
          can_create_notes: remainingNotes > 0 || tenant.subscription_plan === SUBSCRIPTION_PLANS.PRO
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new NotesService();
