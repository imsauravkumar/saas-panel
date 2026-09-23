/**
 * Permission Enforcement Rule:
 * Determines if a user has permission to post messages in a group
 */
function canPostInGroup(user, group) {
  if (!user || !group) return false;
  if (user.status === 'disabled') return false;
  if (user.role === 'admin') return true;
  if (group.chatPermission === 'everyone') return true;
  return false; // adminOnly + non-admin
}

module.exports = {
  canPostInGroup,
};
