import { useState, useEffect } from 'react';
import { Users, MessageSquare, CheckSquare, Video, Plus, Megaphone, Shield, Clock } from 'lucide-react';
import api from '../../services/api';
import Avatar from '../../components/Avatar';

const AdminDashboard = ({
  setTab,
  onOpenCreateUser,
  onOpenCreateGroup,
  onOpenCreateTask: _onOpenCreateTask,
  onOpenCreateMeeting,
  onOpenCreateAnnouncement,
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminSummary = async () => {
      try {
        const res = await api.get('/dashboard/admin-summary');
        if (res.data.success) {
          setSummary(res.data.summary);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminSummary();
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0,
            }}
          >
            <Shield size={20} color="var(--color-primary)" />
            Admin Panel
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateUser}>
            <Plus size={14} /> Add Team Member
          </button>
        </div>
      </div>

      {/* Review Queue Alert */}
      {summary?.tasksAwaitingReviewCount > 0 && (
        <div
          onClick={() => setTab('tasks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F59E0B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} color="#D97706" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-text)' }}>
                {summary.tasksAwaitingReviewCount} Task{summary.tasksAwaitingReviewCount > 1 ? 's' : ''} Awaiting Review
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Team members submitted task deliverables ready for your verification and approval.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{
              background: '#D97706',
              borderColor: '#B45309',
              fontSize: '12px',
              padding: '5px 12px',
              whiteSpace: 'nowrap',
            }}
          >
            Review Tasks →
          </button>
        </div>
      )}

      {/* Row 1 — Quick Stats Row */}
      <div className="stat-grid" style={{ marginBottom: '16px' }}>
        {/* Total Users */}
        <div onClick={() => setTab('users')} className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)' }}>
            <Users size={18} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="stat-val">{summary?.userCount || 0}</div>
            <div className="stat-lbl">Active Members</div>
          </div>
        </div>

        {/* Active Groups */}
        <div onClick={() => setTab('groups')} className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
            <MessageSquare size={18} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="stat-val">{summary?.activeGroupCount || 0}</div>
            <div className="stat-lbl">Active Channels</div>
          </div>
        </div>

        {/* Tasks in Progress & Pending Review */}
        <div onClick={() => setTab('tasks')} className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
            <CheckSquare size={18} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="stat-val">
              {summary?.tasksInProgressCount || 0}
              {summary?.tasksAwaitingReviewCount > 0 && (
                <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 500, marginLeft: '6px' }}>
                  ({summary.tasksAwaitingReviewCount} review)
                </span>
              )}
            </div>
            <div className="stat-lbl">In Progress Tasks</div>
          </div>
        </div>

        {/* Meetings this week */}
        <div onClick={() => setTab('meetings')} className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <Video size={18} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="stat-val">{summary?.meetingsThisWeekCount || 0}</div>
            <div className="stat-lbl">Meetings This Week</div>
          </div>
        </div>
      </div>

      {/* Row 2 — Main Grid: Company-wide Activity Feed (65%) + Quick Actions Panel (35%) */}
      <div className="responsive-split" style={{ gap: '16px' }}>
        {/* Left Column: Live Company Activity Stream */}
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                Live Workspace Activity Feed
              </h3>
              <p
                style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px', margin: 0 }}
              >
                Real-time audit log of team and administrative events
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '11.5px', padding: '4px 8px' }} onClick={() => setTab('activity')}>
              Full audit log →
            </button>
          </div>

          {loading ? (
            <div
              style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}
            >
              Loading audit feed...
            </div>
          ) : summary?.recentActivity?.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '12.5px',
              }}
            >
              No recorded events yet in this workspace.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summary?.recentActivity?.map((log) => (
                <div
                  key={log._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    fontSize: '12.5px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Avatar
                      name={log.actorId?.name || 'Admin'}
                      src={log.actorId?.avatar}
                      size="xs"
                    />
                    <div style={{ minWidth: 0, flex: 1, fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {log.actorId?.name || 'System Administrator'}
                      </span>{' '}
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {log.details || log.action}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--color-text-tertiary)',
                      flexShrink: 0,
                      marginLeft: '10px',
                    }}
                  >
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions Shortcuts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '4px',
                margin: 0,
              }}
            >
              Quick Action Shortcuts
            </h3>
            <p
              style={{
                fontSize: '11.5px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
                marginTop: '2px',
              }}
            >
              Direct access to create and dispatch workspace resources
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Shortcut 1: Add User */}
              <div
                onClick={onOpenCreateUser}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}
                >
                  <Users size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '12.5px' }}>
                    Create Team Member
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Provision credentials & assign corporate role
                  </div>
                </div>
                <Plus size={14} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 2: Create Group */}
              <div
                onClick={onOpenCreateGroup}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '12.5px' }}>
                    Create Channel
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Set up a new team space with chat permissions
                  </div>
                </div>
                <Plus size={14} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 3: Schedule Meeting */}
              <div
                onClick={onOpenCreateMeeting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                    flexShrink: 0,
                  }}
                >
                  <Video size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '12.5px' }}>
                    Schedule Google Meet
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Auto-generate Google Meet link & notify team
                  </div>
                </div>
                <Plus size={14} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 4: Post Announcement */}
              <div
                onClick={onOpenCreateAnnouncement}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    flexShrink: 0,
                  }}
                >
                  <Megaphone size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '12.5px' }}>
                    Post Announcement
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Company bulletin or pinned channel announcement
                  </div>
                </div>
                <Plus size={14} color="var(--color-text-tertiary)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
