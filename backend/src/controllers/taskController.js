const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
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
 * Get task summary metrics (total, todo, inprogress, completed, overdue)
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
      completed: tasks.filter((t) => t.status === 'completed').length,
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
 * Update task status (Accessible by assigned user or Admin)
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['todo', 'inprogress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
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
    if (req.user.role !== 'admin' && !isAssigned) {
      return res
        .status(403)
        .json({ success: false, message: 'You are not authorized to update this task.' });
    }

    const previousStatus = task.status;
    task.status = status;
    task.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    await task.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'task.statusChange',
      targetType: 'Task',
      targetId: task._id,
      details: `${req.user.name} moved "${task.title}" to ${status.toUpperCase()}`,
      metadata: { from: previousStatus, to: status },
      workspaceId: req.user.workspaceId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar post department')
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar')
      .populate('statusHistory.changedBy', 'name email avatar')
      .populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace_${req.user.workspaceId}`).emit('task_updated', populatedTask);
      io.to(`workspace:${req.user.workspaceId}`).emit('task:statusChanged', {
        taskId: task._id,
        status,
        changedBy: { _id: req.user._id, name: req.user.name },
        task: populatedTask,
      });

      // Target assigned users and admin
      task.assignedTo.forEach((userId) => {
        io.to(`user:${userId.toString()}`).emit('task:statusChanged', {
          taskId: task._id,
          status,
          changedBy: { _id: req.user._id, name: req.user.name },
          task: populatedTask,
        });
      });
    }

    // Notify admin(s) when an assignee updates the status (not if admin themselves changed it)
    if (req.user.role !== 'admin') {
      try {
        const admins = await User.find({
          workspaceId: req.user.workspaceId,
          role: 'admin',
          status: { $ne: 'disabled' },
        }).select('_id');

        if (admins.length > 0) {
          const adminIds = admins.map((a) => a._id);
          const statusLabel =
            status === 'completed'
              ? '✅ Completed'
              : status === 'inprogress'
                ? '🔄 In Progress'
                : '📋 To Do';
          await notify({
            userIds: adminIds,
            type: 'task',
            title: `Task Update: "${task.title}"`,
            body: `${req.user.name} moved the task to ${statusLabel}`,
            linkTo: 'tasks',
            refId: task._id,
            workspaceId: req.user.workspaceId,
            io,
          });
        }
      } catch (notifyErr) {
        console.error('[Task Status Notify Admin Error]:', notifyErr);
      }
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
  createTask,
  updateTaskStatus,
  updateTask,
  addTaskComment,
  deleteTask,
};
