const Meeting = require('../models/Meeting');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const ActivityLog = require('../models/ActivityLog');
const {
  createMeetingEvent,
  updateMeetingEvent,
  cancelMeetingEvent,
  isGoogleCredentialsConfigured,
} = require('../services/googleMeetService');
const { sendMeetingEmail } = require('../services/emailService');
const { notify } = require('../services/notify');

/**
 * Helper to auto-complete past upcoming meetings
 */
const updateExpiredUpcomingMeetings = async (workspaceId) => {
  try {
    const now = new Date();
    await Meeting.updateMany(
      {
        workspaceId,
        status: 'upcoming',
        endTime: { $lt: now },
      },
      {
        $set: { status: 'completed' },
      }
    );
  } catch (err) {
    console.warn('[Auto-complete Meetings Warning]:', err.message);
  }
};

/**
 * 1. Get meetings with status, group, and search filters
 * Supports upcoming, past (completed/cancelled), and cancelled queries
 */
const getMeetings = async (req, res) => {
  try {
    const { status, groupId, search } = req.query;
    const workspaceId = req.user.workspaceId;

    // Auto-update expired upcoming meetings in background
    await updateExpiredUpcomingMeetings(workspaceId);

    let query = { workspaceId };

    // Role-based visibility: Admins see all workspace meetings; standard users see meetings for their groups or where they are attendees
    if (req.user.role !== 'admin') {
      const userGroupIds = req.user.groupIds || [];
      query.$or = [
        { attendeeIds: req.user._id },
        { groupId: { $in: userGroupIds } },
        { createdBy: req.user._id },
      ];
    }

    if (groupId) {
      query.groupId = groupId;
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      });
    }

    if (status) {
      if (status === 'upcoming') {
        query.status = 'upcoming';
      } else if (status === 'past') {
        query.status = { $in: ['completed', 'cancelled'] };
      } else if (status === 'cancelled') {
        query.status = 'cancelled';
      } else if (status === 'completed') {
        query.status = 'completed';
      }
    }

    const sortOrder = status === 'past' || status === 'completed' || status === 'cancelled'
      ? { dateTime: -1 }
      : { dateTime: 1 };

    const meetings = await Meeting.find(query)
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post role')
      .populate('attendeeIds', 'name email avatar post department role')
      .populate('cancelledBy', 'name email avatar post')
      .sort(sortOrder);

    return res.status(200).json({
      success: true,
      count: meetings.length,
      isGoogleConfigured: isGoogleCredentialsConfigured(),
      meetings,
    });
  } catch (error) {
    console.error('[Get Meetings Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meetings directory' });
  }
};

/**
 * 2. Get single meeting detail
 */
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId })
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post role')
      .populate('attendeeIds', 'name email avatar post department role')
      .populate('cancelledBy', 'name email avatar post');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Access authorization check for standard users
    if (req.user.role !== 'admin') {
      const isAttendee = meeting.attendeeIds?.some(
        (a) => a._id.toString() === req.user._id.toString()
      );
      const isGroupMember = meeting.groupId?.memberIds?.some(
        (m) => m.toString() === req.user._id.toString()
      );
      const isCreator = meeting.createdBy?._id?.toString() === req.user._id.toString();

      if (!isAttendee && !isGroupMember && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this meeting.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      isGoogleConfigured: isGoogleCredentialsConfigured(),
      meeting,
    });
  } catch (error) {
    console.error('[Get Meeting Detail Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meeting details' });
  }
};

/**
 * 3. Create a new Meeting with Google Calendar & Google Meet generation
 */
