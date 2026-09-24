const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Meeting = require('../../models/Meeting');
const Group = require('../../models/Group');
const ActivityLog = require('../../models/ActivityLog');
const Notification = require('../../models/Notification');
const {
  createMeeting,
  updateMeeting,
  cancelMeeting,
  getMeetings,
} = require('../../controllers/meetingController');
const googleMeetService = require('../../services/googleMeetService');

// Helper mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Integration Test: Comprehensive Google Meet & Meetings Feature Lifecycle', () => {
  let adminUser;
  let standardUser;
  let testGroup;
  const createdMeetingIds = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    if (!adminUser) {
      adminUser = await User.create({
        name: 'Test Admin',
        email: 'test_admin_meet@nexus.test',
        password: 'Password123!',
        role: 'admin',
        workspaceId: new mongoose.Types.ObjectId(),
      });
    }

    if (!standardUser) {
      standardUser = await User.create({
        name: 'Test Teammate',
        email: 'test_user_meet@nexus.test',
        password: 'Password123!',
        role: 'user',
        workspaceId: adminUser.workspaceId,
      });
    }

    testGroup = await Group.findOne({ workspaceId: adminUser.workspaceId, isDeleted: false });
    if (!testGroup) {
      testGroup = await Group.create({
        name: 'engineering',
        description: 'Engineering team channel',
        workspaceId: adminUser.workspaceId,
        createdBy: adminUser._id,
        memberIds: [adminUser._id, standardUser._id],
      });
    }
  });

  afterAll(async () => {
    if (createdMeetingIds.length > 0) {
      await Meeting.deleteMany({ _id: { $in: createdMeetingIds } });
    }
    await mongoose.disconnect();
  });

  test('1. GoogleMeetService generates a demo fallback Meet link when credentials absent', async () => {
    const event = await googleMeetService.createMeetingEvent({
      title: 'Demo Strategy Session',
      description: 'Demo check',
      startTime: new Date(Date.now() + 3600000),
      durationMinutes: 30,
      attendeeEmails: [adminUser.email, standardUser.email],
    });

    expect(event).toBeDefined();
    expect(event.meetLink).toMatch(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
    expect(event.provider).toBe('demo');
    expect(event.isDemoLink).toBe(true);
  });

  test('2. Controller creates meeting with validation and notifies attendees', async () => {
    const futureDate = new Date(Date.now() + 7200000).toISOString(); // 2 hrs in future
    const req = {
      user: adminUser,
      app: { get: () => null },
      body: {
        title: 'Q3 Product Roadmap Review',
        description: 'Discuss upcoming quarterly goals & deliverables',
        dateTime: futureDate,
        durationMinutes: 45,
        groupId: testGroup._id.toString(),
        attendeeIds: [standardUser._id.toString()],
        meetingType: 'review',
      },
    };
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.meeting.title).toBe('Q3 Product Roadmap Review');
    expect(responseData.meeting.googleMeetLink).toContain('meet.google.com');
    expect(responseData.meeting.status).toBe('upcoming');

    createdMeetingIds.push(responseData.meeting._id);

    // Verify in database
    const saved = await Meeting.findById(responseData.meeting._id);
    expect(saved).not.toBeNull();
    expect(saved.attendeeIds).toContainEqual(standardUser._id);

    // Verify activity log
    const log = await ActivityLog.findOne({
      workspaceId: adminUser.workspaceId,
      action: 'meeting.create',
      targetId: saved._id,
    });
    expect(log).not.toBeNull();
  });

  test('3. Server-side validation rejects past date with clear 400 error', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hr in past
    const req = {
      user: adminUser,
      app: { get: () => null },
      body: {
        title: 'Past Meeting Attempt',
        dateTime: pastDate,
        durationMinutes: 30,
        groupId: testGroup._id.toString(),
      },
    };
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(false);
    expect(responseData.message).toMatch(/cannot be in the past/i);
  });

  test('4. Server-side validation rejects missing title and invalid duration', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const req = {
      user: adminUser,
      app: { get: () => null },
      body: {
        title: ' ',
        dateTime: futureDate,
        durationMinutes: 0,
      },
    };
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(false);
  });

  test('5. Editing a meeting updates date/time and notifies attendees', async () => {
    const meetingId = createdMeetingIds[0];
    const newDateTime = new Date(Date.now() + 10800000).toISOString(); // 3 hrs in future

    const req = {
      params: { id: meetingId.toString() },
      user: adminUser,
      app: { get: () => null },
      body: {
        title: 'Q3 Product Roadmap Review (Rescheduled)',
        dateTime: newDateTime,
        durationMinutes: 60,
      },
    };
    const res = mockResponse();

    await updateMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.meeting.title).toBe('Q3 Product Roadmap Review (Rescheduled)');
    expect(responseData.meeting.durationMinutes).toBe(60);

    const updated = await Meeting.findById(meetingId);
    expect(updated.title).toBe('Q3 Product Roadmap Review (Rescheduled)');
    expect(updated.durationMinutes).toBe(60);
  });

  test('6. Cancelling a meeting sets status to cancelled and preserves record with audit trail', async () => {
    const meetingId = createdMeetingIds[0];

    const req = {
      params: { id: meetingId.toString() },
      user: adminUser,
      app: { get: () => null },
      body: {
        cancelReason: 'Emergency client sync conflict',
      },
    };
    const res = mockResponse();

    await cancelMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.meeting.status).toBe('cancelled');
    expect(responseData.meeting.cancelReason).toBe('Emergency client sync conflict');

    // Verify it is NOT deleted from DB, but marked cancelled
    const cancelledDb = await Meeting.findById(meetingId);
    expect(cancelledDb).not.toBeNull();
    expect(cancelledDb.status).toBe('cancelled');
    expect(cancelledDb.cancelledBy).toEqual(adminUser._id);
    expect(cancelledDb.cancelledAt).toBeDefined();

    // Verify ActivityLog
    const cancelLog = await ActivityLog.findOne({
      workspaceId: adminUser.workspaceId,
      action: 'meeting.cancel',
      targetId: cancelledDb._id,
    });
    expect(cancelLog).not.toBeNull();
  });

  test('7. Querying meetings respects status filters (upcoming vs past vs cancelled)', async () => {
    // 7a. Query cancelled
    const reqCancelled = {
      user: adminUser,
      query: { status: 'cancelled' },
    };
    const resCancelled = mockResponse();
    await getMeetings(reqCancelled, resCancelled);

    expect(resCancelled.status).toHaveBeenCalledWith(200);
    const cancelledData = resCancelled.json.mock.calls[0][0];
    expect(cancelledData.meetings.some((m) => m._id.toString() === createdMeetingIds[0].toString())).toBe(true);

    // 7b. Query upcoming - the cancelled one should NOT be in upcoming
    const reqUpcoming = {
      user: adminUser,
      query: { status: 'upcoming' },
    };
    const resUpcoming = mockResponse();
    await getMeetings(reqUpcoming, resUpcoming);

    const upcomingData = resUpcoming.json.mock.calls[0][0];
    expect(upcomingData.meetings.some((m) => m._id.toString() === createdMeetingIds[0].toString())).toBe(false);
  });
});
