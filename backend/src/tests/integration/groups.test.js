const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Group = require('../../models/Group');

describe('Integration Test: Groups & Permissions Suite', () => {
  let adminUser;
  let standardUser;
  let testGroup;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    testGroup = await Group.create({
      name: 'QA Test Channel',
      description: 'Automated integration testing group',
      createdBy: adminUser._id,
      memberIds: [adminUser._id, standardUser._id],
      chatPermission: 'everyone',
      workspaceId: adminUser.workspaceId,
    });
  });

  afterAll(async () => {
    if (testGroup?._id) {
      await Group.findByIdAndDelete(testGroup._id);
    }
    await mongoose.disconnect();
  });

  test('Group is created with bidirectional membership', async () => {
    expect(testGroup.memberIds.length).toBe(2);
    expect(testGroup.memberIds.some((id) => id.toString() === standardUser._id.toString())).toBe(true);
  });

  test('Group chat permission can be toggled to adminOnly', async () => {
    testGroup.chatPermission = 'adminOnly';
    await testGroup.save();

    const updated = await Group.findById(testGroup._id);
    expect(updated.chatPermission).toBe('adminOnly');
  });

  test('Member removal pulls memberId from group', async () => {
    await Group.findByIdAndUpdate(testGroup._id, {
      $pull: { memberIds: standardUser._id },
    });

    const refreshed = await Group.findById(testGroup._id);
    expect(refreshed.memberIds.some((id) => id.toString() === standardUser._id.toString())).toBe(false);
  });
});
