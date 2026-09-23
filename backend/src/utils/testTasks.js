const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Group = require('../models/Group');
const Task = require('../models/Task');

async function testTaskWorkflow() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  const user = await User.findOne({ role: 'user' });
  const group = await Group.findOne({ isDeleted: false });

  if (!admin || !user) {
    console.error('Missing seed users');
    process.exit(1);
  }

  console.log(`Admin: ${admin.email}, User: ${user.email}`);

  // 1. Create Task
  const task = await Task.create({
    title: 'Automated CI/CD Pipeline Build',
    description: 'Deploy GitHub Actions workflow for linting, testing, and production builds.',
    priority: 'high',
    deadline: new Date(Date.now() + 48 * 3600 * 1000),
    assignedTo: [user._id],
    groupId: group?._id || null,
    status: 'todo',
    statusHistory: [
      {
        status: 'todo',
        changedBy: admin._id,
        changedAt: new Date(),
      },
    ],
    createdBy: admin._id,
    workspaceId: admin.workspaceId,
  });

  console.log('Task created with ID:', task._id);

  // 2. User moves status to 'inprogress'
  task.status = 'inprogress';
  task.statusHistory.push({
    status: 'inprogress',
    changedBy: user._id,
    changedAt: new Date(),
  });
  await task.save();

  // 3. User moves status to 'completed'
  task.status = 'completed';
  task.statusHistory.push({
    status: 'completed',
    changedBy: user._id,
    changedAt: new Date(),
  });
  await task.save();

  // 4. Verify populated history
  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'name email')
    .populate('statusHistory.changedBy', 'name email');

  console.log(`Task "${populated.title}" final status: ${populated.status}`);
  console.log('Status History count:', populated.statusHistory.length);
  populated.statusHistory.forEach((h, i) => {
    console.log(`  [${i + 1}] ${h.status.toUpperCase()} by ${h.changedBy?.name} at ${h.changedAt.toISOString()}`);
  });

  // Clean up test doc
  await Task.findByIdAndDelete(task._id);
  console.log('Test cleanup completed');

  await mongoose.disconnect();
  console.log('Task workflow test passed successfully!');
}

testTaskWorkflow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
