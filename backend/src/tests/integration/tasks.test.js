const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Task = require('../../models/Task');

describe('Integration Test: Task Management & Status Workflow Suite', () => {
  let adminUser;
  let standardUser;
  let testTask;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    testTask = await Task.create({
      title: 'QA Automated Task Workflow',
      description: 'End to end testing of status lifecycle',
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
    await mongoose.disconnect();
  });

  test('Task created in todo status with initial statusHistory entry', async () => {
    expect(testTask.status).toBe('todo');
    expect(testTask.statusHistory.length).toBe(1);
    expect(testTask.priority).toBe('high');
  });

  test('Task progresses through In Progress and Completed states with audit log', async () => {
    // 1. Move to inprogress
    testTask.status = 'inprogress';
    testTask.statusHistory.push({
      status: 'inprogress',
      changedBy: standardUser._id,
      changedAt: new Date(),
    });
    await testTask.save();

    // 2. Move to completed
    testTask.status = 'completed';
    testTask.statusHistory.push({
      status: 'completed',
      changedBy: standardUser._id,
      changedAt: new Date(),
    });
    await testTask.save();

    const refreshed = await Task.findById(testTask._id);
    expect(refreshed.status).toBe('completed');
    expect(refreshed.statusHistory.length).toBe(3);
  });
});