const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description = '',
      groupId,
      dateTime,
      durationMinutes = 30,
      attendeeIds,
      meetingType = 'general',
      isInstant = false,
      googleMeetLink,
    } = req.body;

    // Server-side validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title is required.',
      });
    }

    if (title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title must be at least 2 characters.',
      });
    }

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Target channel/group is required.',
      });
    }

    const group = await Group.findOne({
      _id: groupId,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Selected channel was not found in this workspace.',
      });
    }

    // Membership check for non-admin users
    const isMember = group.memberIds.some((id) => id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You can only schedule meetings in channels you belong to.',
      });
    }

    // Time validation
    const parsedStartTime = isInstant || !dateTime ? new Date() : new Date(dateTime);
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date and time.',
      });
    }

    // Prevent scheduling in the past (allow 60 seconds clock skew)
    if (!isInstant && parsedStartTime.getTime() < Date.now() - 60000) {
      return res.status(400).json({
        success: false,
        message: 'Meeting date and time cannot be in the past. Please select a future time.',
      });
    }

    const duration = Math.max(5, Math.min(480, parseInt(durationMinutes, 10) || 30));
    const calculatedEndTime = new Date(parsedStartTime.getTime() + duration * 60000);

    // Resolve attendee IDs (defaults to group memberIds if not explicitly passed)
    const rawAttendeeIds =
      attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0
        ? attendeeIds
        : group.memberIds;

    const attendeeUsers = await User.find({
      _id: { $in: rawAttendeeIds },
      workspaceId: req.user.workspaceId,
      status: { $ne: 'disabled' },
    }).select('email name');

    const finalAttendeeIds = attendeeUsers.map((u) => u._id);
    const attendeeEmails = attendeeUsers.map((u) => u.email).filter(Boolean);

    let eventId = null;
    let finalMeetLink = googleMeetLink?.trim();
    let isDemo = false;
    let provider = 'demo';

    if (finalMeetLink) {
      eventId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      isDemo = false;
      provider = 'custom';
    } else {
      const meetData = await createMeetingEvent({
        summary: title.trim(),
        description: description.trim(),
        start: parsedStartTime,
        end: calculatedEndTime,
        attendeeEmails,
      });
      eventId = meetData.eventId;
      finalMeetLink = meetData.meetLink;
      isDemo = meetData.isDemoLink;
      provider = meetData.provider || (isDemo ? 'demo' : 'google');
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description.trim(),
      groupId,
      dateTime: parsedStartTime,
      durationMinutes: duration,
      endTime: calculatedEndTime,
      googleEventId: eventId,
      googleMeetLink: finalMeetLink,
      isDemoLink: isDemo,
      provider,
      createdBy: req.user._id,
      attendeeIds: finalAttendeeIds,
      meetingType,
      isInstant: Boolean(isInstant),
      status: 'upcoming',
      workspaceId: req.user.workspaceId,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post role')
      .populate('attendeeIds', 'name email avatar post department role');

    // Post interactive announcement in channel chat
    const timeFormatted = isInstant
      ? '🔴 Live Now (Instant Call)'
      : `🕒 ${parsedStartTime.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`;

    await Message.create({
      groupId,
      senderId: req.user._id,
      type: 'text',
      content: `**📹 Meeting Scheduled: ${meeting.title}**\n${timeFormatted} · ⏱️ ${duration} mins\n🔗 **Google Meet Link:** ${meeting.googleMeetLink}${
        description ? `\n\n📝 *Agenda:* ${description}` : ''
      }`,
      workspaceId: req.user.workspaceId,
      readBy: [req.user._id],
    });

    // Send email invitations
    if (attendeeEmails.length > 0) {
      sendMeetingEmail({
        to: attendeeEmails,
        subject: `[SAAS Nexus] ${isInstant ? '🔴 Live Call Started' : '📅 Meeting Invitation'}: ${meeting.title}`,
        meeting: populatedMeeting,
        action: isInstant ? 'started' : 'scheduled',
      }).catch((e) => console.warn('[Meeting Email Warning]:', e.message));
    }

    // Log Activity with clear Actor -> Action -> Target
    await ActivityLog.create({
      actorId: req.user._id,
      action: isInstant ? 'meeting.instant_start' : 'meeting.create',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} ${isInstant ? 'started instant call' : 'scheduled meeting'} "${meeting.title}" in #${group.name}`,
      metadata: {
        title: meeting.title,
        meetLink: meeting.googleMeetLink,
        dateTime: parsedStartTime,
        durationMinutes: duration,
        isDemoLink: isDemo,
      },
      workspaceId: req.user.workspaceId,
    });

    // Real-time Socket.IO Dispatches
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('meeting:new', populatedMeeting);
      io.to(`group_${groupId}`).emit('meeting_created', populatedMeeting);
      io.to(`workspace:${req.user.workspaceId}`).emit('meeting:new', populatedMeeting);
      io.to(`workspace_${req.user.workspaceId}`).emit('meeting_created', populatedMeeting);

      finalAttendeeIds.forEach((attId) => {
        io.to(`user:${attId.toString()}`).emit('meeting:new', populatedMeeting);
      });
    }

    // Unified in-app Notification Center entry
    await notify({
      userIds: finalAttendeeIds,
      type: 'meeting',
      title: `${isInstant ? '🔴 Live Video Call' : '📅 New Meeting Scheduled'}: ${meeting.title}`,
      body: `${isInstant ? 'Started just now' : `Scheduled for ${parsedStartTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`} in #${group.name}`,
      linkTo: 'meetings',
      refId: meeting._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    return res.status(201).json({
      success: true,
      message: isInstant
        ? 'Instant video meeting started!'
        : 'Meeting scheduled successfully and Google Meet link generated!',
      isDemoLink: isDemo,
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error('[Create Meeting Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule meeting',
    });
  }
};

/**
 * 4. Update an existing meeting & sync changes to Google Calendar
 */
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dateTime, durationMinutes, attendeeIds, meetingType } = req.body;

    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled meetings cannot be modified. Please schedule a new meeting.',
      });
    }

    // Authorization: Admin or Creator
    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit meetings created by you.',
      });
    }

    if (title && typeof title === 'string' && title.trim()) {
      meeting.title = title.trim();
    }

    if (description !== undefined) {
      meeting.description = typeof description === 'string' ? description.trim() : '';
    }

    if (meetingType) {
      meeting.meetingType = meetingType;
    }

    if (durationMinutes) {
      meeting.durationMinutes = Math.max(5, Math.min(480, parseInt(durationMinutes, 10) || 30));
    }

    if (dateTime) {
      const newDate = new Date(dateTime);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date/time provided.' });
      }
      meeting.dateTime = newDate;
    }

    meeting.endTime = new Date(meeting.dateTime.getTime() + meeting.durationMinutes * 60000);

    if (attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
      const validAttendees = await User.find({
        _id: { $in: attendeeIds },
        workspaceId: req.user.workspaceId,
        status: { $ne: 'disabled' },
      }).select('_id');
      meeting.attendeeIds = validAttendees.map((u) => u._id);
    }

    await meeting.save();

    // Sync updates to Google Calendar event
    const attendeeUsers = await User.find({
      _id: { $in: meeting.attendeeIds },
      workspaceId: req.user.workspaceId,
    }).select('email');
    const attendeeEmails = attendeeUsers.map((u) => u.email).filter(Boolean);

    if (meeting.googleEventId) {
      await updateMeetingEvent(meeting.googleEventId, {
        summary: meeting.title,
        description: meeting.description,
        start: meeting.dateTime,
        end: meeting.endTime,
        attendeeEmails,
      });
    }

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post role')
      .populate('attendeeIds', 'name email avatar post department role');

    // Notify attendees of update via in-app notification
    const io = req.app.get('io');
    await notify({
      userIds: meeting.attendeeIds,
      type: 'meeting',
      title: `📝 Meeting Details Updated: ${meeting.title}`,
      body: `Rescheduled for ${meeting.dateTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (${meeting.durationMinutes} mins)`,
      linkTo: 'meetings',
      refId: meeting._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    // Send updated email
    if (attendeeEmails.length > 0) {
      sendMeetingEmail({
        to: attendeeEmails,
        subject: `[SAAS Nexus] Updated Schedule: ${meeting.title}`,
        meeting: populatedMeeting,
        action: 'updated',
      }).catch((e) => console.warn('[Meeting Email Warning]:', e.message));
    }

    // Log Activity
    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.edit',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} updated meeting details for "${meeting.title}"`,
      metadata: {
        title: meeting.title,
        dateTime: meeting.dateTime,
        durationMinutes: meeting.durationMinutes,
      },
      workspaceId: req.user.workspaceId,
    });

    // Real-time Socket broadcast
    if (io) {
      io.to(`group:${meeting.groupId}`).emit('meeting:updated', populatedMeeting);
      io.to(`workspace:${req.user.workspaceId}`).emit('meeting:updated', populatedMeeting);
      meeting.attendeeIds.forEach((attId) => {
        io.to(`user:${attId.toString()}`).emit('meeting:updated', populatedMeeting);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting details updated and calendar synchronized!',
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error('[Update Meeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update meeting details' });
  }
};

