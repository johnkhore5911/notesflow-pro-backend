const { validationResult } = require('express-validator');
const notesService = require('../services/notesService');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../utils/constants');

class NotesController {
  /**
   * Create a new note
   * @route POST /api/notes
   */
  async createNote(req, res) {
    try {
      // Validate request [3]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      // Extract note data from request body
      const noteData = {
        title: req.body.title.trim(),
        content: req.body.content.trim(),
        tags: req.body.tags || []
      };

      // Call service layer [5]
      const result = await notesService.createNote(
        noteData,
        req.user.id,
        req.user.tenant_id
      );

      return res.status(HTTP_STATUS.CREATED).json(result);

    } catch (error) {
      console.error('Create note error:', error);
      
      // Handle specific error types
      const statusCode = error.message.includes('limit exceeded')
        ? HTTP_STATUS.FORBIDDEN
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create note'
      });
    }
  }

  /**
   * Get all notes for tenant with pagination and search
   * @route GET /api/notes
   */
  async getNotes(req, res) {
    try {
      // Validate query parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      // Parse and validate query parameters
      const options = {
        page: Math.max(1, parseInt(req.query.page) || 1),
        limit: Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)),
        search: req.query.search ? req.query.search.trim() : '',
        archived: req.query.archived === 'true'
      };

      // Members can only see their own notes [7]
      if (req.user.role === ROLES.MEMBER) {
        options.user_id = req.user.id;
      }

      const result = await notesService.getNotes(req.user.tenant_id, options);

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get notes error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve notes'
      });
    }
  }

  /**
   * Get notes statistics
   * @route GET /api/notes/stats
   */
  async getNotesStats(req, res) {
    try {
      const result = await notesService.getNotesStats(req.user.tenant_id);
      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get notes stats error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to retrieve notes statistics'
      });
    }
  }

  /**
   * Get a specific note by ID
   * @route GET /api/notes/:id
   */
  async getNoteById(req, res) {
    try {
      // Validate parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      const noteId = req.params.id;
      
      // Members can only access their own notes
      const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

      const result = await notesService.getNoteById(
        noteId,
        req.user.tenant_id,
        userId
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Get note by ID error:', error);
      
      const statusCode = error.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve note'
      });
    }
  }

  /**
   * Update a note
   * @route PUT /api/notes/:id
   */
  async updateNote(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      const noteId = req.params.id;
      
      // Prepare update data
      const updateData = {};
      if (req.body.title !== undefined) {
        updateData.title = req.body.title.trim();
      }
      if (req.body.content !== undefined) {
        updateData.content = req.body.content.trim();
      }
      if (req.body.tags !== undefined) {
        updateData.tags = req.body.tags;
      }
      if (req.body.is_archived !== undefined) {
        updateData.is_archived = req.body.is_archived;
      }

      // Members can only update their own notes
      const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

      const result = await notesService.updateNote(
        noteId,
        updateData,
        req.user.tenant_id,
        userId
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Update note error:', error);
      
      const statusCode = error.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update note'
      });
    }
  }

  /**
   * Delete a note (soft delete)
   * @route DELETE /api/notes/:id
   */
  async deleteNote(req, res) {
    try {
      // Validate parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
          errors: errors.array()
        });
      }

      const noteId = req.params.id;
      
      // Members can only delete their own notes
      const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

      const result = await notesService.deleteNote(
        noteId,
        req.user.tenant_id,
        userId
      );

      return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('Delete note error:', error);
      
      const statusCode = error.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete note'
      });
    }
  }

  /**
   * Archive/Unarchive a note
   * @route PATCH /api/notes/:id/archive
   */
  async toggleArchiveNote(req, res) {
    try {
      const noteId = req.params.id;
      const { archived } = req.body;

      // Members can only archive their own notes
      const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

      const result = await notesService.updateNote(
        noteId,
        { is_archived: archived },
        req.user.tenant_id,
        userId
      );

      return res.status(HTTP_STATUS.OK).json({
        ...result,
        message: archived ? 'Note archived successfully' : 'Note unarchived successfully'
      });

    } catch (error) {
      console.error('Toggle archive note error:', error);
      
      const statusCode = error.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.BAD_REQUEST;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to toggle note archive status'
      });
    }
  }

  /**
   * Search notes with advanced filtering
   * @route GET /api/notes/search
   */
  async searchNotes(req, res) {
    try {
      const { q: query, tags, page, limit } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const options = {
        page: Math.max(1, parseInt(page) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit) || 10)),
        search: query.trim()
      };

      // Filter by tags if provided
      if (tags) {
        options.tags = Array.isArray(tags) ? tags : tags.split(',');
      }

      // Members can only search their own notes
      if (req.user.role === ROLES.MEMBER) {
        options.user_id = req.user.id;
      }

      const result = await notesService.getNotes(req.user.tenant_id, options);

      return res.status(HTTP_STATUS.OK).json({
        ...result,
        search_query: query,
        search_filters: {
          tags: options.tags || null
        }
      });

    } catch (error) {
      console.error('Search notes error:', error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to search notes'
      });
    }
  }
}

module.exports = new NotesController();
