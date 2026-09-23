const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const { canPostInGroup } = require('../utils/canPostInGroup');

/**
 * 1. Paginated Group Messages
 * GET /api/messages/group/:groupId
 */
const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.params.id;
    const rawLimit = parseInt(req.query.limit) || 40;
    const limit = Math.min(rawLimit, 100); // Cap at 100 to prevent large DB dumps
    const before = req.query.before;

    const group = await Group.findOne({
      _id: groupId,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group channel not found' });
    }

    // Verify membership or admin
    const isMember = group.memberIds.some((id) => id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied: You are not a member of this channel.' });
    }

    const query = {
      groupId,
      workspaceId: req.user.workspaceId,
      deletedFor: { $ne: req.user._id },
    };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email avatar role post department')
      .populate({
        path: 'replyTo',
        select: 'content type fileName fileUrl senderId isDeletedForEveryone',
        populate: { path: 'senderId', select: 'name avatar' },
      })
      .populate('reactions.user', 'name avatar')
      .populate('pinnedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Auto mark as read
    await Message.updateMany(
      { groupId, workspaceId: req.user.workspaceId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id, deliveredTo: req.user._id } }
    );

    const hasMore = messages.length === limit;
    const userCanChat = canPostInGroup(req.user, group);

    // Get pinned messages for quick banner
    const pinnedMessages = await Message.find({
      groupId,
      isPinned: true,
      deletedFor: { $ne: req.user._id },
    })
      .populate('senderId', 'name avatar')
      .sort({ pinnedAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      hasMore,
      chatPermission: group.chatPermission,
      canChat: userCanChat,
      pinnedMessages,
    });
  } catch (_error) {
    console.error('[Get Group Messages Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * 2. Paginated Direct 1-on-1 Messages
 * GET /api/messages/direct/:recipientId
 */
const getDirectMessages = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const rawLimit = parseInt(req.query.limit) || 40;
    const limit = Math.min(rawLimit, 100); // Cap at 100 to prevent large DB dumps
    const before = req.query.before;

    const recipient = await User.findOne({
      _id: recipientId,
      workspaceId: req.user.workspaceId,
      status: { $ne: 'disabled' },
    }).select('name email avatar post department role lastSeenAt status');

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Teammate not found or inactive' });
    }

    const isSelf = recipientId.toString() === req.user._id.toString();

    const query = {
      workspaceId: req.user.workspaceId,
      conversationType: 'direct',
      deletedFor: { $ne: req.user._id },
      ...(isSelf
        ? { senderId: req.user._id, recipientId: req.user._id }
        : {
            $or: [
              { senderId: req.user._id, recipientId },
              { senderId: recipientId, recipientId: req.user._id },
            ],
          }),
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email avatar role post department')
      .populate('recipientId', 'name email avatar role post department')
      .populate({
        path: 'replyTo',
        select: 'content type fileName fileUrl senderId isDeletedForEveryone',
        populate: { path: 'senderId', select: 'name avatar' },
      })
      .populate('reactions.user', 'name avatar')
      .populate('pinnedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Auto mark received direct messages as read
    if (!isSelf) {
      await Message.updateMany(
        {
          workspaceId: req.user.workspaceId,
          conversationType: 'direct',
          senderId: recipientId,
          recipientId: req.user._id,
          readBy: { $ne: req.user._id },
        },
        { $addToSet: { readBy: req.user._id, deliveredTo: req.user._id } }
      );

      // Emit read receipt back to recipient
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${recipientId}`).emit('message:readReceipt', {
          readerId: req.user._id,
          conversationType: 'direct',
          targetId: req.user._id,
        });
      }
    }

    const hasMore = messages.length === limit;

    const pinnedMessages = await Message.find({
      workspaceId: req.user.workspaceId,
      conversationType: 'direct',
      isPinned: true,
      deletedFor: { $ne: req.user._id },
      ...(isSelf
        ? { senderId: req.user._id, recipientId: req.user._id }
        : {
            $or: [
              { senderId: req.user._id, recipientId },
              { senderId: recipientId, recipientId: req.user._id },
            ],
          }),
    })
      .populate('senderId', 'name avatar')
      .sort({ pinnedAt: -1 })
      .limit(5);

    const recipientObj = {
      _id: recipient._id,
      name: isSelf ? `${recipient.name} (You)` : recipient.name,
      email: recipient.email,
      avatar: recipient.avatar,
      post: isSelf ? 'Message yourself' : recipient.post,
      department: recipient.department,
      role: recipient.role,
      lastSeenAt: recipient.lastSeenAt,
      status: recipient.status,
      isSelf,
    };

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      hasMore,
      recipient: recipientObj,
      pinnedMessages,
    });
  } catch (_error) {
    console.error('[Get Direct Messages Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch direct messages' });
  }
};

/**
 * 3. List of Active Direct Conversations
 * GET /api/messages/direct-conversations
 */
const getDirectConversations = async (req, res) => {
  try {
    // 1. Fetch "Message yourself" conversation
    const selfLastMsg = await Message.findOne({
      workspaceId: req.user.workspaceId,
      conversationType: 'direct',
      senderId: req.user._id,
      recipientId: req.user._id,
      deletedFor: { $ne: req.user._id },
    }).sort({ createdAt: -1 });

    const selfConversation = {
      teammate: {
        _id: req.user._id,
        name: `${req.user.name} (You)`,
        email: req.user.email,
        avatar: req.user.avatar,
        post: 'Message yourself',
        department: req.user.department,
        role: req.user.role,
        isSelf: true,
      },
      lastMessage: selfLastMsg
        ? {
            _id: selfLastMsg._id,
            content: selfLastMsg.content,
            type: selfLastMsg.type,
            createdAt: selfLastMsg.createdAt,
            senderId: selfLastMsg.senderId,
            isDeletedForEveryone: selfLastMsg.isDeletedForEveryone,
          }
        : null,
      unreadCount: 0,
      isSelf: true,
    };

    // 2. Fetch all other workspace teammates
    const allTeammates = await User.find({
      workspaceId: req.user.workspaceId,
      _id: { $ne: req.user._id },
      status: { $ne: 'disabled' },
    }).select('name email avatar post department role lastSeenAt status');

    // Aggregate last messages per conversation partner
    const otherConversations = await Promise.all(
      allTeammates.map(async (teammate) => {
        const lastMsg = await Message.findOne({
          workspaceId: req.user.workspaceId,
          conversationType: 'direct',
          deletedFor: { $ne: req.user._id },
          $or: [
            { senderId: req.user._id, recipientId: teammate._id },
            { senderId: teammate._id, recipientId: req.user._id },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          workspaceId: req.user.workspaceId,
          conversationType: 'direct',
          senderId: teammate._id,
          recipientId: req.user._id,
          readBy: { $ne: req.user._id },
        });

        return {
          teammate,
          lastMessage: lastMsg
            ? {
                _id: lastMsg._id,
                content: lastMsg.content,
                type: lastMsg.type,
                createdAt: lastMsg.createdAt,
                senderId: lastMsg.senderId,
                isDeletedForEveryone: lastMsg.isDeletedForEveryone,
              }
            : null,
          unreadCount,
          isSelf: false,
        };
      })
    );

    // Sort teammates by recent activity first, then by name
    otherConversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return a.teammate.name.localeCompare(b.teammate.name);
    });

    // "Message yourself" is pinned at the top like WhatsApp
    const conversations = [selfConversation, ...otherConversations];

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (_error) {
    console.error('[Get Direct Conversations Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * 4. Send Message (Group Channel or 1-on-1 Direct)
 * POST /api/messages/send
 */
const sendMessage = async (req, res) => {
  try {
    const {
      conversationType = 'group',
      groupId,
      recipientId,
      content = '',
      type = 'text',
      fileUrl = '',
      fileName = '',
      fileSize = 0,
      fileMimeType = '',
      duration = 0,
      replyTo = null,
    } = req.body;

    if (!content.trim() && !fileUrl) {
      return res
        .status(400)
        .json({ success: false, message: 'Message content or attachment is required.' });
    }

    let targetGroup = null;
    let targetRecipient = null;

    if (conversationType === 'group') {
      const gId = groupId || req.params.groupId || req.params.id;
      if (!gId) return res.status(400).json({ success: false, message: 'Channel ID is required.' });

      targetGroup = await Group.findOne({
        _id: gId,
        workspaceId: req.user.workspaceId,
        isDeleted: false,
      });
      if (!targetGroup)
        return res.status(404).json({ success: false, message: 'Channel not found.' });

      const isMember = targetGroup.memberIds.some(
        (id) => id.toString() === req.user._id.toString()
      );
      if (req.user.role !== 'admin' && !isMember) {
        return res
          .status(403)
          .json({ success: false, message: 'You are not a member of this channel.' });
      }

      if (!canPostInGroup(req.user, targetGroup)) {
        return res.status(403).json({
          success: false,
          message: 'This channel is restricted to Administrator announcements only.',
        });
      }
    } else {
      const rId = recipientId || req.params.recipientId;
      if (!rId)
        return res.status(400).json({ success: false, message: 'Recipient ID is required.' });

      targetRecipient = await User.findOne({
        _id: rId,
        workspaceId: req.user.workspaceId,
        status: { $ne: 'disabled' },
      });
      if (!targetRecipient)
        return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    const newMessage = await Message.create({
      conversationType,
      groupId: targetGroup ? targetGroup._id : null,
      recipientId: targetRecipient ? targetRecipient._id : null,
      senderId: req.user._id,
      type,
      content: content.trim(),
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      duration,
      replyTo: replyTo || null,
      workspaceId: req.user.workspaceId,
      deliveredTo: [req.user._id],
      readBy: [req.user._id],
    });

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'name email avatar role post department')
      .populate('recipientId', 'name email avatar role post department')
      .populate({
        path: 'replyTo',
        select: 'content type fileName fileUrl senderId isDeletedForEveryone',
        populate: { path: 'senderId', select: 'name avatar' },
      })
      .populate('reactions.user', 'name avatar');

    // Compute preview text
    let preview = '';
    if (type === 'photo') preview = '📷 Photo';
    else if (type === 'video') preview = '🎥 Video';
    else if (type === 'audio') preview = '🎤 Voice note';
    else if (type === 'document') preview = `📄 ${fileName || 'Document'}`;
    else
      preview = content.trim().length > 45 ? `${content.trim().slice(0, 45)}...` : content.trim();

    const responseData = {
      ...populated.toObject(),
      tempId: req.body.tempId,
    };

    const io = req.app.get('io');
    if (io) {
      if (conversationType === 'group') {
        await Group.findByIdAndUpdate(targetGroup._id, {
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
        });
        io.to(`group:${targetGroup._id}`).emit('message:new', responseData);
        io.to(`group_${targetGroup._id}`).emit('new_message', responseData);
        io.to(`workspace:${req.user.workspaceId}`).emit('group:updated', {
          groupId: targetGroup._id,
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
        });
      } else {
        // Direct message emission to both participants
        io.to(`user:${targetRecipient._id}`).emit('message:new', responseData);
        if (targetRecipient._id.toString() !== req.user._id.toString()) {
          io.to(`user:${req.user._id}`).emit('message:new', responseData);
        }
        io.to(`user:${targetRecipient._id}`).emit('direct:conversationUpdated', {
          partnerId: req.user._id,
          lastMessage: responseData,
        });
        io.to(`user:${req.user._id}`).emit('direct:conversationUpdated', {
          partnerId: targetRecipient._id,
          lastMessage: responseData,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: responseData,
    });
  } catch (_error) {
    console.error('[Send Message Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to send message: ' + error.message });
  }
};

/**
 * 5. Edit Message (Author only)
 * PUT /api/messages/:id
 */
const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const message = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'You can only edit your own messages.' });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ success: false, message: 'Cannot edit a deleted message.' });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatar role post department')
      .populate({
        path: 'replyTo',
        select: 'content type fileName fileUrl senderId isDeletedForEveryone',
        populate: { path: 'senderId', select: 'name avatar' },
      })
      .populate('reactions.user', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      if (message.conversationType === 'group') {
        io.to(`group:${message.groupId}`).emit('message:edited', populated);
        io.to(`group_${message.groupId}`).emit('message:edited', populated);
      } else {
        io.to(`user:${message.senderId}`).emit('message:edited', populated);
        io.to(`user:${message.recipientId}`).emit('message:edited', populated);
      }
    }

    return res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (_error) {
    console.error('[Edit Message Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to edit message' });
  }
};

/**
 * 6. Toggle Message Reaction (👍 ❤️ 😂 😮 😢 🙏)
 * POST /api/messages/:id/reaction
 */
const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
        createdAt: new Date(),
      });
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatar role post department')
      .populate('reactions.user', 'name avatar');

    const io = req.app.get('io');
    if (io) {
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
    }

    return res.status(200).json({
      success: true,
      reactions: populated.reactions,
    });
  } catch (_error) {
    console.error('[Reaction Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update reaction' });
  }
};

/**
 * 7. Toggle Pin Message (Admin for Group Channels, Either user for DMs)
 * POST /api/messages/:id/pin
 */
const togglePinMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.conversationType === 'group' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Only channel administrators can pin messages.' });
    }

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? req.user._id : null;
    message.pinnedAt = message.isPinned ? new Date() : null;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatar role post department')
      .populate('pinnedBy', 'name');

    const io = req.app.get('io');
    if (io) {
      if (message.conversationType === 'group') {
        io.to(`group:${message.groupId}`).emit('message:pinUpdated', populated);
      } else {
        io.to(`user:${message.senderId}`).emit('message:pinUpdated', populated);
        io.to(`user:${message.recipientId}`).emit('message:pinUpdated', populated);
      }
    }

    return res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (_error) {
    console.error('[Pin Message Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to pin/unpin message' });
  }
};

/**
 * 8. Toggle Star / Save Message (User's private bookmarks)
 * POST /api/messages/:id/star
 */
const toggleStarMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const idx = message.starredBy.findIndex((u) => u.toString() === req.user._id.toString());
    let isStarred = false;
    if (idx > -1) {
      message.starredBy.splice(idx, 1);
    } else {
      message.starredBy.push(req.user._id);
      isStarred = true;
    }
    await message.save();

    return res.status(200).json({
      success: true,
      isStarred,
      message: isStarred ? 'Message saved to starred list' : 'Message removed from starred',
    });
  } catch (_error) {
    console.error('[Star Message Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to star message' });
  }
};

/**
 * 9. Delete Message (Delete for me VS Delete for everyone)
 * DELETE /api/messages/:id?mode=me|everyone
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = req.query.mode === 'me' ? 'me' : 'everyone';

    const message = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (mode === 'me') {
      // Hide message for current user only
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
      return res.status(200).json({
        success: true,
        messageId: message._id,
        mode: 'me',
      });
    }

    // Delete for everyone: verify author or admin
    const isOwner = message.senderId.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res
        .status(403)
        .json({ success: false, message: 'Permission denied: Cannot delete for everyone.' });
    }

    message.isDeletedForEveryone = true;
    message.deletedAt = new Date();
    message.content = '🚫 This message was deleted';
    message.fileUrl = '';
    message.fileName = '';
    message.reactions = [];
    message.isPinned = false;
    await message.save();

    const io = req.app.get('io');
    if (io) {
      if (message.conversationType === 'group') {
        io.to(`group:${message.groupId}`).emit('message:deleted', {
          messageId: message._id,
          groupId: message.groupId,
          isDeletedForEveryone: true,
        });
        io.to(`group_${message.groupId}`).emit('message_deleted', {
          messageId: message._id,
          groupId: message.groupId,
          isDeletedForEveryone: true,
        });
      } else {
        io.to(`user:${message.senderId}`).emit('message:deleted', {
          messageId: message._id,
          recipientId: message.recipientId,
          isDeletedForEveryone: true,
        });
        io.to(`user:${message.recipientId}`).emit('message:deleted', {
          messageId: message._id,
          senderId: message.senderId,
          isDeletedForEveryone: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      messageId: message._id,
      mode: 'everyone',
    });
  } catch (_error) {
    console.error('[Delete Message Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

/**
 * 10. Forward Message to another Channel or Direct Partner
 * POST /api/messages/:id/forward
 */
const forwardMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetType = 'group', targetId } = req.body;

    if (!targetId) {
      return res
        .status(400)
        .json({ success: false, message: 'Target channel or user ID is required.' });
    }

    const originalMsg = await Message.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!originalMsg) {
      return res.status(404).json({ success: false, message: 'Original message not found.' });
    }

    // Reuse sendMessage logic with forwarded content
    req.body = {
      conversationType: targetType,
      groupId: targetType === 'group' ? targetId : null,
      recipientId: targetType === 'direct' ? targetId : null,
      content: originalMsg.content,
      type: originalMsg.type,
      fileUrl: originalMsg.fileUrl,
      fileName: originalMsg.fileName,
      fileSize: originalMsg.fileSize,
      fileMimeType: originalMsg.fileMimeType,
      duration: originalMsg.duration,
    };

    return sendMessage(req, res);
  } catch (_error) {
    console.error('[Forward Message Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to forward message' });
  }
};

/**
 * 11. Mark conversation messages as Read
 * POST /api/messages/read
 */
const markAsRead = async (req, res) => {
  try {
    const { conversationType = 'group', targetId } = req.body;
    if (!targetId) return res.status(400).json({ success: false, message: 'Target ID required' });

    let filter = { workspaceId: req.user.workspaceId, readBy: { $ne: req.user._id } };

    if (conversationType === 'group') {
      filter.groupId = targetId;
    } else {
      filter.conversationType = 'direct';
      filter.senderId = targetId;
      filter.recipientId = req.user._id;
    }

    await Message.updateMany(filter, {
      $addToSet: { readBy: req.user._id, deliveredTo: req.user._id },
    });

    const io = req.app.get('io');
    if (io) {
      if (conversationType === 'direct') {
        io.to(`user:${targetId}`).emit('message:readReceipt', {
          readerId: req.user._id,
          conversationType: 'direct',
          targetId: req.user._id,
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
      message: 'Failed to mark messages as read',
    });
  }
};

/**
 * 12. Get Shared Media Repository for a Conversation
 * GET /api/messages/media?conversationType=group|direct&targetId=xxx&mediaType=all|photo|video|document|audio
 */
const getSharedMedia = async (req, res) => {
  try {
    const { conversationType = 'group', targetId, mediaType = 'all' } = req.query;
    if (!targetId) return res.status(400).json({ success: false, message: 'Target ID required' });

    let query = {
      workspaceId: req.user.workspaceId,
      deletedFor: { $ne: req.user._id },
      isDeletedForEveryone: false,
      fileUrl: { $ne: '' },
    };

    if (conversationType === 'group') {
      query.groupId = targetId;
    } else {
      query.conversationType = 'direct';
      query.$or = [
        { senderId: req.user._id, recipientId: targetId },
        { senderId: targetId, recipientId: req.user._id },
      ];
    }

    if (mediaType && mediaType !== 'all') {
      query.type = mediaType;
    }

    const items = await Message.find(query)
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      media: items,
    });
  } catch (_error) {
    console.error('[Get Shared Media Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shared media' });
  }
};

/**
 * 13. File Upload (Photo, Video, Document, Voice Note)
 * POST /api/messages/upload
 */
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    let type = 'document';
    const mime = req.file.mimetype || '';

    if (mime.startsWith('image/')) {
      type = 'photo';
    } else if (mime.startsWith('video/')) {
      type = 'video';
    } else if (mime.startsWith('audio/')) {
      type = 'audio';
    }

    return res.status(200).json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileMimeType: req.file.mimetype,
      type,
    });
  } catch (_error) {
    console.error('[Upload Error]:', error);
    return res.status(500).json({ success: false, message: 'File upload failed' });
  }
};

module.exports = {
  getGroupMessages,
  getDirectMessages,
  getDirectConversations,
  sendMessage,
  editMessage,
  toggleReaction,
  togglePinMessage,
  toggleStarMessage,
  deleteMessage,
  forwardMessage,
  markAsRead,
  getSharedMedia,
  uploadAttachment,
};
