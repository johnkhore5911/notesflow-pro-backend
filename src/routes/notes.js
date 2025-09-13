const express = require('express');
const { validationResult } = require('express-validator');
const notesService = require('../services/notesService');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const {
  createNoteValidation,
  updateNoteValidation,
  noteIdValidation,
  paginationValidation
} = require('../utils/validation');
const { HTTP_STATUS, ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private (Admin, Member)
 */
router.post('/', createNoteValidation, async (req, res) => {
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

    const result = await notesService.createNote(
      req.body,
      req.user.id,
      req.user.tenant_id
    );

    res.status(HTTP_STATUS.CREATED).json(result);
  } catch (error) {
    const statusCode = error.message.includes('limit exceeded') 
      ? HTTP_STATUS.FORBIDDEN 
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/notes
 * @desc    Get all notes for the tenant (with pagination and search)
 * @access  Private (Admin: all notes, Member: own notes)
 */
router.get('/', paginationValidation, async (req, res) => {
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

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || '',
      archived: req.query.archived === 'true'
    };

    // Members can only see their own notes
    if (req.user.role === ROLES.MEMBER) {
      options.user_id = req.user.id;
    }

    const result = await notesService.getNotes(req.user.tenant_id, options);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/notes/stats
 * @desc    Get notes statistics for the tenant
 * @access  Private (Admin only)
 */
router.get('/stats', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const result = await notesService.getNotesStats(req.user.tenant_id);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/notes/:id
 * @desc    Get a specific note
 * @access  Private (Admin: any note, Member: own note)
 */
router.get('/:id', noteIdValidation, async (req, res) => {
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

    // Members can only access their own notes
    const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

    const result = await notesService.getNoteById(
      req.params.id,
      req.user.tenant_id,
      userId
    );

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') 
      ? HTTP_STATUS.NOT_FOUND 
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note
 * @access  Private (Admin: any note, Member: own note)
 */
router.put('/:id', updateNoteValidation, async (req, res) => {
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

    // Members can only update their own notes
    const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

    const result = await notesService.updateNote(
      req.params.id,
      req.body,
      req.user.tenant_id,
      userId
    );

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') 
      ? HTTP_STATUS.NOT_FOUND 
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note
 * @access  Private (Admin: any note, Member: own note)
 */
router.delete('/:id', noteIdValidation, async (req, res) => {
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

    // Members can only delete their own notes
    const userId = req.user.role === ROLES.MEMBER ? req.user.id : null;

    const result = await notesService.deleteNote(
      req.params.id,
      req.user.tenant_id,
      userId
    );

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') 
      ? HTTP_STATUS.NOT_FOUND 
      : HTTP_STATUS.BAD_REQUEST;
    
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
