const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Meeting = require('../../models/Meeting');
const Group = require('../../models/Group');

describe('Integration Test: Meetings & Google Meet Integration Suite', () => {
  let adminUser;
  let standardUser;
  let testGroup;
  let testMeeting;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    testGroup = await Group.findOne({ workspaceId: adminUser.workspaceId, isDeleted: false });

    testMeeting = await Meeting.create({
      title: 'Sprint Demo & Architecture Review',
      description: 'Reviewing Phase 10 test implementation',
      dateTime: new Date(Date.now() + 3600000), // 1 hr in future
      durationMinutes: 45,
      googleMeetLink: 'https://meet.google.com/abc-defg-hij',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      googleEventId: 'mock_event_123',
      createdBy: adminUser._id,
      groupId: testGroup._id,
      attendeeIds: [adminUser._id, standardUser._id],
      status: 'upcoming',
      workspaceId: adminUser.workspaceId,
    });
  });

  afterAll(async () => {
    if (testMeeting?._id) {
      await Meeting.findByIdAndDelete(testMeeting._id);
    }
    await mongoose.disconnect();
  });

  test('Meeting is created with valid Google Meet link and upcoming status', async () => {
    expect(testMeeting.status).toBe('upcoming');
    expect(testMeeting.googleMeetLink).toContain('meet.google.com');
    expect(testMeeting.attendeeIds.length).toBe(2);
  });

  test('Meeting cancellation updates status to cancelled', async () => {
    testMeeting.status = 'cancelled';
    await testMeeting.save();

    const refreshed = await Meeting.findById(testMeeting._id);
    expect(refreshed.status).toBe('cancelled');
  });
});