/**
 * 5. Cancel a meeting & notify all attendees
 */
const cancelMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const rawReason = req.body.cancelReason || req.body.reason || '';
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';

    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId })
      .populate('groupId', 'name')
      .populate('attendeeIds', 'email name');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: 'Meeting is already cancelled.',
        meeting,
      });
    }

    // Authorization: Admin or Creator
    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only cancel meetings created by you.',
      });
    }

    meeting.status = 'cancelled';
    meeting.cancelledAt = new Date();
    meeting.cancelledBy = req.user._id;
    meeting.cancelReason = reason.trim() || 'Cancelled by meeting organizer';
    await meeting.save();

    // Cancel Google Calendar Event
    if (meeting.googleEventId) {
      await cancelMeetingEvent(meeting.googleEventId);
    }

    // Post cancellation alert in channel chat
    await Message.create({
      groupId: meeting.groupId._id || meeting.groupId,
      senderId: req.user._id,
      type: 'text',
      content: `🚫 **Meeting Cancelled**: "${meeting.title}" originally scheduled for ${new Date(
        meeting.dateTime
      ).toLocaleDateString([], { month: 'short', day: 'numeric' })} has been cancelled.${
        reason ? `\n*Reason:* ${reason.trim()}` : ''
      }`,
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
      }).catch((e) => console.warn('[Meeting Cancel Email Warning]:', e.message));
    }

    // Log Activity
    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.cancel',
      targetType: 'Meeting',
      targetId: meeting._id,
      details: `${req.user.name} cancelled meeting "${meeting.title}"${reason ? ` (Reason: "${reason.trim()}")` : ''}`,
      metadata: { reason: meeting.cancelReason },
      workspaceId: req.user.workspaceId,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('groupId', 'name avatar chatPermission memberIds')
      .populate('createdBy', 'name email avatar post role')
      .populate('attendeeIds', 'name email avatar post department role')
      .populate('cancelledBy', 'name email avatar post');

    // Real-time socket & Notification Center alert
    const io = req.app.get('io');
    if (io) {
      const payload = {
        meetingId: meeting._id,
        title: meeting.title,
        meeting: populatedMeeting,
      };
      io.to(`group:${meeting.groupId._id || meeting.groupId}`).emit('meeting:cancelled', payload);
      io.to(`workspace:${req.user.workspaceId}`).emit('meeting:cancelled', payload);
      io.to(`group:${meeting.groupId._id || meeting.groupId}`).emit('meeting:updated', populatedMeeting);

      meeting.attendeeIds?.forEach((att) => {
        io.to(`user:${att._id.toString()}`).emit('meeting:cancelled', payload);
      });
    }

    const attendeeIdList = meeting.attendeeIds?.map((a) => a._id) || [];
    await notify({
      userIds: attendeeIdList,
      type: 'meeting',
      title: `🚫 Meeting Cancelled: ${meeting.title}`,
      body: `The meeting scheduled for ${new Date(meeting.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} was cancelled.`,
      linkTo: 'meetings',
      refId: meeting._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    return res.status(200).json({
      success: true,
      message: 'Meeting cancelled and attendees notified.',
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error('[Cancel Meeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel meeting' });
  }
};

/**
 * 6. Hard delete a meeting (Admin only, cleans up DB record)
 */
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ _id: id, workspaceId: req.user.workspaceId });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can permanently delete meetings.',
      });
    }

    if (meeting.googleEventId) {
      await cancelMeetingEvent(meeting.googleEventId);
    }

    await Meeting.findByIdAndDelete(meeting._id);

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'meeting.delete',
      targetType: 'Meeting',
      targetId: id,
      details: `${req.user.name} deleted meeting record "${meeting.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group:${meeting.groupId}`).emit('meeting:cancelled', {
        meetingId: id,
        title: meeting.title,
      });
      io.to(`workspace:${req.user.workspaceId}`).emit('meeting:cancelled', {
        meetingId: id,
        title: meeting.title,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting permanently removed.',
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
