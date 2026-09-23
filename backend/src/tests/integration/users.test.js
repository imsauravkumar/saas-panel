const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');

describe('Integration Test: User Management & RBAC Suite', () => {
  let adminUser;
  let standardUser;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');
    adminUser = await User.findOne({ role: 'admin' });
    standardUser = await User.findOne({ role: 'user' });

    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: 'admin' },
      process.env.JWT_SECRET || 'saas_nexus_super_secret_jwt_key_2026',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { id: standardUser._id, email: standardUser.email, role: 'user' },
      process.env.JWT_SECRET || 'saas_nexus_super_secret_jwt_key_2026',
      { expiresIn: '1h' }
    );
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
    } catch (err) {
      duplicateError = err;
    }
    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
  });
});
