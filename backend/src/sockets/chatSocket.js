const jwt = require('jsonwebtoken');
const { admin, getFirebaseApp } = require('../config/firebase');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { canPostInGroup } = require('../utils/canPostInGroup');

// Multi-tenant isolation: workspaceId -> Map<userId, Set<socketId>>
const workspaceOnlineUsers = new Map();
// socketId -> { userId, workspaceId }
const socketMeta = new Map();

// Helper to get online user IDs for a specific workspace
const getWorkspaceOnlineUsers = (workspaceId) => {
  if (!workspaceId || !workspaceOnlineUsers.has(workspaceId)) return [];
  const usersMap = workspaceOnlineUsers.get(workspaceId);
  return Array.from(usersMap.keys());
};

// Helper to broadcast presence updates ONLY to users of that company/workspace
const broadcastWorkspacePresence = (io, workspaceId) => {
  if (!io || !workspaceId) return;
  const onlineUserIds = getWorkspaceOnlineUsers(workspaceId);
  io.to(`workspace:${workspaceId}`).emit('online_users_updated', onlineUserIds);
  io.to(`workspace_${workspaceId}`).emit('online_users_updated', onlineUserIds);
  io.to(`workspace:${workspaceId}`).emit('users:online', onlineUserIds);
  io.to(`workspace_${workspaceId}`).emit('users:online', onlineUserIds);
};

