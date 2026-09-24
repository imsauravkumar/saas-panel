const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskSummary,
  getTaskById,
  getPendingReviewTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  addTaskComment,
  deleteTask,
} = require('../controllers/taskController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, createTaskSchema } = require('../middleware/validate');

router.use(authenticate);

// List & Summary
router.get('/', getTasks);
router.get('/summary', getTaskSummary);
router.get('/pending-review', requireAdmin, getPendingReviewTasks);
router.get('/:id', getTaskById);

// Mutations
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/comments', addTaskComment);

// Admin controls
router.post('/', requireAdmin, validate(createTaskSchema), createTask);
router.put('/:id', requireAdmin, updateTask);
router.delete('/:id', requireAdmin, deleteTask);

module.exports = router;
