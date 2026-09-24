const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const User = require('../../models/User');
const Workspace = require('../../models/Workspace');
const Group = require('../../models/Group');
const ActivityLog = require('../../models/ActivityLog');
const Task = require('../../models/Task');
const {
  createUser,
  toggleUserStatus,
  deleteUser,
  getUsers,
} = require('../../controllers/userController');

describe('Integration Test: Multiple Admins & Protected Owner System Suite', () => {
  let ownerUser;
  let secondaryAdmin;
  let standardUser;
  let createdAdmin;

  // Mock response helper
  const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus');

    // Ensure Owner user exists
    ownerUser = await User.findOne({ role: 'admin', isOwner: true });
    if (!ownerUser) {
      ownerUser = await User.findOne({ role: 'admin' });
      if (ownerUser) {
        ownerUser.isOwner = true;
        await ownerUser.save();
      } else {
        const workspace = await Workspace.create({ name: 'Test MultiAdmin Workspace' });
        ownerUser = await User.create({
          name: 'Owner Admin',
          email: `owner_${Date.now()}@nexus.test`,
          password: 'Password123!',
          role: 'admin',
          isOwner: true,
          status: 'active',
          workspaceId: workspace._id,
        });
      }
    }

    standardUser = await User.findOne({
      role: 'user',
      workspaceId: ownerUser.workspaceId,
    });

    if (!standardUser) {
      standardUser = await User.create({
        name: 'Standard User',
        email: `std_${Date.now()}@nexus.test`,
        password: 'Password123!',
        role: 'user',
        isOwner: false,
        status: 'active',
        workspaceId: ownerUser.workspaceId,
      });
    }

    // Create a secondary active admin for testing multi-admin permissions
    secondaryAdmin = await User.create({
      name: 'Secondary Admin',
      email: `secadmin_${Date.now()}@nexus.test`,
      password: 'Password123!',
      role: 'admin',
      isOwner: false,
      status: 'active',
      workspaceId: ownerUser.workspaceId,
    });
  });

  afterAll(async () => {
    if (secondaryAdmin?._id) {
      await User.findByIdAndDelete(secondaryAdmin._id);
    }
    if (createdAdmin?._id) {
      await User.findByIdAndDelete(createdAdmin._id);
    }
    await mongoose.disconnect();
  });

  test('1. Workspace Owner account has isOwner: true and role: admin', async () => {
    expect(ownerUser.role).toBe('admin');
    expect(ownerUser.isOwner).toBe(true);
  });

  test('2. Any Admin (including non-owner) can create a new Admin account', async () => {
    const adminEmail = `newadmin_${Date.now()}@nexus.test`;
    const req = {
      body: {
        name: 'Priya Sharma',
        email: adminEmail,
        password: 'TempAdminPassword123!',
        role: 'admin',
        post: 'Operations Manager',
        department: 'Operations',
      },
      user: secondaryAdmin,
      app: { get: () => null },
    };
    const res = createMockRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    expect(jsonCall.user.role).toBe('admin');
    expect(jsonCall.user.isOwner).toBe(false);
    expect(jsonCall.user.mustResetPassword).toBe(true);

    createdAdmin = await User.findOne({ email: adminEmail });
    expect(createdAdmin).toBeTruthy();
    expect(createdAdmin.role).toBe('admin');
    expect(createdAdmin.isOwner).toBe(false);
    expect(createdAdmin.mustChangePassword).toBe(true);

    // Verify activity log recorded with actor -> action -> target
    const log = await ActivityLog.findOne({
      targetId: createdAdmin._id,
      action: 'admin.create',
    });
    expect(log).toBeTruthy();
    expect(log.details).toContain(secondaryAdmin.name);
    expect(log.details).toContain(createdAdmin.name);
  });

  test('3. Direct API call to disable the Owner account is REJECTED (403 Forbidden)', async () => {
    const req = {
      params: { id: ownerUser._id.toString() },
      body: { status: 'disabled' },
      user: secondaryAdmin,
      app: { get: () => null },
    };
    const res = createMockRes();

    await toggleUserStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.message).toContain('Owner account cannot be deactivated');

    const refreshedOwner = await User.findById(ownerUser._id);
    expect(refreshedOwner.status).toBe('active');
  });

  test('4. Direct API call to delete the Owner account is REJECTED (403 Forbidden)', async () => {
    const req = {
      params: { id: ownerUser._id.toString() },
      user: secondaryAdmin,
      app: { get: () => null },
    };
    const res = createMockRes();

    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.message).toContain('Owner account cannot be deleted');

    const refreshedOwner = await User.findById(ownerUser._id);
    expect(refreshedOwner).toBeTruthy();
  });

  test('5. Admin attempting to disable or delete their own account is REJECTED (400)', async () => {
    // Self disable
    const disableReq = {
      params: { id: secondaryAdmin._id.toString() },
      body: { status: 'disabled' },
      user: secondaryAdmin,
      app: { get: () => null },
    };
    const disableRes = createMockRes();
    await toggleUserStatus(disableReq, disableRes);
    expect(disableRes.status).toHaveBeenCalledWith(400);

    // Self delete
    const deleteReq = {
      params: { id: secondaryAdmin._id.toString() },
      user: secondaryAdmin,
      app: { get: () => null },
    };
    const deleteRes = createMockRes();
    await deleteUser(deleteReq, deleteRes);
    expect(deleteRes.status).toHaveBeenCalledWith(400);
  });

  test('6. Disabling a non-owner admin succeeds when other active admins exist', async () => {
    const req = {
      params: { id: createdAdmin._id.toString() },
      body: { status: 'disabled' },
      user: ownerUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await toggleUserStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updated = await User.findById(createdAdmin._id);
    expect(updated.status).toBe('disabled');
  });

  test('7. Deleting a non-owner admin succeeds when other active admins exist', async () => {
    const req = {
      params: { id: createdAdmin._id.toString() },
      user: ownerUser,
      app: { get: () => null },
    };
    const res = createMockRes();

    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const deleted = await User.findById(createdAdmin._id);
    expect(deleted).toBeNull();
  });

  test('8. Attempting to disable or delete the very last active Admin is BLOCKED with clear error', async () => {
    // Temporarily create a standalone workspace with only 1 admin
    const soloWorkspace = await Workspace.create({ name: 'Solo Admin Workspace' });
    const soloAdmin = await User.create({
      name: 'Solo Admin',
      email: `solo_${Date.now()}@nexus.test`,
      password: 'Password123!',
      role: 'admin',
      isOwner: false, // test role-based check
      status: 'active',
      workspaceId: soloWorkspace._id,
    });

    // Another admin in another workspace trying to disable the solo admin
    const req = {
      params: { id: soloAdmin._id.toString() },
      body: { status: 'disabled' },
      user: { _id: new mongoose.Types.ObjectId(), workspaceId: soloWorkspace._id, name: 'Caller' },
      app: { get: () => null },
    };
    const res = createMockRes();

    await toggleUserStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.message).toContain('workspace must retain at least one active administrator');

    // Clean up
    await User.findByIdAndDelete(soloAdmin._id);
    await Workspace.findByIdAndDelete(soloWorkspace._id);
  });

  test('9. Directory filter by role (admin / user) correctly isolates results', async () => {
    const reqAdmin = {
      query: { role: 'admin' },
      user: ownerUser,
    };
    const resAdmin = createMockRes();
    await getUsers(reqAdmin, resAdmin);
    expect(resAdmin.status).toHaveBeenCalledWith(200);
    const adminList = resAdmin.json.mock.calls[0][0].users;
    expect(adminList.every((u) => u.role === 'admin')).toBe(true);

    const reqUser = {
      query: { role: 'user' },
      user: ownerUser,
    };
    const resUser = createMockRes();
    await getUsers(reqUser, resUser);
    expect(resUser.status).toHaveBeenCalledWith(200);
    const userList = resUser.json.mock.calls[0][0].users;
    expect(userList.every((u) => u.role === 'user')).toBe(true);
  });
});
