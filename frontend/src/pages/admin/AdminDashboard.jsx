import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  CheckSquare,
  Video,
  Activity,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  Calendar,
  Megaphone,
  Shield,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';

const AdminDashboard = ({
  setTab,
  onOpenCreateUser,
  onOpenCreateGroup,
  onOpenCreateTask,
  onOpenCreateMeeting,
  onOpenCreateAnnouncement,
}) => {
  const { user } = useAuth();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={28} color="var(--color-primary)" />
            Admin Command Center
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Workspace oversight, team directory, channels, and security controls
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={onOpenCreateUser}>
            <Plus size={16} /> Add Team Member
          </button>
        </div>
      </div>

      {/* Row 1 — Quick Stats Row */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        {/* Total Users */}
        <div
          onClick={() => setTab('users')}
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'transform var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
              {summary?.userCount || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Active Members
            </div>
          </div>
        </div>

        {/* Active Groups */}
        <div
          onClick={() => setTab('groups')}
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
            }}
          >
            <MessageSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
              {summary?.activeGroupCount || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Active Channels
            </div>
          </div>
        </div>

        {/* Tasks in Progress */}
        <div
          onClick={() => setTab('tasks')}
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B',
            }}
          >
            <CheckSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
              {summary?.tasksInProgressCount || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Tasks in Progress
            </div>
          </div>
        </div>

        {/* Meetings this week */}
        <div
          onClick={() => setTab('meetings')}
          className="card"
          style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <Video size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
              {summary?.meetingsThisWeekCount || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Meetings This Week
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — Main Grid: Company-wide Activity Feed (65%) + Quick Actions Panel (35%) */}
      <div className="responsive-split">
        {/* Left Column: Live Company Activity Stream */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                Live Workspace Activity Feed
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Real-time audit log of team and administrative events
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab('activity')}>
              Full audit log →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading audit feed...
            </div>
          ) : summary?.recentActivity?.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No recorded events yet in this workspace.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary?.recentActivity?.map((log) => (
                <div
                  key={log._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <Avatar name={log.actorId?.name || 'Admin'} src={log.actorId?.avatar} size="xs" />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {log.actorId?.name || 'System Administrator'}
                      </span>{' '}
                      <span style={{ color: 'var(--color-text-secondary)' }}>{log.details || log.action}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: '12px' }}>
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions Shortcuts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
              Quick Action Shortcuts
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Direct access to create and dispatch workspace resources
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Shortcut 1: Add User */}
              <div
                onClick={onOpenCreateUser}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Users size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
                    Create Team Member
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Provision credentials & assign corporate role
                  </div>
                </div>
                <Plus size={16} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 2: Create Group */}
              <div
                onClick={onOpenCreateGroup}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
                    Create Channel
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Set up a new team space with chat permissions
                  </div>
                </div>
                <Plus size={16} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 3: Schedule Meeting */}
              <div
                onClick={onOpenCreateMeeting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                  }}
                >
                  <Video size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
                    Schedule Google Meet
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Auto-generate Google Meet link & notify team
                  </div>
                </div>
                <Plus size={16} color="var(--color-text-tertiary)" />
              </div>

              {/* Shortcut 4: Post Announcement */}
              <div
                onClick={onOpenCreateAnnouncement}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                  }}
                >
                  <Megaphone size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
                    Post Announcement
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Company bulletin or pinned channel announcement
                  </div>
                </div>
                <Plus size={16} color="var(--color-text-tertiary)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
