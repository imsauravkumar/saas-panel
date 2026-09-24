const Task = require('../models/Task');
const User = require('../models/User');
const Group = require('../models/Group');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { notify } = require('../services/notify');

/**
 * Get tasks
 * Admin sees all workspace tasks; User sees tasks assigned to them or their groups
 */
const getTasks = async (req, res) => {
  try {
    const { status, priority, groupId, assignedTo, search } = req.query;
    let query = { workspaceId: req.user.workspaceId, isDeleted: false };

    if (req.user.role !== 'admin') {
      query.$or = [{ assignedTo: req.user._id }, { groupId: { $in: req.user.groupIds || [] } }];
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (groupId) query.groupId = groupId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar')
      .populate('comments.user', 'name avatar')
      .sort({ deadline: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('[Get Tasks Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

/**
 * Get task summary metrics (total, todo, inprogress, submittedForReview, completed, reopened, overdue)
 */
const getTaskSummary = async (req, res) => {
  try {
    let query = { workspaceId: req.user.workspaceId, isDeleted: false };
    if (req.user.role !== 'admin') {
      query.$or = [{ assignedTo: req.user._id }, { groupId: { $in: req.user.groupIds || [] } }];
    }

    const tasks = await Task.find(query);
    const now = new Date();

    const summary = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inprogress: tasks.filter((t) => t.status === 'inprogress').length,
      submittedForReview: tasks.filter((t) => t.status === 'submittedForReview').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      reopened: tasks.filter((t) => t.status === 'reopened').length,
      overdue: tasks.filter((t) => t.status !== 'completed' && new Date(t.deadline) < now).length,
    };

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('[Get Task Summary Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate task summary' });
  }
};

/**
 * Get single task detail
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    })
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar memberIds')
      .populate('createdBy', 'name email avatar post')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar post')
      .populate('comments.user', 'name avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.user.role !== 'admin') {
      const isAssigned = task.assignedTo.some((u) => u._id.toString() === req.user._id.toString());
      const isGroupMember = task.groupId?.memberIds?.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isAssigned && !isGroupMember) {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied: You are not assigned to this task' });
      }
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('[Get Task Detail Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch task details' });
  }
};

/**
 * Admin: Get all tasks pending review across the workspace
 * Sorted oldest-submitted-first
 */
const getPendingReviewTasks = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied: Admin role required' });
    }

    const tasks = await Task.find({
      workspaceId: req.user.workspaceId,
      isDeleted: false,
      status: 'submittedForReview',
    })
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar post')
      .populate('comments.user', 'name avatar')
      .sort({ submittedAt: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('[Get Pending Review Tasks Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch pending review tasks' });
  }
};

/**
 * Admin: Create a new work task
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description = '',
      assignedTo = [],
      groupId = null,
      priority = 'medium',
      deadline,
    } = req.body;

    if (!title || !deadline) {
      return res
        .status(400)
        .json({ success: false, message: 'Task title and deadline are required.' });
    }

    if (!assignedTo || !Array.isArray(assignedTo) || assignedTo.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'At least one assignee must be selected.' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      groupId: groupId || null,
      priority,
      deadline: new Date(deadline),
      status: 'todo',
      statusHistory: [
        {
          status: 'todo',
          changedBy: req.user._id,
          changedAt: new Date(),
        },
      ],
      createdBy: req.user._id,
      workspaceId: req.user.workspaceId,
    });

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'task.create',
      targetType: 'Task',
      targetId: task._id,
      details: `${req.user.name} created task "${task.title}" with priority ${priority.toUpperCase()}`,
      metadata: { priority, assigneeCount: assignedTo.length, deadline: new Date(deadline) },
      workspaceId: req.user.workspaceId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('statusHistory.changedBy', 'name email avatar');

    // Real-time Socket.IO dispatches
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task_created', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task_created', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task:new', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task:new', populatedTask);

      // Notify each assigned user room specifically
      assignedTo.forEach((userId) => {
        io.to(`user:${userId.toString()}`).emit('task:assigned', populatedTask);
      });
    }

    // Unified in-app Notification Center entry
    await notify({
      userIds: assignedTo,
      type: 'task',
      title: `📋 New Task Assigned: ${task.title}`,
      body: `Priority: ${priority.toUpperCase()} · Due ${new Date(deadline).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`,
      linkTo: 'tasks',
      refId: task._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    return res.status(201).json({
      success: true,
      message: 'Task created and assigned successfully',
      task: populatedTask,
    });
  } catch (error) {
    console.error('[Create Task Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to create task: ' + error.message });
  }
};

/**
 * Update task status
 * - Only assigned user or admin can move: todo -> inprogress
 * - Only assigned user or admin can move: inprogress -> submittedForReview
 * - Only assigned user or admin can move: reopened -> inprogress or submittedForReview
 * - Only ADMIN can move: submittedForReview -> completed (Approve/Verify) or submittedForReview -> reopened (Reject, requires non-empty note)
 * - User CANNOT mark task completed directly
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['todo', 'inprogress', 'submittedForReview', 'completed', 'reopened'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    const task = await Task.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check authorization: must be admin or in assignedTo
    const isAssigned = task.assignedTo.some((u) => u.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isAssigned) {
      return res
        .status(403)
        .json({ success: false, message: 'You are not authorized to update this task.' });
    }

    const currentStatus = task.status;

    // No-op if target status is identical
    if (currentStatus === status) {
      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email avatar post department')
        .populate('groupId', 'name avatar')
        .populate('createdBy', 'name email avatar')
        .populate('verifiedBy', 'name email avatar post')
        .populate('statusHistory.changedBy', 'name email avatar')
        .populate('comments.user', 'name avatar');
      return res.status(200).json({ success: true, task: populatedTask });
    }

    // State machine transition validation
    if (currentStatus === 'todo') {
      if (status !== 'inprogress') {
        return res.status(400).json({
          success: false,
          message: 'Tasks in "To Do" must first be moved to "In Progress".',
        });
      }
    } else if (currentStatus === 'inprogress') {
      if (status === 'completed') {
        return res.status(403).json({
          success: false,
          message:
            'Tasks cannot be marked as completed directly. Please submit the task for Admin review.',
        });
      }
      if (!['todo', 'submittedForReview'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from "In Progress" to "${status}".`,
        });
      }
    } else if (currentStatus === 'reopened') {
      if (status === 'completed') {
        return res.status(403).json({
          success: false,
          message:
            'Tasks cannot be marked as completed directly. Please submit the task for Admin review once fixed.',
        });
      }
      if (!['inprogress', 'submittedForReview'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from "Reopened" to "${status}".`,
        });
      }
    } else if (currentStatus === 'submittedForReview') {
      // Only Admin can act on tasks in review
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message:
            'Only workspace administrators can approve or reject tasks submitted for review.',
        });
      }
      if (!['completed', 'reopened'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Review queue tasks can only be approved ("completed") or rejected ("reopened").`,
        });
      }
      // Rejection requires non-empty feedback note
      if (status === 'reopened' && (!note || typeof note !== 'string' || !note.trim())) {
        return res.status(400).json({
          success: false,
          message:
            'A feedback note explaining what needs fixing is required when rejecting a task.',
        });
      }
    } else if (currentStatus === 'completed') {
      // Only Admin can modify a completed task
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only workspace administrators can reopen a completed task.',
        });
      }
      if (!['inprogress', 'reopened', 'todo'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from "Completed" to "${status}".`,
        });
      }
    }

    const previousStatus = task.status;
    task.status = status;

    // Set timestamps & verification metadata
    if (status === 'submittedForReview') {
      task.submittedAt = new Date();
    } else if (status === 'completed') {
      task.verifiedBy = req.user._id;
      task.verifiedAt = new Date();
    } else if (['inprogress', 'reopened', 'todo'].includes(status) && previousStatus === 'completed') {
      task.verifiedBy = null;
      task.verifiedAt = null;
    }

    task.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      note: note && typeof note === 'string' ? note.trim() : '',
    });

    await task.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'task.statusChange',
      targetType: 'Task',
      targetId: task._id,
      details: `${req.user.name} moved "${task.title}" to ${status.toUpperCase()}${note ? ` (Note: "${note.trim()}")` : ''}`,
      metadata: { from: previousStatus, to: status, note: note ? note.trim() : undefined },
      workspaceId: req.user.workspaceId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar')
      .populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task:updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task:updated', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task:statusChanged', {
        taskId: task._id,
        status,
        changedBy: { _id: req.user._id, name: req.user.name },
        note: note ? note.trim() : undefined,
        task: populatedTask,
      });

      // Target assigned users and admins
      task.assignedTo.forEach((userId) => {
        io.to(`user:${userId.toString()}`).emit('task:statusChanged', {
          taskId: task._id,
          status,
          changedBy: { _id: req.user._id, name: req.user.name },
          note: note ? note.trim() : undefined,
          task: populatedTask,
        });
      });
    }

    // In-app Notifications
    try {
      if (status === 'submittedForReview') {
        // User submitted for review -> Notify workspace admins
        const admins = await User.find({
          workspaceId: req.user.workspaceId,
          role: 'admin',
          status: { $ne: 'disabled' },
        }).select('_id');

        if (admins.length > 0) {
          const adminIds = admins.map((a) => a._id);
          const submissionNote = note && typeof note === 'string' && note.trim() ? ` — "${note.trim()}"` : '';
          await notify({
            userIds: adminIds,
            type: 'task',
            title: `📋 Task Submitted for Review`,
            body: `${req.user.name} submitted '${task.title}' for review${submissionNote}`,
            linkTo: 'tasks',
            refId: task._id,
            workspaceId: req.user.workspaceId,
            io,
          });
        }
      } else if (status === 'completed') {
        // Admin verified task -> Notify assignees
        const assigneeIds = task.assignedTo
          .map((id) => id.toString())
          .filter((id) => id !== req.user._id.toString());

        if (assigneeIds.length > 0) {
          await notify({
            userIds: assigneeIds,
            type: 'task',
            title: `✅ Task Approved`,
            body: `Your task '${task.title}' was approved ✅`,
            linkTo: 'tasks',
            refId: task._id,
            workspaceId: req.user.workspaceId,
            io,
          });
        }
      } else if (status === 'reopened') {
        // Admin rejected task -> Notify assignees with the admin's note
        const assigneeIds = task.assignedTo
          .map((id) => id.toString())
          .filter((id) => id !== req.user._id.toString());

        if (assigneeIds.length > 0) {
          const feedbackNote = note && typeof note === 'string' ? note.trim() : 'Please check task details for changes.';
          await notify({
            userIds: assigneeIds,
            type: 'task',
            title: `⚠️ Task Needs Changes`,
            body: `Your task '${task.title}' needs changes: "${feedbackNote}"`,
            linkTo: 'tasks',
            refId: task._id,
            workspaceId: req.user.workspaceId,
            io,
          });
        }
      } else if (!isAdmin && (status === 'inprogress' || status === 'todo')) {
        // Regular user started/resumed task -> Notify admins
        const admins = await User.find({
          workspaceId: req.user.workspaceId,
          role: 'admin',
          status: { $ne: 'disabled' },
        }).select('_id');

        if (admins.length > 0) {
          const adminIds = admins.map((a) => a._id);
          await notify({
            userIds: adminIds,
            type: 'task',
            title: `Task Update: "${task.title}"`,
            body: `${req.user.name} moved the task to ${status === 'inprogress' ? '🔄 In Progress' : '📋 To Do'}`,
            linkTo: 'tasks',
            refId: task._id,
            workspaceId: req.user.workspaceId,
            io,
          });
        }
      }
    } catch (notifyErr) {
      console.error('[Task Status Notification Error]:', notifyErr);
    }

    return res.status(200).json({
      success: true,
      message: `Task status changed to ${status.toUpperCase()}`,
      task: populatedTask,
    });
  } catch (error) {
    console.error('[Update Task Status Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task status' });
  }
};

/**
 * Admin: Edit full task details
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, groupId, priority, deadline, status } = req.body;

    const task = await Task.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (assignedTo && Array.isArray(assignedTo)) task.assignedTo = assignedTo;
    if (groupId !== undefined) task.groupId = groupId || null;
    if (priority) task.priority = priority;
    if (deadline) task.deadline = new Date(deadline);
    if (status && status !== task.status) {
      task.status = status;
      if (status === 'completed') {
        task.verifiedBy = req.user._id;
        task.verifiedAt = new Date();
      }
      task.statusHistory.push({
        status,
        changedBy: req.user._id,
        changedAt: new Date(),
      });
    }

    await task.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'task.edit',
      targetType: 'Task',
      targetId: task._id,
      details: `${req.user.name} updated task "${task.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task:updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task:updated', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task_updated', populatedTask);
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: populatedTask,
    });
  } catch (error) {
    console.error('[Update Task Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

/**
 * Add comment to task
 */
const addTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('verifiedBy', 'name email avatar post')
      .populate('statusHistory.changedBy', 'name email avatar')
      .populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task:updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task:updated', populatedTask);
    }

    // Notify relevant users about the new comment/progress update
    try {
      const notifyUserIds = [];
      if (req.user.role === 'admin') {
        // Admin commented — notify assignees
        task.assignedTo.forEach((uid) => {
          if (uid.toString() !== req.user._id.toString()) {
            notifyUserIds.push(uid);
          }
        });
      } else {
        // Assignee posted progress — notify admin(s)
        const admins = await User.find({
          workspaceId: req.user.workspaceId,
          role: 'admin',
          status: { $ne: 'disabled' },
        }).select('_id');
        admins.forEach((a) => notifyUserIds.push(a._id));
      }

      if (notifyUserIds.length > 0) {
        await notify({
          userIds: notifyUserIds,
          type: 'task',
          title: `💬 Progress Update on "${task.title}"`,
          body: `${req.user.name}: ${text.trim().substring(0, 80)}${text.trim().length > 80 ? '...' : ''}`,
          linkTo: 'tasks',
          refId: task._id,
          workspaceId: req.user.workspaceId,
          io,
        });
      }
    } catch (notifyErr) {
      console.error('[Task Comment Notify Error]:', notifyErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Comment added',
      task: populatedTask,
    });
  } catch (error) {
    console.error('[Add Task Comment Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

/**
 * Admin: Soft delete task
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isDeleted = true;
    await task.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'task.delete',
      targetType: 'Task',
      targetId: id,
      details: `${req.user.name} deleted task "${task.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task:deleted', { taskId: id });
      io.to(`workspace_${req.user.workspaceId}`).emit('task:deleted', { taskId: id });
    }

    return res.status(200).json({
      success: true,
      message: 'Task removed from workspace',
    });
  } catch (error) {
    console.error('[Delete Task Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};

module.exports = {
  getTasks,
  getTaskSummary,
  getTaskById,
  getPendingReviewTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  addTaskComment,
  deleteTask,
};
