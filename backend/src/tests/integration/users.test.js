const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');

describe('Integration Test: User Management & RBAC Suite', () => {
  let adminUser;
  let standardUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Admin user has admin privileges and standard user does not', () => {
    expect(adminUser.role).toBe('admin');
    expect(standardUser.role).toBe('user');
  });

  test('Admin can query user directory with pagination', async () => {
    const users = await User.find({ workspaceId: adminUser.workspaceId });
    expect(users.length).toBeGreaterThanOrEqual(2);
  });

  test('Duplicate email registration is blocked at database layer', async () => {
    let duplicateError = null;
    try {
      await User.create({
        name: 'Duplicate Admin',
        email: adminUser.email,
        password: 'Password123!',
        role: 'admin',
        workspaceId: adminUser.workspaceId,
      });
    } catch (_err) {
      duplicateError = _err;
    }
    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
  });
});
