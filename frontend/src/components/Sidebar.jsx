import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CheckSquare,
  Video,
  Megaphone,
  Activity,
  FolderOpen,
  Settings,
  LogOut,
  Hash,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Avatar from './Avatar';

const Sidebar = ({
  currentTab,
  setTab,
  groups = [],
  activeGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  isOpen = false,
  onClose,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const { confirm } = useNotification();

  const handleNavClick = (tabId) => {
    if (onSelectGroup) onSelectGroup(null);
    setTab(tabId);
    if (onClose) onClose();
  };

  const handleGroupClick = (groupId) => {
    if (onSelectGroup) {
      onSelectGroup(groupId);
    } else {
      setTab('chat');
    }
    if (onClose) onClose();
  };

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Team Directory', icon: Users },
    { id: 'groups', label: 'Group Channels', icon: MessageSquare },
    { id: 'tasks', label: 'Work & Tasks', icon: CheckSquare },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'files', label: 'Files Hub', icon: FolderOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'activity', label: 'Audit Logs', icon: Activity },
  ];

  const userNav = [
    { id: 'dashboard', label: 'My Workspace', icon: LayoutDashboard },
    { id: 'groups', label: 'Group Channels', icon: MessageSquare },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'meetings', label: 'My Meetings', icon: Video },
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
          <div className="workspace-icon">
            {user?.workspaceName?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="workspace-info">
            <span className="workspace-title" title={user?.workspaceName || 'SAAS Nexus'}>
              {user?.workspaceName || 'SAAS Nexus'}
            </span>
            <div className="workspace-role-pill" title={isAdmin ? 'Administrator' : (user?.post || 'Team Member')}>
              <span className="workspace-role-pill-icon">{isAdmin ? '🛡️' : '💼'}</span>
              <span className="workspace-role-pill-text">{isAdmin ? 'Administrator' : (user?.post || 'Team Member')}</span>
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
                  <Icon size={18} />
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
                <Plus size={15} />
              </button>
            )}
          </div>
          <ul className="sidebar-nav-list">
            {groups.map((group) => {
              const isActive = (currentTab === 'chat' || currentTab === 'group-dashboard') && activeGroupId === group._id;
              const isLocked = group.chatPermission === 'adminOnly';
              return (
                <li
                  key={group._id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleGroupClick(group._id)}
                >
                  {isLocked ? <Lock size={16} color="#F59E0B" /> : <Hash size={16} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Current User Card in Sidebar Footer */}
      <div className="sidebar-footer" style={{ gap: '8px' }}>
        <div
          onClick={() => handleNavClick('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
            flex: 1,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 'var(--radius-md)',
            transition: 'background-color var(--transition-fast)',
          }}
          title="Open Profile & Settings"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Avatar name={user?.name} src={user?.avatar} isOnline={true} size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {user?.name}
            </span>
            <span style={{ color: '#94A3B8', fontSize: '11px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
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
          style={{ color: '#EF4444', width: '34px', height: '34px', flexShrink: 0, borderRadius: 'var(--radius-md)' }}
          title="Sign Out / Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
