const Meeting = require('../models/Meeting');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const ActivityLog = require('../models/ActivityLog');
const {
  createEventWithMeet,
  updateEvent,
  deleteOrCancelEvent,
} = require('../services/googleCalendarService');
const { sendMeetingEmail } = require('../services/emailService');
const { notify } = require('../services/notify');

/**
 * Get meetings for current user
 */
const getMeetings = async (req, res) => {
  try {
    const { status, groupId } = req.query;
    let query = { workspaceId: req.user.workspaceId };

    if (req.user.role !== 'admin') {
      query.$or = [{ attendeeIds: req.user._id }, { groupId: { $in: req.user.groupIds || [] } }];
    }

    if (groupId) {
      query.groupId = groupId;
    }

    if (status) {
      if (status === 'upcoming') {
        query.status = 'upcoming';
      } else if (status === 'past') {
        query.status = { $in: ['completed', 'cancelled'] };
      } else {
        query.status = status;
      }
    }

    const meetings = await Meeting.find(query)
      .populate('groupId', 'name avatar chatPermission')
      .populate('createdBy', 'name email avatar post')
      .populate('attendeeIds', 'name email avatar post department')
      .sort({ dateTime: status === 'past' ? -1 : 1 });

    return res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    console.error('[Get Meetings Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
};

/**
 * Get single meeting detail
 */
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId })
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post')
      .populate('attendeeIds', 'name email avatar post department');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Access authorization check
    if (req.user.role !== 'admin') {
      const isAttendee = meeting.attendeeIds?.some(
        (a) => a._id.toString() === req.user._id.toString()
      );
      const isGroupMember = meeting.groupId?.memberIds?.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isAttendee && !isGroupMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not an attendee of this meeting',
        });
      }
    }

    return res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('[Get Meeting Detail Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meeting details' });
  }
};

/**
 * Create meeting with Google Calendar & Google Meet auto-generation
 * Accessible by Workspace Admins and Channel Members
 */
