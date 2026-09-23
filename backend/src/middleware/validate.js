const { z } = require('zod');

/**
 * Generic Zod request validator middleware
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + issues.map((i) => i.message).join(', '),
        errors: issues,
      });
    }
    return res.status(400).json({ success: false, message: 'Invalid input payload' });
  }
};

// 1. User Creation Schema
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').trim(),
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    post: z.string().max(100, 'Role title cannot exceed 100 characters').optional().default('Team Member'),
    role: z.enum(['admin', 'user']).optional().default('user'),
    groupIds: z.array(z.string()).optional().default([]),
    phone: z.string().max(20).optional(),
    department: z.string().max(100).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  }),
});

// 2. Group Creation Schema
const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Group name must be at least 2 characters').max(100, 'Group name cannot exceed 100 characters').trim(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
    chatPermission: z.enum(['everyone', 'adminOnly']).optional().default('everyone'),
    memberIds: z.array(z.string()).optional().default([]),
  }),
});

// 3. Task Creation Schema
const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters').max(200, 'Task title cannot exceed 200 characters').trim(),
    description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional().default(''),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    deadline: z.string().optional(),
    assignedTo: z.array(z.string()).optional().default([]),
    groupId: z.string().optional().nullable(),
  }),
});

// 4. Meeting Creation Schema
const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Meeting title must be at least 2 characters').max(200, 'Meeting title cannot exceed 200 characters').trim(),
    dateTime: z.string().optional(),
    durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours').optional().default(45),
    attendeeIds: z.array(z.string()).optional().default([]),
    groupId: z.string().min(1, 'Target channel/group is required'),
    description: z.string().max(2000).optional().default(''),
    meetingType: z.enum(['general', 'standup', 'sync', 'review', 'demo', 'allhands']).optional().default('general'),
    isInstant: z.boolean().optional().default(false),
    googleMeetLink: z.string().optional(),
  }),
});

// 5. Announcement Creation Schema
const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Announcement title must be at least 2 characters').max(200, 'Title cannot exceed 200 characters').trim(),
    body: z.string().min(2, 'Announcement body must be at least 2 characters').max(10000, 'Body cannot exceed 10000 characters').trim(),
    scope: z.enum(['company', 'group']),
    groupId: z.string().optional().nullable(),
    pinned: z.boolean().optional().default(false),
  }),
});

// 6. Password Change Schema
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
  }),
});

module.exports = {
  validate,
  createUserSchema,
  createGroupSchema,
  createTaskSchema,
  createMeetingSchema,
  createAnnouncementSchema,
  changePasswordSchema,
};