const setupSocket = (io) => {
  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next();
      }

      let user = null;
      const firebaseApp = getFirebaseApp();

      if (firebaseApp) {
        try {
          const decodedFirebase = await admin.auth().verifyIdToken(token);
          user = await User.findOne({
            $or: [
              { firebaseUid: decodedFirebase.uid },
              { email: decodedFirebase.email?.toLowerCase() },
            ],
          });
        } catch (_fbErr) {
          // fallback to JWT
        }
      }

      if (!user) {
        try {
          const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
          user = await User.findById(decodedJwt.id);
        } catch (_jwtErr) {
          // Token invalid
        }
      }

      if (user && user.status !== 'disabled') {
        socket.data.user = user;
        socket.userId = user._id.toString();
        socket.workspaceId = user.workspaceId ? user.workspaceId.toString() : null;
      }

      next();
    } catch (err) {
      console.error('[Socket Auth Middleware Error]:', err.message);
      next();
    }
  });

  io.on('connection', (socket) => {
    // Register user & company presence (Strict multi-tenant isolation)
    socket.on('register_user', async (data) => {
      const userId = typeof data === 'object' ? data?.userId : data;
      if (!userId) return;

      socket.userId = userId.toString();

      if (!socket.data.user || !socket.workspaceId) {
        try {
          const user = await User.findById(userId);
          if (user && user.status !== 'disabled') {
            socket.data.user = user;
            socket.workspaceId = user.workspaceId ? user.workspaceId.toString() : null;
          }
        } catch (e) {
          console.warn('[Register User Lookup Error]:', e.message);
        }
      }

      const workspaceId = socket.workspaceId;
      if (!workspaceId) return;

      // Track socket metadata
      socketMeta.set(socket.id, { userId: socket.userId, workspaceId });

      // Add to company/workspace online presence map
      if (!workspaceOnlineUsers.has(workspaceId)) {
        workspaceOnlineUsers.set(workspaceId, new Map());
      }
      const companyUsers = workspaceOnlineUsers.get(workspaceId);
      if (!companyUsers.has(socket.userId)) {
        companyUsers.set(socket.userId, new Set());
      }
      companyUsers.get(socket.userId).add(socket.id);

      // Join isolated company and per-user rooms
      socket.join(`workspace:${workspaceId}`);
      socket.join(`workspace_${workspaceId}`);
      socket.join(`user:${socket.userId}`);
      socket.join(`user_${socket.userId}`);

      // Send current company online list to registering socket
      socket.emit('online_users_updated', getWorkspaceOnlineUsers(workspaceId));
      socket.emit('users:online', getWorkspaceOnlineUsers(workspaceId));

      // Broadcast company online status update ONLY to teammates in the same company
      broadcastWorkspacePresence(io, workspaceId);
    });

    // Client requests current online list for their workspace
    socket.on('get_online_users', () => {
      const workspaceId = socket.workspaceId;
      if (workspaceId) {
        socket.emit('online_users_updated', getWorkspaceOnlineUsers(workspaceId));
        socket.emit('users:online', getWorkspaceOnlineUsers(workspaceId));
      }
    });

    // Group Room Join: 'group:join' and 'join_group'
    const handleJoinGroup = async (groupId) => {
      if (!groupId) return;
      const room1 = `group:${groupId}`;
      const room2 = `group_${groupId}`;
      socket.join(room1);
      socket.join(room2);
    };

    socket.on('group:join', ({ groupId }) => handleJoinGroup(groupId));
    socket.on('join_group', (groupId) => handleJoinGroup(groupId));

    // Group Room Leave: 'group:leave' and 'leave_group'
    const handleLeaveGroup = (groupId) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
      socket.leave(`group_${groupId}`);
    };

    socket.on('group:leave', ({ groupId }) => handleLeaveGroup(groupId));
    socket.on('leave_group', (groupId) => handleLeaveGroup(groupId));

    // Socket Rate Limiting State
    const messageTimestamps = [];

    // Live Message Send via Socket: 'message:send'
    socket.on('message:send', async (payload, ack) => {
      try {
        const now = Date.now();
        while (messageTimestamps.length > 0 && messageTimestamps[0] <= now - 10000) {
          messageTimestamps.shift();
        }

        if (messageTimestamps.length >= 25) {
          if (typeof ack === 'function') {
            ack({ error: 'Rate limit exceeded: Please slow down message sending.' });
          }
          socket.emit('error', {
            message: 'Too many messages sent too quickly. Please wait a moment.',
          });
          return;
        }
        messageTimestamps.push(now);

        const {
          conversationType = 'group',
          groupId,
          recipientId,
          type = 'text',
          content = '',
          fileUrl = '',
          fileName = '',
          fileSize = 0,
          fileMimeType = '',
          duration = 0,
          replyTo = null,
        } = payload;

        const user =
          socket.data.user || (socket.userId ? await User.findById(socket.userId) : null);

        if (!user) {
          if (typeof ack === 'function') ack({ error: 'Unauthorized: User not authenticated' });
          return;
        }

        if (user.status === 'disabled') {
          if (typeof ack === 'function') ack({ error: 'Account disabled' });
          socket.disconnect(true);
          return;
        }

        let group = null;
        let recipient = null;

        if (conversationType === 'group') {
          group = await Group.findOne({
            _id: groupId,
            workspaceId: user.workspaceId,
            isDeleted: false,
          });
          if (!group) {
            if (typeof ack === 'function') ack({ error: 'Group channel not found or deleted' });
            return;
          }

          const isMember = group.memberIds.some((m) => m.toString() === user._id.toString());
          if (user.role !== 'admin' && !isMember) {
            if (typeof ack === 'function') ack({ error: 'You are not a member of this channel' });
            return;
          }

          if (!canPostInGroup(user, group)) {
            if (typeof ack === 'function')
              ack({ error: 'This channel is restricted to Administrator announcements only.' });
            socket.emit('error', {
              message: 'Only Administrators are authorized to post in this channel.',
            });
            return;
          }
        } else {
          recipient = await User.findOne({
            _id: recipientId,
            workspaceId: user.workspaceId,
            status: { $ne: 'disabled' },
          });
          if (!recipient) {
            if (typeof ack === 'function') ack({ error: 'Recipient user not found' });
            return;
          }
        }

        if (type === 'text' && !content?.trim() && !fileUrl) {
          if (typeof ack === 'function') ack({ error: 'Message content cannot be empty' });
          return;
        }

        if (content && content.length > 5000) {
          if (typeof ack === 'function')
            ack({ error: 'Message length exceeds maximum limit of 5000 characters' });
          return;
        }

        // Create Message
        const message = await Message.create({
          conversationType,
          groupId: group ? group._id : null,
          recipientId: recipient ? recipient._id : null,
          senderId: user._id,
          type,
          content: content.trim(),
          fileUrl,
          fileName,
          fileSize,
          fileMimeType,
          duration,
          replyTo: replyTo || null,
          workspaceId: user.workspaceId,
          deliveredTo: [user._id],
          readBy: [user._id],
        });

        const populated = await Message.findById(message._id)
          .populate('senderId', 'name email avatar role post department')
          .populate('recipientId', 'name email avatar role post department')
          .populate({
            path: 'replyTo',
            select: 'content type fileName fileUrl senderId isDeletedForEveryone',
            populate: { path: 'senderId', select: 'name avatar' },
          })
          .populate('reactions.user', 'name avatar');

        // Calculate last message preview
        let preview = '';
        if (type === 'photo') preview = '📷 Photo';
        else if (type === 'video') preview = '🎥 Video';
        else if (type === 'audio') preview = '🎤 Voice note';
        else if (type === 'document') preview = `📄 ${fileName || 'Document'}`;
        else
          preview =
            content.trim().length > 45 ? `${content.trim().slice(0, 45)}...` : content.trim();

        const responseData = {
          ...populated.toObject(),
          tempId: payload.tempId,
        };

        if (conversationType === 'group') {
          await Group.findByIdAndUpdate(groupId, {
            lastMessageAt: new Date(),
            lastMessagePreview: preview,
          });

          io.to(`group:${groupId}`).emit('message:new', responseData);
          io.to(`group_${groupId}`).emit('new_message', responseData);
          io.to(`workspace:${user.workspaceId}`).emit('group:updated', {
            groupId,
            lastMessageAt: new Date(),
            lastMessagePreview: preview,
          });
          io.to(`workspace_${user.workspaceId}`).emit('group:updated', {
            groupId,
            lastMessageAt: new Date(),
            lastMessagePreview: preview,
          });
        } else {
          // Direct message emission to recipient and sender
          io.to(`user:${recipient._id}`).emit('message:new', responseData);
          if (recipient._id.toString() !== user._id.toString()) {
            io.to(`user:${user._id}`).emit('message:new', responseData);
          }
          io.to(`user:${recipient._id}`).emit('direct:conversationUpdated', {
            partnerId: user._id,
            lastMessage: responseData,
          });
          io.to(`user:${user._id}`).emit('direct:conversationUpdated', {
            partnerId: recipient._id,
            lastMessage: responseData,
          });
        }

        if (typeof ack === 'function') {
          ack({ success: true, message: responseData });
        }
      } catch (error) {
        console.error('[Socket message:send Error]:', error);
        if (typeof ack === 'function') ack({ error: error.message || 'Failed to send message' });
      }
    });

    // Typing Indicators (Group & Direct)
    socket.on('typing:start', ({ conversationType = 'group', groupId, recipientId }) => {
      const user = socket.data.user;
      const userName = user ? user.name : 'Teammate';
      const userId = user ? user._id.toString() : socket.userId;

      if (conversationType === 'direct' && recipientId) {
        socket.to(`user:${recipientId}`).emit('direct:typing:update', {
          senderId: userId,
          userName,
          isTyping: true,
        });
      } else if (groupId) {
        socket
          .to(`group:${groupId}`)
          .emit('typing:update', { groupId, userId, userName, isTyping: true });
        socket
          .to(`group_${groupId}`)
          .emit('user_typing', { groupId, userId, userName, isTyping: true });
      }
    });

    socket.on('typing:stop', ({ conversationType = 'group', groupId, recipientId }) => {
      const userId = socket.data.user ? socket.data.user._id.toString() : socket.userId;

      if (conversationType === 'direct' && recipientId) {
        socket.to(`user:${recipientId}`).emit('direct:typing:update', {
          senderId: userId,
          isTyping: false,
        });
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:update', { groupId, userId, isTyping: false });
        socket.to(`group_${groupId}`).emit('user_typing', { groupId, userId, isTyping: false });
      }
    });

    // Real-time Reaction Handler
    socket.on('message:react', async ({ messageId, emoji }, ack) => {
      try {
        const user =
          socket.data.user || (socket.userId ? await User.findById(socket.userId) : null);
        if (!user) return;

        const message = await Message.findOne({ _id: messageId, workspaceId: user.workspaceId });
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === user._id.toString() && r.emoji === emoji
        );

        if (existingIndex > -1) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions.push({ user: user._id, emoji, createdAt: new Date() });
        }
        await message.save();

        const populated = await Message.findById(message._id).populate(
          'reactions.user',
          'name avatar'
        );

        if (message.conversationType === 'group') {
          io.to(`group:${message.groupId}`).emit('message:reactionUpdated', {
            messageId: message._id,
            reactions: populated.reactions,
          });
        } else {
          io.to(`user:${message.senderId}`).emit('message:reactionUpdated', {
            messageId: message._id,
            reactions: populated.reactions,
          });
          io.to(`user:${message.recipientId}`).emit('message:reactionUpdated', {
            messageId: message._id,
            reactions: populated.reactions,
          });
        }

        if (typeof ack === 'function') ack({ success: true, reactions: populated.reactions });
      } catch (err) {
        console.error('[Socket Reaction Error]:', err);
      }
    });

    // Real-time Read Receipt Handler
    socket.on('message:read', async ({ conversationType = 'group', targetId }) => {
      try {
        const userId = socket.userId;
        if (!userId || !targetId) return;

        let filter = { workspaceId: socket.workspaceId, readBy: { $ne: userId } };
        if (conversationType === 'group') {
          filter.groupId = targetId;
        } else {
          filter.conversationType = 'direct';
          filter.senderId = targetId;
          filter.recipientId = userId;
        }

        await Message.updateMany(filter, {
          $addToSet: { readBy: userId, deliveredTo: userId },
        });

        if (conversationType === 'direct') {
          io.to(`user:${targetId}`).emit('message:readReceipt', {
            readerId: userId,
            conversationType: 'direct',
            targetId: userId,
          });
        }
      } catch (e) {
        console.error('[Socket Read Receipt Error]:', e);
      }
    });

    // Disconnect handler with strict company workspace cleanup & lastSeenAt update
    socket.on('disconnect', async () => {
      const meta = socketMeta.get(socket.id);
      socketMeta.delete(socket.id);

      const userId = meta ? meta.userId : socket.userId;
      const workspaceId = meta ? meta.workspaceId : socket.workspaceId;

      if (workspaceId && userId && workspaceOnlineUsers.has(workspaceId)) {
        const companyUsers = workspaceOnlineUsers.get(workspaceId);
        if (companyUsers.has(userId)) {
          const userSockets = companyUsers.get(userId);
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            companyUsers.delete(userId);
            // Update lastSeenAt in DB
            try {
              await User.findByIdAndUpdate(userId, { lastSeenAt: new Date() });
            } catch (_err) {}
          }
        }
        if (companyUsers.size === 0) {
          workspaceOnlineUsers.delete(workspaceId);
        }

        broadcastWorkspacePresence(io, workspaceId);
      }
    });
  });
};

module.exports = {
  setupSocket,
  getWorkspaceOnlineUsers,
};
