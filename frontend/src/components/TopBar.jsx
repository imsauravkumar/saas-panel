import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckSquare,
  Megaphone,
  MessageSquare,
  Menu,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Avatar from './Avatar';
import NotificationPreferencesModal from './NotificationPreferencesModal';

const TopBar = ({
  currentTab,
  searchTerm: _searchTerm,
  setSearchTerm: _setSearchTerm,
  onToggleTheme: _onToggleTheme,
  isDarkTheme: _isDarkTheme,
  onNavigateTab = null,
  onToggleMobileSidebar,
}) => {
  const { user } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
    useNotification();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch when opened
  const handleToggleDropdown = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      fetchNotifications(filterUnread);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markAsRead(n._id);
    }
    setShowNotifications(false);
    if (onNavigateTab && n.linkTo) {
      onNavigateTab(n.linkTo);
    }
  };

  // Group notifications into Today vs Earlier
  const todayDateStr = new Date().toDateString();
  const displayedNotifications = filterUnread
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const todayNotifications = displayedNotifications.filter(
    (n) => new Date(n.createdAt).toDateString() === todayDateStr
  );
  const earlierNotifications = displayedNotifications.filter(
    (n) => new Date(n.createdAt).toDateString() !== todayDateStr
  );

  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting':
        return <Calendar size={15} color="var(--color-accent)" />;
      case 'task':
        return <CheckSquare size={15} color="var(--color-success)" />;
      case 'announcement':
        return <Megaphone size={15} color="var(--color-primary)" />;
      default:
        return <MessageSquare size={15} color="var(--color-warning)" />;
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="btn btn-ghost btn-icon mobile-nav-toggle"
            title="Toggle Menu"
            style={{ width: '36px', height: '36px' }}
          >
            <Menu size={20} />
          </button>
        )}

        <div className="topbar-company-badge" title={user?.workspaceName || 'SAAS Nexus'}>
          <span className="topbar-company-name">{user?.workspaceName || 'SAAS Nexus'}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notification Center Bell Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={handleToggleDropdown}
            className="btn btn-ghost btn-icon"
            style={{ width: '36px', height: '36px', position: 'relative' }}
            title="Notification Center"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-danger)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown-panel">
              {/* Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-primary-soft)',
                        color: 'var(--color-primary)',
                        padding: '1px 7px',
                        borderRadius: '10px',
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={markAllAsRead}
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} /> Mark read
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    style={{ width: '28px', height: '28px' }}
                    onClick={() => {
                      setShowNotifications(false);
                      setShowPrefsModal(true);
                    }}
                    title="Notification Settings"
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs / Filter Row */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '4px 8px',
                  gap: '6px',
                }}
              >
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm ${!filterUnread ? 'active' : ''}`}
                  style={{
                    padding: '3px 10px',
                    fontSize: '12px',
                    backgroundColor: !filterUnread ? 'var(--color-surface)' : 'transparent',
                    fontWeight: !filterUnread ? 700 : 500,
                  }}
                  onClick={() => {
                    setFilterUnread(false);
                    fetchNotifications(false);
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm ${filterUnread ? 'active' : ''}`}
                  style={{
                    padding: '3px 10px',
                    fontSize: '12px',
                    backgroundColor: filterUnread ? 'var(--color-surface)' : 'transparent',
                    fontWeight: filterUnread ? 700 : 500,
                  }}
                  onClick={() => {
                    setFilterUnread(true);
                    fetchNotifications(true);
                  }}
                >
                  Unread Only
                </button>
              </div>

              {/* Notifications List */}
              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {displayedNotifications.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 16px',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    <Bell size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <div>No {filterUnread ? 'unread ' : ''}notifications</div>
                  </div>
                ) : (
                  <>
                    {/* Today Group */}
                    {todayNotifications.length > 0 && (
                      <div>
                        <div
                          style={{
                            padding: '8px 16px 4px 16px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Today
                        </div>
                        {todayNotifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--color-border)',
                              backgroundColor: n.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
                              transition: 'background-color 120ms ease',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = n.isRead
                                ? 'transparent'
                                : 'rgba(79, 70, 229, 0.05)')
                            }
                          >
                            <div style={{ marginTop: '2px' }}>{getTypeIcon(n.type)}</div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: n.isRead ? 500 : 700,
                                  color: 'var(--color-text-primary)',
                                  lineHeight: 1.3,
                                }}
                              >
                                {n.title}
                              </div>
                              {n.body && (
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--color-text-secondary)',
                                    marginTop: '2px',
                                    lineHeight: 1.3,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {n.body}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--color-text-muted)',
                                  marginTop: '4px',
                                }}
                              >
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            {!n.isRead && (
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary)',
                                  marginTop: '6px',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Earlier Group */}
                    {earlierNotifications.length > 0 && (
                      <div>
                        <div
                          style={{
                            padding: '8px 16px 4px 16px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Earlier
                        </div>
                        {earlierNotifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--color-border)',
                              backgroundColor: n.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
                              transition: 'background-color 120ms ease',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = n.isRead
                                ? 'transparent'
                                : 'rgba(79, 70, 229, 0.05)')
                            }
                          >
                            <div style={{ marginTop: '2px' }}>{getTypeIcon(n.type)}</div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: n.isRead ? 500 : 700,
                                  color: 'var(--color-text-primary)',
                                  lineHeight: 1.3,
                                }}
                              >
                                {n.title}
                              </div>
                              {n.body && (
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--color-text-secondary)',
                                    marginTop: '2px',
                                    lineHeight: 1.3,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {n.body}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--color-text-muted)',
                                  marginTop: '4px',
                                }}
                              >
                                {new Date(n.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </div>
                            {!n.isRead && (
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary)',
                                  marginTop: '6px',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Avatar & Profile Badge (Click to open Profile & Settings) */}
        <div
          className="topbar-user-badge"
          onClick={() => onNavigateTab && onNavigateTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '8px',
            borderLeft: '1px solid var(--color-border)',
            flexShrink: 0,
            minWidth: 0,
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 6px',
            backgroundColor: currentTab === 'settings' ? 'var(--color-surface-alt)' : 'transparent',
            transition: 'background-color var(--transition-fast)',
          }}
          title="Open Profile & Settings"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-alt)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor =
              currentTab === 'settings' ? 'var(--color-surface-alt)' : 'transparent')
          }
        >
          <Avatar name={user?.name} src={user?.avatar} size="md" isOnline={true} />
          <div
            className="topbar-user-info"
            style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px',
              }}
            >
              {user?.name}
            </span>
            <span
              className="user-subtext"
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px',
              }}
            >
              {user?.post || (user?.role === 'admin' ? 'Administrator' : 'Team Member')}
            </span>
          </div>
        </div>
      </div>

      {/* Notification Preferences Modal */}
      {showPrefsModal && (
        <NotificationPreferencesModal
          isOpen={showPrefsModal}
          onClose={() => setShowPrefsModal(false)}
        />
      )}
    </header>
  );
};

export default TopBar;
