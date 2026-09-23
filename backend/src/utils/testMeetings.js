const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Group = require('../models/Group');
const Meeting = require('../models/Meeting');
const { createEventWithMeet } = require('../services/googleCalendarService');

async function testMeetingWorkflow() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  const group = await Group.findOne({ isDeleted: false });

  if (!admin || !group) {
    console.error('Missing seed data');
    process.exit(1);
  }

  console.log(`Admin found: ${admin.email}, Group found: ${group.name}`);

  // 1. Test Google Meet generation
  const meetData = await createEventWithMeet({
    summary: 'Q4 Product Roadmap Sync',
    description: 'Quarterly review of features and deliverables.',
    start: new Date(Date.now() + 3600 * 1000),
    end: new Date(Date.now() + 3600 * 1000 + 45 * 60 * 1000),
    attendeeEmails: ['admin@nexus.corp', 'sarah@nexus.corp'],
  });

  console.log('Generated Meet Data:', meetData);

  // 2. Create Meeting Document
  const meeting = await Meeting.create({
    title: 'Q4 Product Roadmap Sync',
    description: 'Quarterly review of features and deliverables.',
    groupId: group._id,
    dateTime: new Date(Date.now() + 3600 * 1000),
    durationMinutes: 45,
    googleEventId: meetData.eventId,
    googleMeetLink: meetData.meetLink,
    createdBy: admin._id,
    attendeeIds: group.memberIds,
    status: 'upcoming',
    workspaceId: admin.workspaceId,
  });

  console.log('Meeting created successfully in DB with ID:', meeting._id);

  // 3. Query Meeting with population
  const fetched = await Meeting.findById(meeting._id)
    .populate('groupId', 'name')
    .populate('createdBy', 'name email')
    .populate('attendeeIds', 'name email post');

  console.log(`Verified Fetched Meeting: "${fetched.title}" in #${fetched.groupId.name} with ${fetched.attendeeIds.length} attendees.`);

  await mongoose.disconnect();
  console.log('Test completed successfully');
}

testMeetingWorkflow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