const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description = '',
      groupId,
      dateTime,
      durationMinutes = 45,
      attendeeIds,
      meetingType = 'general',
      isInstant = false,
      googleMeetLink,
    } = req.body;

    if (!title || !groupId) {
      return res
        .status(400)
        .json({ success: false, message: 'Title and target channel are required.' });
    }

    const group = await Group.findOne({
      _id: groupId,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Selected group channel not found' });
    }

    // Membership check for non-admin users
    const isMember = group.memberIds.some((id) => id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You can only schedule meetings in channels you belong to.',
      });
    }

    // Resolve attendee IDs (defaults to group members if not specified)
    const finalAttendeeIds =
      attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0
        ? attendeeIds
        : group.memberIds;

    const attendeeUsers = await User.find({
      _id: { $in: finalAttendeeIds },
      workspaceId: req.user.workspaceId,
      status: { $ne: 'disabled' },
    }).select('email name');

    const attendeeEmails = attendeeUsers.map((u) => u.email).filter(Boolean);

    // Date & Time computation
    const startTime = isInstant || !dateTime ? new Date() : new Date(dateTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    let eventId = null;
    let finalMeetLink = googleMeetLink?.trim();

    if (finalMeetLink) {
      eventId = `custom_${Date.now()}`;
    } else {
      const meetData = await createEventWithMeet({
        summary: title.trim(),
        description: description.trim(),
        start: startTime,
        end: endTime,
        attendeeEmails,
      });
      eventId = meetData.eventId;
      finalMeetLink = meetData.meetLink;
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description.trim(),
      groupId,
      dateTime: startTime,
      durationMinutes,
      googleEventId: eventId,
      googleMeetLink: finalMeetLink,
      createdBy: req.user._id,
      attendeeIds: finalAttendeeIds,
      meetingType,
      isInstant: !!isInstant,
      status: 'upcoming',
      workspaceId: req.user.workspaceId,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar post')
      .populate('attendeeIds', 'name email avatar post department');

    const typeLabels = {
      standup: '⚡ Daily Standup',
      sync: '🔄 Team Sync',
      review: '🔍 Design & Code Review',
      demo: '🚀 Product Demo',
      allhands: '👥 All-Hands Sync',
      general: '📹 Video Meeting',
    };
    const typeLabel = typeLabels[meetingType] || '📹 Video Meeting';

    // Auto-post an interactive announcement card in the channel chat thread
    const timeFormatted = isInstant
      ? '🔴 Started Now (Instant Call)'
      : `🕒 ${startTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

    await Message.create({
      groupId,
      senderId: req.user._id,
      type: 'text',
      content: `**${typeLabel}: ${meeting.title}**\n${timeFormatted} · ⏱️ ${durationMinutes} mins\n🔗 **Join Google Meet:** ${meeting.googleMeetLink}${description ? `\n\n📝 *Agenda:* ${description}` : ''}`,
      workspaceId: req.user.workspaceId,
      readBy: [req.user._id],
    });

    // Send email notifications to attendees
    if (attendeeEmails.length > 0) {
      sendMeetingEmail({
        to: attendeeEmails,
        subject: `[SAAS Nexus] ${isInstant ? '🔴 Call Started' : 'Invitation'}: ${meeting.title}`,
        meeting: populatedMeeting,
        action: isInstant ? 'started' : 'scheduled',
      }).catch((e) => console.warn('Email send warning:', e));
    }

    // Log Activity
    await ActivityLog.create({
      actorId: req.user._id,
      action: isInstant ? 'meeting.instant_start' : 'meeting.create',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} ${isInstant ? 'started instant call' : 'scheduled meeting'} "${meeting.title}" in #${group.name}`,
      metadata: { title: meeting.title, meetLink: meeting.googleMeetLink, dateTime: startTime },
      workspaceId: req.user.workspaceId,
    });

    // Real-time Socket.IO Dispatches
    const io = req.app.get('io');
    if (io) {
      // Channel broadcast
      io.to(`group:${groupId}`).emit('meeting:new', populatedMeeting);
      io.to(`group_${groupId}`).emit('meeting_created', populatedMeeting);

      // Targeted user broadcasts to attendees
      finalAttendeeIds.forEach((attId) => {
        io.to(`user:${attId.toString()}`).emit('meeting:new', populatedMeeting);
      });
    }

    // Unified in-app Notification Center entry
    await notify({
      userIds: finalAttendeeIds,
      type: 'meeting',
      title: `${isInstant ? '🔴 Live Call' : '📅 Meeting Invitation'}: ${meeting.title}`,
      body: `${isInstant ? 'Started just now' : `Scheduled for ${startTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`} in #${group.name}`,
      linkTo: 'meetings',
      refId: meeting._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    return res.status(201).json({
      success: true,
      message: isInstant
        ? 'Instant Google Meet call started!'
        : 'Meeting scheduled and Google Meet link generated!',
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error('[Create Meeting Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to create meeting: ' + error.message });
  }
};

/**
 * Admin: Update meeting
 */
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dateTime, durationMinutes, attendeeIds } = req.body;

    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit meetings created by you.',
      });
    }

    if (title) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description.trim();
    if (durationMinutes) meeting.durationMinutes = durationMinutes;
    if (dateTime) meeting.dateTime = new Date(dateTime);
    if (attendeeIds && Array.isArray(attendeeIds)) meeting.attendeeIds = attendeeIds;

    await meeting.save();

    // Sync with Google Calendar if eventId exists
    const startTime = meeting.dateTime;
    const endTime = new Date(startTime.getTime() + meeting.durationMinutes * 60 * 1000);

    const attendeeUsers = await User.find({ _id: { $in: meeting.attendeeIds } }).select('email');
    const attendeeEmails = attendeeUsers.map((u) => u.email).filter(Boolean);

    await updateEvent(meeting.googleEventId, {
      summary: meeting.title,
      description: meeting.description,
      start: startTime,
      end: endTime,
      attendeeEmails,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('groupId', 'name avatar')
      .populate('createdBy', 'name email avatar post')
      .populate('attendeeIds', 'name email avatar post department');

    // Notify via email
    if (attendeeEmails.length > 0) {
      sendMeetingEmail({
        to: attendeeEmails,
        subject: `[SAAS Nexus] Updated: ${meeting.title}`,
        meeting: populatedMeeting,
        action: 'updated',
      }).catch((e) => console.warn('Email send warning:', e));
    }

    // Log Activity
    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.edit',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} updated meeting "${meeting.title}"`,
      workspaceId: req.user.workspaceId,
    });

    // Socket broadcasts
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${meeting.groupId}`).emit('meeting:updated', populatedMeeting);
      meeting.attendeeIds.forEach((attId) => {
        io.to(`user:${attId.toString()}`).emit('meeting:updated', populatedMeeting);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting details updated',
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error('[Update Meeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update meeting' });
  }
};

/**
 * Admin: Soft cancel meeting
 */
const cancelMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId })
      .populate('groupId', 'name')
      .populate('attendeeIds', 'email name');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only cancel meetings created by you.',
      });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Cancel Google Calendar Event
    if (meeting.googleEventId) {
      await deleteOrCancelEvent(meeting.googleEventId);
    }

    // Auto-post cancellation alert to chat
    await Message.create({
      groupId: meeting.groupId._id || meeting.groupId,
      senderId: req.user._id,
      type: 'text',
      content: `🚫 **Meeting Cancelled**: The scheduled session "${meeting.title}" has been cancelled.`,
      workspaceId: req.user.workspaceId,
      readBy: [req.user._id],
    });

    // Notify via email
    const attendeeEmails = meeting.attendeeIds?.map((u) => u.email).filter(Boolean) || [];
    if (attendeeEmails.length > 0) {
      sendMeetingEmail({
        to: attendeeEmails,
        subject: `[SAAS Nexus] Cancelled: ${meeting.title}`,
        meeting,
        action: 'cancelled',
      }).catch((e) => console.warn('Email send warning:', e));
    }

    // Log Activity
    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.cancel',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} cancelled meeting "${meeting.title}"`,
      workspaceId: req.user.workspaceId,
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${meeting.groupId._id || meeting.groupId}`).emit('meeting:cancelled', {
        meetingId: meeting._id,
        title: meeting.title,
      });
      meeting.attendeeIds?.forEach((att) => {
        io.to(`user:${att._id.toString()}`).emit('meeting:cancelled', {
          meetingId: meeting._id,
          title: meeting.title,
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting cancelled successfully',
      meeting,
    });
  } catch (error) {
    console.error('[Cancel Meeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel meeting' });
  }
};

/**
 * Admin: Hard delete meeting
 */
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOneAndDelete({ _id: id, workspaceId: req.user.workspaceId });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.googleEventId) {
      await deleteOrCancelEvent(meeting.googleEventId);
    }

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.delete',
      targetType: 'Meeting',
      targetId: id,
      details: `${req.user.name} deleted meeting "${meeting.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group:${meeting.groupId}`).emit('meeting:cancelled', {
        meetingId: id,
        title: meeting.title,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting removed from workspace',
    });
  } catch (error) {
    console.error('[Delete Meeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete meeting' });
  }
};

module.exports = {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  deleteMeeting,
};
