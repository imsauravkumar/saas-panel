const Message = require('../models/Message');
const Group = require('../models/Group');

/**
 * GET /api/files
 * Aggregated files (photos and documents) across user's channels
 * Query params: ?groupId=&type=photo|document&search=&page=1&limit=50
 */
const getFiles = async (req, res) => {
  try {
    const userId = req.user._id;
    const workspaceId = req.user.workspaceId;
    const { groupId, type, search, page = 1, limit = 50 } = req.query;

    // Get user's active groups
    const groupQuery = { workspaceId, isDeleted: false };
    if (req.user.role !== 'admin') {
      groupQuery.memberIds = userId;
    }
    const userGroups = await Group.find(groupQuery).select('_id name').lean();
    const userGroupIds = userGroups.map((g) => g._id);

    // Build message search query
    const query = {
      workspaceId,
      deletedAt: null,
      type: { $in: ['photo', 'video', 'document'] }, // Include video in file library
    };

    if (groupId) {
      // Validate that user is allowed to access this group's files
      const hasAccess = userGroupIds.some((id) => id.toString() === groupId.toString());
      if (!hasAccess && req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied to files in this channel' });
      }
      query.groupId = groupId;
    } else {
      query.groupId = { $in: userGroupIds };
    }

    if (type && ['photo', 'video', 'document'].includes(type)) {
      query.type = type;
    }

    if (search && search.trim()) {
      query.$or = [
        { fileName: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [files, total] = await Promise.all([
      Message.find(query)
        .populate('senderId', 'name email avatar role post')
        .populate('groupId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      files,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[Get Files Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve aggregated files' });
  }
};

module.exports = {
  getFiles,
};
