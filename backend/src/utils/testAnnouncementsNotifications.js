const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { notify } = require('../services/notify');

async function testPhase7Workflow() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  const users = await User.find({ workspaceId: admin?.workspaceId, status: 'active' });

  if (!admin || users.length === 0) {
    console.error('Missing seed data');
    process.exit(1);
  }

  console.log(`Admin: ${admin.email}, Total active workspace users: ${users.length}`);

  // 1. Create Announcement
  const announcement = await Announcement.create({
    title: 'Company Q4 Vision & Product Launch',
    body: 'We are thrilled to announce our Q4 roadmap with advanced real-time collaboration features.',
    scope: 'company',
    pinned: true,
    createdBy: admin._id,
    workspaceId: admin.workspaceId,
  });

  console.log('Announcement created:', announcement._id);

  // 2. Dispatch notify()
  const userIds = users.map((u) => u._id);
  const createdNotifs = await notify({
    userIds,
    type: 'announcement',
    title: `📢 Announcement: ${announcement.title}`,
    body: announcement.body.slice(0, 100),
    linkTo: 'announcements',
    refId: announcement._id,
    workspaceId: admin.workspaceId,
  });

  console.log(`Dispatched ${createdNotifs.length} unified Notification records.`);

  // 3. Verify user's unread count
  const testUser = users.find((u) => u.role === 'user') || users[0];
  const unreadCount = await Notification.countDocuments({
    userId: testUser._id,
    isRead: false,
  });
  console.log(`User ${testUser.name} (${testUser.email}) unread notification count: ${unreadCount}`);

  // 4. Mark one notification as read
  const oneNotif = await Notification.findOne({ userId: testUser._id, isRead: false });
  if (oneNotif) {
    oneNotif.isRead = true;
    await oneNotif.save();
    console.log(`Marked notification ${oneNotif._id} as read.`);
  }

  // Clean up test documents
  await Announcement.findByIdAndDelete(announcement._id);
  await Notification.deleteMany({ refId: announcement._id });
  console.log('Cleaned up test records');

  await mongoose.disconnect();
  console.log('Phase 7 workflow test completed successfully!');
}

testPhase7Workflow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
