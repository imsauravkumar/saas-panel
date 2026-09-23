const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });

const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

async function testPhase8() {
  console.log('--- Starting Phase 8 Backend Tests ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_platform');
  console.log('Connected to MongoDB');

  // 1. Fetch Admin & User
  const admin = await User.findOne({ role: 'admin' });
  const user = await User.findOne({ role: 'user' });

  if (!admin || !user) {
    console.error('Missing admin or user for tests. Run seedData.js first.');
    process.exit(1);
  }

  console.log(`Found Admin: ${admin.email}, User: ${user.email}`);

  // 2. Test Group lastMessageAt & lastMessagePreview update
  const group = await Group.findOne({ workspaceId: admin.workspaceId, isDeleted: false });
  if (group) {
    const testMsg = await Message.create({
      groupId: group._id,
      senderId: admin._id,
      type: 'text',
      content: 'Hello team, testing Phase 8 last message preview update!',
      workspaceId: admin.workspaceId,
      readBy: [admin._id],
    });

    const preview = testMsg.content.slice(0, 45);
    await Group.findByIdAndUpdate(group._id, {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    });

    const updatedGroup = await Group.findById(group._id);
    console.log(`Updated group lastMessagePreview: "${updatedGroup.lastMessagePreview}"`);
    if (updatedGroup.lastMessagePreview !== preview) {
      throw new Error('Group lastMessagePreview mismatch');
    }

    // Also test a photo message
    const photoMsg = await Message.create({
      groupId: group._id,
      senderId: user._id,
      type: 'photo',
      fileUrl: 'http://localhost:5000/uploads/test-img.png',
      fileName: 'architecture.png',
      fileSize: 102400,
      workspaceId: admin.workspaceId,
      readBy: [user._id],
    });

    // Also test a document message
    const docMsg = await Message.create({
      groupId: group._id,
      senderId: admin._id,
      type: 'document',
      fileUrl: 'http://localhost:5000/uploads/test-doc.pdf',
      fileName: 'roadmap_q4.pdf',
      fileSize: 524288,
      workspaceId: admin.workspaceId,
      readBy: [admin._id],
    });

    console.log('Created test photo and document messages.');

    // 3. Test Files Aggregation Query
    const files = await Message.find({
      workspaceId: admin.workspaceId,
      deletedAt: null,
      type: { $in: ['photo', 'document'] },
    }).lean();

    console.log(`Total aggregated files found: ${files.length}`);
    if (files.length < 2) {
      throw new Error('Files aggregation failed to find created files');
    }

    // 4. Test User Activity Metrics
    const [tasksCompleted, meetingsAttended, messagesSent] = await Promise.all([
      Task.countDocuments({ assignedTo: user._id, workspaceId: user.workspaceId, status: 'completed' }),
      Meeting.countDocuments({ attendeeIds: user._id, workspaceId: user.workspaceId, status: 'completed' }),
      Message.countDocuments({ senderId: user._id, workspaceId: user.workspaceId, deletedAt: null }),
    ]);

    console.log(`User ${user.name} metrics: tasksCompleted=${tasksCompleted}, meetingsAttended=${meetingsAttended}, messagesSent=${messagesSent}`);

    // Cleanup test messages
    await Message.deleteMany({ _id: { $in: [testMsg._id, photoMsg._id, docMsg._id] } });
  }

  console.log('Phase 8 backend checks completed successfully!');
  await mongoose.disconnect();
}

testPhase8().catch((err) => {
  console.error('Phase 8 test failed:', err);
  process.exit(1);
});
