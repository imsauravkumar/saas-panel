const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Group = require('../../models/Group');
const ActivityLog = require('../../models/ActivityLog');
const Notification = require('../../models/Notification');
const Task = require('../../models/Task');
const { updateTaskStatus, getPendingReviewTasks } = require('../../controllers/taskController');

describe('Integration Test: Task Management & Admin Verification Lifecycle', () => {
  let adminUser;
  let standardUser;
  let otherUser;
  let testTask;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });
    otherUser = await User.findOne({ role: 'user', _id: { $ne: standardUser._id } });

    // Fallback if otherUser doesn't exist
    if (!otherUser) {
      otherUser = await User.create({
        name: 'Other Teammate',
        email: 'other_test_user@saasnexus.internal',
        password: 'Password123!',
        role: 'user',
        workspaceId: adminUser.workspaceId,
      });
    }

    testTask = await Task.create({
      title: 'QA Automated Verification Flow Task',
      description: 'Test admin verification requirement before task completion',
      priority: 'high',
      status: 'todo',
      deadline: new Date(Date.now() + 86400000),
      assignedTo: [standardUser._id],
      createdBy: adminUser._id,
      workspaceId: adminUser.workspaceId,
      statusHistory: [
        {
          status: 'todo',
          changedBy: adminUser._id,
          changedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    if (testTask?._id) {
      await Task.findByIdAndDelete(testTask._id);
    }
    if (otherUser?.email === 'other_test_user@saasnexus.internal') {
      await User.findByIdAndDelete(otherUser._id);
    }
    await mongoose.disconnect();
  });

  // Mock response helper
  const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('1. Task starts in "todo" with statusHistory tracking', async () => {
    expect(testTask.status).toBe('todo');
    expect(testTask.statusHistory.length).toBe(1);
    expect(testTask.statusHistory[0].status).toBe('todo');
  });

  test('2. Assigned user moves task from "todo" to "inprogress"', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: { status: 'inprogress' },
      user: standardUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updated = await Task.findById(testTask._id);
    expect(updated.status).toBe('inprogress');
    expect(updated.statusHistory.length).toBe(2);
    expect(updated.statusHistory[1].status).toBe('inprogress');
  });

  test('3. Assigned user is FORBIDDEN from marking task directly as "completed"', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: { status: 'completed' },
      user: standardUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('cannot be marked as completed directly'),
      })
    );

    // Verify DB remains inprogress
    const current = await Task.findById(testTask._id);
    expect(current.status).toBe('inprogress');
  });

  test('4. Assigned user submits task for review with optional submission note', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: {
        status: 'submittedForReview',
        note: 'Completed all pull requests and unit tests. Ready for verification.',
      },
      user: standardUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const submitted = await Task.findById(testTask._id);
    expect(submitted.status).toBe('submittedForReview');
    expect(submitted.submittedAt).toBeTruthy();
    expect(submitted.statusHistory.length).toBe(3);
    expect(submitted.statusHistory[2].status).toBe('submittedForReview');
    expect(submitted.statusHistory[2].note).toBe(
      'Completed all pull requests and unit tests. Ready for verification.'
    );
  });

  test('5. Non-admin user cannot approve or reject task in review queue', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: { status: 'completed' },
      user: standardUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Only workspace administrators'),
      })
    );
  });

  test('6. Admin rejecting a submitted task without a note returns 400 Bad Request', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: { status: 'reopened', note: '   ' }, // empty note
      user: adminUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('A feedback note explaining what needs fixing is required'),
      })
    );
  });

  test('7. Admin rejects task with feedback note, transitioning to "reopened"', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: {
        status: 'reopened',
        note: 'Please update documentation and fix failing edge case in login test.',
      },
      user: adminUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const rejected = await Task.findById(testTask._id);
    expect(rejected.status).toBe('reopened');
    expect(rejected.statusHistory.length).toBe(4);
    expect(rejected.statusHistory[3].status).toBe('reopened');
    expect(rejected.statusHistory[3].note).toBe(
      'Please update documentation and fix failing edge case in login test.'
    );
  });

  test('8. Assigned user re-submits reopened task for review after addressing feedback', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: {
        status: 'submittedForReview',
        note: 'Fixed edge cases and updated documentation as requested.',
      },
      user: standardUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const resubmitted = await Task.findById(testTask._id);
    expect(resubmitted.status).toBe('submittedForReview');
    expect(resubmitted.statusHistory.length).toBe(5);
  });

  test('9. Admin fetches pending review queue and sees the submitted task', async () => {
    const req = {
      user: adminUser,
    };
    const res = createMockRes();

    await getPendingReviewTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    const found = jsonCall.tasks.some((t) => t._id.toString() === testTask._id.toString());
    expect(found).toBe(true);
  });

  test('10. Admin approves and verifies task, marking it "completed" with verification stamp', async () => {
    const req = {
      params: { id: testTask._id.toString() },
      body: { status: 'completed' },
      user: adminUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const completed = await Task.findById(testTask._id);
    expect(completed.status).toBe('completed');
    expect(completed.verifiedBy.toString()).toBe(adminUser._id.toString());
    expect(completed.verifiedAt).toBeTruthy();
    expect(completed.statusHistory.length).toBe(6);
    expect(completed.statusHistory[5].status).toBe('completed');
  });
});
