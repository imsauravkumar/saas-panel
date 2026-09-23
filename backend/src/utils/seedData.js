const mongoose = require('mongoose');
require('dotenv').config();

const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Announcement = require('../models/Announcement');
const ActivityLog = require('../models/ActivityLog');
const { generateFallbackMeetLink } = require('../services/googleMeetService');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_nexus';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB...');

    // Clear existing collections
    await Workspace.deleteMany({});
    await User.deleteMany({});
    await Group.deleteMany({});
    await Message.deleteMany({});
    await Meeting.deleteMany({});
    await Task.deleteMany({});
    await Announcement.deleteMany({});
    await ActivityLog.deleteMany({});

    console.log('[Seed] Cleared existing data.');

    // 1. Create Workspace
    const workspace = await Workspace.create({
      name: 'Nexus Technologies Inc.',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&crop=faces',
    });

    // 2. Create Admin (Workspace Owner)
    const admin = await User.create({
      firebaseUid: 'admin_alex_morgan_uid',
      name: 'Alex Morgan',
      email: 'admin@nexus.corp',
      password: 'Admin@12345',
      role: 'admin',
      post: 'VP of Engineering / Workspace Admin',
      department: 'Executive Leadership',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
      status: 'active',
      mustResetPassword: false,
      mustChangePassword: false,
      workspaceId: workspace._id,
    });

    workspace.ownerId = admin._id;
    await workspace.save();

    // 3. Create Team Members (Users)
    const sarah = await User.create({
      firebaseUid: 'user_sarah_jenkins_uid',
      name: 'Sarah Jenkins',
      email: 'sarah@nexus.corp',
      password: 'User@12345',
      role: 'user',
      post: 'Senior Frontend Engineer',
      department: 'Engineering',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
      status: 'active',
      mustResetPassword: false,
      mustChangePassword: false,
      createdBy: admin._id,
      workspaceId: workspace._id,
    });

    const david = await User.create({
      firebaseUid: 'user_david_chen_uid',
      name: 'David Chen',
      email: 'david@nexus.corp',
      password: 'User@12345',
      role: 'user',
      post: 'Lead Backend Developer',
      department: 'Engineering',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
      status: 'active',
      mustResetPassword: false,
      mustChangePassword: false,
      createdBy: admin._id,
      workspaceId: workspace._id,
    });

    const elena = await User.create({
      firebaseUid: 'user_elena_rostova_uid',
      name: 'Elena Rostova',
      email: 'elena@nexus.corp',
      password: 'User@12345',
      role: 'user',
      post: 'UI/UX Product Designer',
      department: 'Product & Design',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face',
      status: 'active',
      mustResetPassword: false,
      mustChangePassword: false,
      createdBy: admin._id,
      workspaceId: workspace._id,
    });

    const marcus = await User.create({
      firebaseUid: 'user_marcus_vance_uid',
      name: 'Marcus Vance',
      email: 'marcus@nexus.corp',
      password: 'User@12345',
      role: 'user',
      post: 'Cloud & DevOps Specialist',
      department: 'Infrastructure',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
      status: 'active',
      mustResetPassword: true, // Demo user who has temporary password for forced reset testing
      mustChangePassword: true,
      createdBy: admin._id,
      workspaceId: workspace._id,
    });

    // 4. Create Groups
    const engineeringGroup = await Group.create({
      name: '🚀 Engineering Team',
      description: 'Core backend, frontend, microservices, and sprint syncs.',
      createdBy: admin._id,
      memberIds: [admin._id, sarah._id, david._id, marcus._id],
      chatPermission: 'everyone',
      workspaceId: workspace._id,
    });

    const designGroup = await Group.create({
      name: '🎨 Product & Design',
      description: 'Figma mockups, design tokens, UX research, and design critiques.',
      createdBy: admin._id,
      memberIds: [admin._id, sarah._id, elena._id],
      chatPermission: 'everyone',
      workspaceId: workspace._id,
    });

    const announcementsGroup = await Group.create({
      name: '📢 Official Company Broadcasts',
      description:
        'Executive updates, all-hands announcements, and policy briefings (Admin Only Post).',
      createdBy: admin._id,
      memberIds: [admin._id, sarah._id, david._id, elena._id, marcus._id],
      chatPermission: 'adminOnly',
      workspaceId: workspace._id,
    });

    // Link groups to users
    await User.updateMany(
      { _id: { $in: [admin._id, sarah._id, david._id, marcus._id] } },
      { $addToSet: { groupIds: engineeringGroup._id } }
    );
    await User.updateMany(
      { _id: { $in: [admin._id, sarah._id, elena._id] } },
      { $addToSet: { groupIds: designGroup._id } }
    );
    await User.updateMany(
      { _id: { $in: [admin._id, sarah._id, david._id, elena._id, marcus._id] } },
      { $addToSet: { groupIds: announcementsGroup._id } }
    );

    // 5. Seed Messages in Groups
    await Message.create([
      {
        groupId: engineeringGroup._id,
        senderId: admin._id,
        type: 'text',
        content:
          '👋 Welcome to the new SAAS Nexus engineering channel. Sprint goals are loaded in the Tasks board.',
        workspaceId: workspace._id,
      },
      {
        groupId: engineeringGroup._id,
        senderId: sarah._id,
        type: 'text',
        content:
          'Awesome! I am implementing the responsive theme system and sidebar navigation today.',
        workspaceId: workspace._id,
      },
      {
        groupId: engineeringGroup._id,
        senderId: david._id,
        type: 'text',
        content:
          'Socket.IO event listeners and token middleware endpoints are ready for integration.',
        workspaceId: workspace._id,
      },
      {
        groupId: announcementsGroup._id,
        senderId: admin._id,
        type: 'text',
        content:
          '🚨 Notice: Q3 Townhall is scheduled this Thursday at 3:00 PM EST. Check your calendar tab for Google Meet links.',
        workspaceId: workspace._id,
      },
    ]);

    // 6. Seed Tasks
    const now = new Date();
    await Task.create([
      {
        title: 'Implement Dark & Light SAAS Nexus Theme Tokens',
        description:
          'Ensure all primary indigo (#4F46E5), slate surfaces, and WCAG AA contrast tokens match the spec.',
        assignedTo: [sarah._id, elena._id],
        groupId: designGroup._id,
        priority: 'high',
        status: 'completed',
        deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        workspaceId: workspace._id,
        comments: [
          { user: sarah._id, text: 'Tokens configured in index.css with complete CSS variables.' },
        ],
      },
      {
        title: 'Socket.IO Realtime Gateway & Presence Manager',
        description:
          'Verify server-side chat permissions for adminOnly channels and live broadcast triggers.',
        assignedTo: [david._id],
        groupId: engineeringGroup._id,
        priority: 'urgent',
        status: 'inprogress',
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        workspaceId: workspace._id,
      },
      {
        title: 'CI/CD Pipeline Setup for Vercel and Railway',
        description:
          'Automate build triggers and configure secret environment variables on staging.',
        assignedTo: [marcus._id],
        groupId: engineeringGroup._id,
        priority: 'medium',
        status: 'todo',
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        workspaceId: workspace._id,
      },
      {
        title: 'Figma Design System Component Library Sync',
        description:
          'Export SVG icons, avatar placeholders, and empty state illustrations for SAAS Nexus.',
        assignedTo: [elena._id],
        groupId: designGroup._id,
        priority: 'low',
        status: 'inprogress',
        deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        workspaceId: workspace._id,
      },
    ]);

    // 7. Seed Meetings
    await Meeting.create([
      {
        title: 'Sprint Planning & Tech Sync',
        description: 'Reviewing backlog items, task priorities, and API contracts for Sprint 14.',
        groupId: engineeringGroup._id,
        dateTime: new Date(now.getTime() + 4 * 3600 * 1000),
        durationMinutes: 45,
        googleMeetLink: generateFallbackMeetLink(),
        createdBy: admin._id,
        attendeeIds: [admin._id, sarah._id, david._id, marcus._id],
        status: 'upcoming',
        workspaceId: workspace._id,
      },
      {
        title: 'Design Review & Component Polish',
        description:
          'Interactive walkthrough of group chat UI, modals, and responsive layout test.',
        groupId: designGroup._id,
        dateTime: new Date(now.getTime() + 24 * 3600 * 1000),
        durationMinutes: 30,
        googleMeetLink: generateFallbackMeetLink(),
        createdBy: admin._id,
        attendeeIds: [admin._id, sarah._id, elena._id],
        status: 'upcoming',
        workspaceId: workspace._id,
      },
    ]);

    // 8. Seed Announcements
    await Announcement.create([
      {
        title: '🎉 Welcome to SAAS Nexus Workspace Platform',
        body: 'We are thrilled to launch SAAS Nexus! This platform brings our entire engineering, design, and operations workflows into one unified, real-time hub.',
        target: 'company-wide',
        priority: 'urgent',
        isPinned: true,
        createdBy: admin._id,
        workspaceId: workspace._id,
      },
      {
        title: '🔒 Security Advisory: Password Policy & MFA Updates',
        body: 'All provisioned accounts must update their initial password on first sign in. Multi-Factor authentication can be reviewed under profile settings.',
        target: 'company-wide',
        priority: 'normal',
        isPinned: false,
        createdBy: admin._id,
        workspaceId: workspace._id,
      },
    ]);

    // 9. Seed Activity Logs
    await ActivityLog.create([
      {
        actorId: admin._id,
        action: 'user.create',
        targetType: 'User',
        targetId: sarah._id,
        details:
          'Admin Alex Morgan provisioned user account for Sarah Jenkins (Senior Frontend Engineer)',
        metadata: { post: 'Senior Frontend Engineer', department: 'Engineering' },
        workspaceId: workspace._id,
      },
      {
        actorId: admin._id,
        action: 'user.create',
        targetType: 'User',
        targetId: david._id,
        details:
          'Admin Alex Morgan provisioned user account for David Chen (Lead Backend Developer)',
        metadata: { post: 'Lead Backend Developer', department: 'Engineering' },
        workspaceId: workspace._id,
      },
      {
        actorId: admin._id,
        action: 'user.create',
        targetType: 'User',
        targetId: marcus._id,
        details:
          'Admin Alex Morgan provisioned user account for Marcus Vance (Cloud & DevOps Specialist)',
        metadata: { post: 'Cloud & DevOps Specialist', department: 'Infrastructure' },
        workspaceId: workspace._id,
      },
    ]);

    console.log('✅ [Seed] Database re-seeded for Phase 2 successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Error]:', error);
    process.exit(1);
  }
};

seedDB();
