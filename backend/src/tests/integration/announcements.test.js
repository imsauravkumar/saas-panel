const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Group = require('../../models/Group');
const Announcement = require('../../models/Announcement');

describe('Integration Test: Announcements & Scoping Suite', () => {
  let adminUser;
  let standardUser;
  let testGroup;
  let companyAnnouncement;
  let groupAnnouncement;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    testGroup = await Group.findOne({ workspaceId: adminUser.workspaceId, isDeleted: false });

    companyAnnouncement = await Announcement.create({
      title: 'Company Holiday Notice',
      body: 'Office closed on Friday.',
      scope: 'company',
      pinned: true,
      createdBy: adminUser._id,
      workspaceId: adminUser.workspaceId,
    });

    groupAnnouncement = await Announcement.create({
      title: 'Sprint Kickoff Notice',
      body: 'Channel sprint begins today.',
      scope: 'group',
      groupId: testGroup._id,
      pinned: false,
      createdBy: adminUser._id,
      workspaceId: adminUser.workspaceId,
    });
  });

  afterAll(async () => {
    await Announcement.deleteMany({
      _id: { $in: [companyAnnouncement?._id, groupAnnouncement?._id] },
    });
    await mongoose.disconnect();
  });

  test('Company announcement created with pinned: true', async () => {
    expect(companyAnnouncement.scope).toBe('company');
    expect(companyAnnouncement.pinned).toBe(true);
  });

  test('Group announcement created with valid groupId reference', async () => {
    expect(groupAnnouncement.scope).toBe('group');
    expect(groupAnnouncement.groupId.toString()).toBe(testGroup._id.toString());
  });

  test('Feed query returns company and user member group announcements only', async () => {
    const announcements = await Announcement.find({
      workspaceId: adminUser.workspaceId,
      isDeleted: false,
      $or: [{ scope: 'company' }, { groupId: testGroup._id }],
    }).sort({ pinned: -1, createdAt: -1 });

    expect(announcements.length).toBeGreaterThanOrEqual(2);
    expect(announcements[0].pinned).toBe(true); // Pinned sorts first
  });
});
