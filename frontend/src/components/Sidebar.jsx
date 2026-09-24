import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CheckSquare,
  Video,
  Megaphone,
  Activity,
  FolderOpen,
  LogOut,
  Hash,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import Avatar from './Avatar';

const Sidebar = ({
  currentTab,
  setTab,
  groups = [],
  users = [],
  activeGroupId,
  activeDirectUserId,
  onSelectGroup,
  onSelectDirectUser,
  onOpenCreateGroup,
  isOpen = false,
  onClose,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const { onlineUsers = [] } = useSocket() || {};
  const { confirm } = useNotification();

  const handleNavClick = (tabId) => {
    if (onSelectGroup) onSelectGroup(null);
    if (onSelectDirectUser) onSelectDirectUser(null);
    setTab(tabId);
    if (onClose) onClose();
  };

  const handleGroupClick = (groupId) => {
    if (onSelectDirectUser) onSelectDirectUser(null);
    if (onSelectGroup) {
      onSelectGroup(groupId);
    } else {
      setTab('chat');
    }
    if (onClose) onClose();
  };

  const handleUserClick = (userId, userObj) => {
    if (onSelectGroup) onSelectGroup(null);
    if (onSelectDirectUser) {
      onSelectDirectUser(userId, userObj);
    } else {
      setTab('chat');
    }
    if (onClose) onClose();
  };

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Team Management', icon: Users },
    { id: 'groups', label: 'Group Management', icon: MessageSquare },
    { id: 'tasks', label: 'Task Management', icon: CheckSquare },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'files', label: 'Files Hub', icon: FolderOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'activity', label: 'Audit Logs', icon: Activity },
  ];

  const userNav = [
    { id: 'dashboard', label: 'My Workspace', icon: LayoutDashboard },
    { id: 'groups', label: 'Group Management', icon: MessageSquare },
    { id: 'tasks', label: 'Task Management', icon: CheckSquare },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'files', label: 'Files Hub', icon: FolderOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Workspace Header */}
      <div className="sidebar-header">
        <div
          className="workspace-badge"
          onClick={() => {
            setTab('dashboard');
            if (onClose) onClose();
          }}
        >
          <div className="workspace-icon">{user?.workspaceName?.[0]?.toUpperCase() || 'S'}</div>
          <div className="workspace-info">
            <span className="workspace-title" title={user?.workspaceName || 'SAAS Nexus'}>
              {user?.workspaceName || 'SAAS Nexus'}
            </span>
            <div
              className="workspace-role-pill"
              title={isAdmin ? 'Administrator' : user?.post || 'Team Member'}
            >
              <span className="workspace-role-pill-icon">{isAdmin ? '🛡️' : '💼'}</span>
              <span className="workspace-role-pill-text">
                {isAdmin ? 'Administrator' : user?.post || 'Team Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mobile-close-btn"
            title="Close Menu"
            aria-label="Close Menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="sidebar-content">
        <div>
          <div className="sidebar-section-title">Navigation</div>
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id && currentTab !== 'chat';
              return (
                <li
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Channels Section */}
        <div>
          <div className="sidebar-section-title">
            <span>Channels ({groups.length})</span>
            {isAdmin && onOpenCreateGroup && (
              <button
                onClick={() => {
                  onOpenCreateGroup();
                  if (onClose) onClose();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Create New Group"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <ul className="sidebar-nav-list">
            {groups.map((group) => {
              const isActive =
                (currentTab === 'chat' || currentTab === 'group-dashboard') &&
                activeGroupId === group._id &&
                !activeDirectUserId;
              const isLocked = group.chatPermission === 'adminOnly';
              return (
                <li
                  key={group._id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleGroupClick(group._id)}
                >
                  {isLocked ? <Lock size={15} color="#F59E0B" /> : <Hash size={15} />}
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {group.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Team Members Direct Chat Section */}
        {users.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="sidebar-section-title">
              <span>Team Members ({users.length})</span>
            </div>
            <ul className="sidebar-nav-list">
              {users.map((member) => {
                const memberId = (member._id || member.id || '').toString();
                const isSelf = memberId === (user?.id || user?._id || '').toString();
                const isOnline = isSelf ? true : onlineUsers.includes(memberId);
                const isActive = currentTab === 'chat' && activeDirectUserId === memberId;

                return (
                  <li
                    key={memberId}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleUserClick(memberId, member)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                    }}
                    title={`Chat with ${member.name} (${isOnline ? 'Online' : 'Offline'})`}
                  >
                    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
                      <Avatar
                        name={member.name}
                        src={member.avatar}
                        size="xs"
                        imgStyle={{ width: '22px', height: '22px', fontSize: '10px' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#22c55e' : '#64748b',
                          border: '1.5px solid var(--color-sidebar-bg)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        fontSize: '12.5px',
                        color: isActive ? '#FFFFFF' : '#CBD5E1',
                      }}
                    >
                      {member.name} {isSelf && '(You)'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Current User Card in Sidebar Footer */}
      <div className="sidebar-footer" style={{ gap: '6px', padding: '10px 12px' }}>
        <div
          onClick={() => handleNavClick('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            flex: 1,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            transition: 'background-color var(--transition-fast)',
          }}
          title="Open Profile & Settings"
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Avatar name={user?.name} src={user?.avatar} isOnline={true} size="sm" />
          <div
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
          >
            <span
              style={{
                color: '#F8FAFC',
                fontSize: '12.5px',
                fontWeight: 600,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                lineHeight: 1.25,
              }}
            >
              {user?.name}
            </span>
            <span
              style={{
                color: '#94A3B8',
                fontSize: '10.5px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                marginTop: '1px',
              }}
            >
              {user?.email}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            confirm({
              title: 'Sign Out',
              message: 'Are you sure you want to sign out?',
              confirmText: 'Sign Out',
              cancelText: 'Cancel',
              type: 'logout',
              onConfirm: () => {
                logout();
              },
            });
          }}
          className="btn btn-ghost btn-icon"
          style={{
            color: '#EF4444',
            width: '30px',
            height: '30px',
            flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
            padding: 0,
          }}
          title="Sign Out / Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
