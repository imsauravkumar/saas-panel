import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { useNotification } from './context/NotificationContext';
import api from './services/api';

// Components
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Auth Pages
import AuthPage from './pages/auth/AuthPage';
import FirstLoginReset from './pages/auth/FirstLoginReset';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGroups from './pages/admin/AdminGroups';
import AdminTasks from './pages/admin/AdminTasks';
import AdminMeetings from './pages/admin/AdminMeetings';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminActivityLogs from './pages/admin/AdminActivityLogs';
import AdminSettings from './pages/admin/AdminSettings';

// User Pages
import UserDashboard from './pages/user/UserDashboard';
import UserGroups from './pages/user/UserGroups';
import UserTasks from './pages/user/UserTasks';
import UserMeetings from './pages/user/UserMeetings';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserProfile from './pages/user/UserProfile';

// Shared Pages
import GroupDashboard from './pages/shared/GroupDashboard';
import GroupChat from './pages/shared/GroupChat';
import FilesLibrary from './pages/shared/FilesLibrary';
import SettingsPage from './pages/shared/SettingsPage';

function App() {
  const { user, loading, isAdmin } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useNotification();

  const getInitialTab = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      if (hash.startsWith('chat/')) return 'chat';
      return hash;
    }
    return localStorage.getItem('nexus_current_tab') || 'dashboard';
  };

  const getInitialGroupId = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && hash.startsWith('chat/')) {
      return hash.replace('chat/', '');
    }
    return localStorage.getItem('nexus_active_group_id') || null;
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [activeGroupId, setActiveGroupId] = useState(getInitialGroupId);
  const [selectedDashboardGroupId, setSelectedDashboardGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return localStorage.getItem('nexus_theme') === 'dark';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync active tab to URL hash and localStorage
  useEffect(() => {
    if (activeGroupId && currentTab === 'chat') {
      window.location.hash = `chat/${activeGroupId}`;
      localStorage.setItem('nexus_active_group_id', activeGroupId);
      localStorage.setItem('nexus_current_tab', 'chat');
    } else if (currentTab) {
      window.location.hash = currentTab;
      localStorage.setItem('nexus_current_tab', currentTab);
      if (currentTab !== 'chat') {
        localStorage.removeItem('nexus_active_group_id');
      }
    }

    // Always reset page container scroll to top on tab change
    const pageEl = document.querySelector('.page-container');
    if (pageEl) {
      pageEl.scrollTop = 0;
    }
  }, [currentTab, activeGroupId]);

  // Listen to browser forward/back hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('chat/')) {
        const gId = hash.replace('chat/', '');
        setActiveGroupId(gId);
        setCurrentTab('chat');
      } else if (hash) {
        if (hash !== 'chat') setActiveGroupId(null);
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Theme Toggler
  const toggleTheme = () => {
    const nextTheme = !isDarkTheme;
    setIsDarkTheme(nextTheme);
    localStorage.setItem('nexus_theme', nextTheme ? 'dark' : 'light');
    if (nextTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Restore theme on mount
  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkTheme]);

  // Load Groups and Users when logged in
  const fetchWorkspaceData = useCallback(async () => {
    if (!user) return;
    try {
      const [groupsRes, announceRes] = await Promise.all([
        api.get('/groups'),
        api.get('/announcements'),
      ]);

      if (groupsRes.data.success) {
        setGroups(groupsRes.data.groups);
      }
      if (announceRes.data.success) {
        setAnnouncements(announceRes.data.announcements);
      }

      if (isAdmin) {
        const usersRes = await api.get('/users?limit=100');
        if (usersRes.data.success) {
          setUsers(usersRes.data.users);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch initial workspace channels:', err);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // Real-time group list synchronization
  useEffect(() => {
    if (!socket) return;

    const handleGroupCreated = () => fetchWorkspaceData();
    const handleGroupUpdated = () => fetchWorkspaceData();
    const handleGroupListUpdated = () => fetchWorkspaceData();

    const handleMeetingNew = (meeting) => {
      const channelName = meeting.groupId?.name ? ` in #${meeting.groupId.name}` : '';
      const meetTime = new Date(meeting.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addToast(`📅 New meeting "${meeting.title}" scheduled for ${meetTime}${channelName}`, 'info', 6000);
    };

    const handleMeetingUpdated = (meeting) => {
      addToast(`📅 Meeting "${meeting.title}" has been updated`, 'info', 5000);
    };

    const handleMeetingCancelled = ({ title }) => {
      addToast(`🚫 Meeting "${title || 'Scheduled Sync'}" was cancelled`, 'warning', 5000);
    };

    const handleTaskAssigned = (task) => {
      const deadlineStr = new Date(task.deadline).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      addToast(`📋 New task assigned: "${task.title}" — due ${deadlineStr}`, 'info', 6000);
    };

    const handleTaskStatusChanged = ({ task, changedBy, status }) => {
      if (isAdmin && changedBy?._id !== user?.id) {
        addToast(`✅ ${changedBy?.name || 'Teammate'} moved "${task?.title || 'Task'}" to ${status.toUpperCase()}`, 'info', 4500);
      }
    };

    socket.on('group:created', handleGroupCreated);
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:listUpdated', handleGroupListUpdated);
    socket.on('meeting:new', handleMeetingNew);
    socket.on('meeting:updated', handleMeetingUpdated);
    socket.on('meeting:cancelled', handleMeetingCancelled);
    socket.on('task:assigned', handleTaskAssigned);
    socket.on('task:statusChanged', handleTaskStatusChanged);

    return () => {
      socket.off('group:created', handleGroupCreated);
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:listUpdated', handleGroupListUpdated);
      socket.off('meeting:new', handleMeetingNew);
      socket.off('meeting:updated', handleMeetingUpdated);
      socket.off('meeting:cancelled', handleMeetingCancelled);
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('task:statusChanged', handleTaskStatusChanged);
    };
  }, [socket, fetchWorkspaceData, addToast, isAdmin, user?.id]);

  // Loading Screen
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        gap: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Loading SAAS Nexus Workspace...
        </div>
      </div>
    );
  }

  // Not Logged In -> Auth View
  if (!user) {
    return <AuthPage />;
  }

  // First Login Mandatory Password Reset (Only for provisioned team members)
  if (user && user.role !== 'admin' && (user.mustResetPassword || user.mustChangePassword)) {
    return <FirstLoginReset />;
  }

  return (
    <div className="app-container">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Slack-style Fixed / Responsive Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'chat' && tab !== 'group-dashboard') {
            setActiveGroupId(null);
            setSelectedDashboardGroupId(null);
          }
        }}
        groups={groups}
        activeGroupId={activeGroupId || selectedDashboardGroupId}
        onSelectGroup={(groupId) => {
          if (groupId) {
            setSelectedDashboardGroupId(null);
            setActiveGroupId(groupId);
            setCurrentTab('chat');
          } else {
            setActiveGroupId(null);
            setSelectedDashboardGroupId(null);
          }
        }}
        onOpenCreateGroup={isAdmin ? () => setCurrentTab('groups') : null}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="main-wrapper">
        <TopBar
          currentTab={currentTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onToggleTheme={toggleTheme}
          isDarkTheme={isDarkTheme}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Tab Router Switch */}
        {selectedDashboardGroupId && currentTab === 'group-dashboard' ? (
          <GroupDashboard
            groupId={selectedDashboardGroupId}
            onBack={() => {
              setSelectedDashboardGroupId(null);
              setCurrentTab('groups');
            }}
            onGroupDeleted={(deletedId) => {
              setSelectedDashboardGroupId(null);
              setGroups((prev) => prev.filter((g) => g._id !== deletedId));
              setCurrentTab('groups');
            }}
            allUsers={users}
          />
        ) : isAdmin ? (
          <>
            {currentTab === 'dashboard' && (
              <AdminDashboard
                setTab={setCurrentTab}
                onOpenCreateUser={() => setCurrentTab('users')}
                onOpenCreateGroup={() => setCurrentTab('groups')}
                onOpenCreateTask={() => setCurrentTab('tasks')}
                onOpenCreateMeeting={() => setCurrentTab('meetings')}
                onOpenCreateAnnouncement={() => setCurrentTab('announcements')}
              />
            )}
            {currentTab === 'users' && <AdminUsers groups={groups} />}
            {currentTab === 'groups' && (
              <AdminGroups
                groups={groups}
                users={users}
                fetchGroups={fetchWorkspaceData}
                onSelectGroupDashboard={(groupId) => {
                  setSelectedDashboardGroupId(groupId);
                  setCurrentTab('group-dashboard');
                }}
              />
            )}
            {currentTab === 'tasks' && <AdminTasks users={users} groups={groups} />}
            {currentTab === 'meetings' && <AdminMeetings groups={groups} users={users} />}
            {currentTab === 'files' && (
              <FilesLibrary
                groups={groups}
                onSelectGroup={(groupId) => {
                  setSelectedDashboardGroupId(groupId);
                  setCurrentTab('group-dashboard');
                }}
              />
            )}
            {currentTab === 'announcements' && <AdminAnnouncements groups={groups} />}
            {currentTab === 'activity' && <AdminActivityLogs />}
            {currentTab === 'settings' && (
              <SettingsPage isDarkTheme={isDarkTheme} onToggleTheme={toggleTheme} />
            )}
            {currentTab === 'chat' && (
              <GroupChat
                groups={groups}
                activeGroupId={activeGroupId}
                onSelectGroup={setActiveGroupId}
                allUsers={users}
              />
            )}
          </>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <UserDashboard
                setTab={setCurrentTab}
                onSelectGroup={(groupId) => {
                  setSelectedDashboardGroupId(groupId);
                  setCurrentTab('group-dashboard');
                }}
              />
            )}
            {currentTab === 'groups' && (
              <UserGroups
                groups={groups}
                onSelectGroupDashboard={(groupId) => {
                  setSelectedDashboardGroupId(groupId);
                  setCurrentTab('group-dashboard');
                }}
              />
            )}
            {currentTab === 'tasks' && <UserTasks />}
            {currentTab === 'meetings' && <UserMeetings groups={groups} users={users} />}
            {currentTab === 'files' && (
              <FilesLibrary
                groups={groups}
                onSelectGroup={(groupId) => {
                  setSelectedDashboardGroupId(groupId);
                  setCurrentTab('group-dashboard');
                }}
              />
            )}
            {currentTab === 'announcements' && <UserAnnouncements />}
            {(currentTab === 'settings' || currentTab === 'profile') && (
              <SettingsPage isDarkTheme={isDarkTheme} onToggleTheme={toggleTheme} />
            )}
            {currentTab === 'chat' && (
              <GroupChat
                groups={groups}
                activeGroupId={activeGroupId}
                onSelectGroup={setActiveGroupId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
