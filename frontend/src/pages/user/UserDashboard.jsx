import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Video,
  CheckSquare,
  Megaphone,
  Clock,
  Calendar,
  MessageSquare,
  Sparkles,
  Pin,
  Hash,
  Bell,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/Badge';

const UserDashboard = ({ setTab, onSelectGroup }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextMeetingCountdown, setNextMeetingCountdown] = useState('');

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  // Real-time socket listeners for live dashboard updates
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchDashboardSummary();
    };

    socket.on('notification:new', handleRealtimeUpdate);
    socket.on('message:new', handleRealtimeUpdate);
    socket.on('group:updated', handleRealtimeUpdate);
    socket.on('meeting:new', handleRealtimeUpdate);
    socket.on('meeting:updated', handleRealtimeUpdate);
    socket.on('task:assigned', handleRealtimeUpdate);
    socket.on('announcement:new', handleRealtimeUpdate);

    return () => {
      socket.off('notification:new', handleRealtimeUpdate);
      socket.off('message:new', handleRealtimeUpdate);
      socket.off('group:updated', handleRealtimeUpdate);
      socket.off('meeting:new', handleRealtimeUpdate);
      socket.off('meeting:updated', handleRealtimeUpdate);
      socket.off('task:assigned', handleRealtimeUpdate);
      socket.off('announcement:new', handleRealtimeUpdate);
    };
  }, [socket, fetchDashboardSummary]);

  // Live countdown ticker for the next upcoming meeting
  const nextMeeting = summary?.nextMeeting;
  useEffect(() => {
    if (!nextMeeting || !nextMeeting.dateTime) {
      setNextMeetingCountdown('');
      return;
    }

    const updateCountdown = () => {
      const start = new Date(nextMeeting.dateTime).getTime();
      const end = start + (nextMeeting.durationMinutes || 45) * 60 * 1000;
      const now = Date.now();

      if (now >= start && now <= end) {
        setNextMeetingCountdown('🟢 Happening Right Now!');
        return;
      }
      if (now > end) {
        setNextMeetingCountdown('Concluded');
        return;
      }

      const diffMs = start - now;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        setNextMeetingCountdown(`In ${diffDays}d ${diffHours % 24}h`);
      } else if (diffHours > 0) {
        setNextMeetingCountdown(`In ${diffHours}h ${diffMins % 60}m`);
      } else {
        setNextMeetingCountdown(`In ${diffMins} mins`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [nextMeeting]);

  // Helper for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  };

  // Skeleton Loading Layout (Zero Layout Shift)
  if (loading && !summary) {
    return (
      <div className="page-container">
        {/* Header Skeleton */}
        <div
          style={{
            height: '40px',
            width: '280px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
          }}
        />
        <div
          style={{
            height: '20px',
            width: '180px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px',
          }}
        />

        {/* Stats Chips Skeleton */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '48px',
                width: '160px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          ))}
        </div>

        {/* 65/35 Grid Skeleton */}
        <div className="responsive-split">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                height: '180px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
            <div
              style={{
                height: '220px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
            <div
              style={{
                height: '200px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                height: '280px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
            <div
              style={{
                height: '280px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const {
    groupCount = 0,
    myGroups = [],
    taskCounts = { todo: 0, inprogress: 0, completed: 0, dueThisWeek: 0 },
    topTasks = [],
    recentAnnouncements = [],
    recentActivity = [],
  } = summary || {};

  return (
    <div className="page-container">
      {/* ROW 1 — Greeting & Quick Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(20px, 4.5vw, 26px)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Teammate'} 👋
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {getTodayFormatted()} • {user?.post || 'Team Member'}
          </p>
        </div>

        {/* Stat Chips Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '100%' }}>
          {/* Chip 1: Groups */}
          <div
            onClick={() => setTab('groups')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Users size={15} color="var(--color-primary)" />
            <span
              style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              {groupCount}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {groupCount === 1 ? 'Channel' : 'Channels'}
            </span>
          </div>

          {/* Chip 2: Tasks Due */}
          <div
            onClick={() => setTab('tasks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <CheckSquare size={15} color="#F59E0B" />
            <span
              style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              {taskCounts.dueThisWeek || taskCounts.todo}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Due This Week
            </span>
          </div>

          {/* Chip 3: Next Meeting */}
          {nextMeeting && (
            <div
              onClick={() => setTab('meetings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
              }}
            >
              <Video size={15} color="var(--color-primary)" />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-primary)' }}>
                {nextMeetingCountdown || 'Upcoming Meeting'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2 — Two-Column 65% / 35% Grid Layout */}
      <div className="responsive-split" style={{ alignItems: 'start' }}>
        {/* LEFT COLUMN (MAIN - 65%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Upcoming Meeting Hero Card */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              borderLeft: '4px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={17} color="var(--color-primary)" />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Next Upcoming Meeting
                </span>
              </div>
              <button
                onClick={() => setTab('meetings')}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  padding: '2px 8px',
                  height: '28px',
                  whiteSpace: 'nowrap',
                }}
              >
                View all →
              </button>
            </div>

            {nextMeeting ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    {nextMeeting.title}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} color="var(--color-text-muted)" />
                      {new Date(nextMeeting.dateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} color="var(--color-text-muted)" />
                      {nextMeeting.durationMinutes || 45} mins
                    </span>
                    {nextMeeting.groupId && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={13} color="var(--color-text-muted)" />
                        {nextMeeting.groupId.name}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    width: '100%',
                    marginTop: '4px',
                  }}
                >
                  {nextMeetingCountdown && (
                    <div
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nextMeetingCountdown}
                    </div>
                  )}

                  {nextMeeting.meetLink ? (
                    <a
                      href={nextMeeting.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{
                        gap: '6px',
                        padding: '0 16px',
                        fontWeight: 600,
                        fontSize: '13px',
                        height: '36px',
                        flex: '1 1 auto',
                        minWidth: '160px',
                        justifyContent: 'center',
                      }}
                    >
                      <Video size={15} /> Join Google Meet
                    </a>
                  ) : (
                    <button
                      onClick={() => setTab('meetings')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0 14px', height: '36px', fontSize: '13px' }}
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Designed Friendly Empty State */
              <div
                style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={20} color="#10B981" />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                    Your Schedule is Completely Clear!
                  </h4>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    No upcoming meetings scheduled for today. Take time to focus on deep work!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. My Work Snapshot (Mini-Kanban with nearest deadlines) */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  My Work Snapshot
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  Progress overview across your active deliverables
                </p>
              </div>
              <button
                onClick={() => setTab('tasks')}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  padding: '2px 8px',
                  height: '28px',
                  whiteSpace: 'nowrap',
                }}
              >
                View all tasks →
              </button>
            </div>

            {/* 3 Mini-Columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {/* To Do */}
              <div
                onClick={() => setTab('tasks')}
                style={{
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 8px',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  borderTop: '3px solid #94A3B8',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  To Do
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginTop: '2px',
                  }}
                >
                  {taskCounts.todo}
                </div>
              </div>

              {/* In Progress */}
              <div
                onClick={() => setTab('tasks')}
                style={{
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 8px',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  borderTop: '3px solid #3B82F6',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#3B82F6',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  In Progress
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginTop: '2px',
                  }}
                >
                  {taskCounts.inprogress}
                </div>
              </div>

              {/* Completed */}
              <div
                onClick={() => setTab('tasks')}
                style={{
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 8px',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  borderTop: '3px solid #10B981',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#10B981',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Completed
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginTop: '2px',
                  }}
                >
                  {taskCounts.completed}
                </div>
              </div>
            </div>

            {/* Nearest Task Items List */}
            {topTasks.length === 0 ? (
              <div
                style={{
                  padding: '20px 0',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                }}
              >
                🎉 No active tasks assigned yet — nice and clear!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topTasks.slice(0, 3).map((task) => {
                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== 'completed';
                  return (
                    <div
                      key={task._id}
                      onClick={() => setTab('tasks')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--color-surface-hover)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
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
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background:
                              task.status === 'completed'
                                ? '#10B981'
                                : task.status === 'inprogress'
                                  ? '#3B82F6'
                                  : '#94A3B8',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--color-text)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {task.deadline && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: isOverdue ? '#EF4444' : 'var(--color-text-secondary)',
                              fontWeight: isOverdue ? 600 : 400,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={12} />
                            {new Date(task.deadline).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        <Badge
                          variant={
                            task.priority === 'high'
                              ? 'danger'
                              : task.priority === 'medium'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Recent Announcements (Top 3 pinned first) */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={17} color="var(--color-primary)" />
                <h3
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  Recent Announcements
                </h3>
              </div>
              <button
                onClick={() => setTab('announcements')}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  padding: '2px 8px',
                  height: '28px',
                  whiteSpace: 'nowrap',
                }}
              >
                View all →
              </button>
            </div>

            {recentAnnouncements.length === 0 ? (
              <div
                style={{
                  padding: '24px 0',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                }}
              >
                No announcements posted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {recentAnnouncements.map((ann) => (
                  <div
                    key={ann._id}
                    onClick={() => setTab('announcements')}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      borderLeft: ann.pinned
                        ? '3px solid #F59E0B'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ann.pinned && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#F59E0B',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            <Pin size={12} /> PINNED
                          </span>
                        )}
                        <h4
                          style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}
                        >
                          {ann.title}
                        </h4>
                      </div>
                      <Badge variant={ann.scope === 'company' ? 'primary' : 'neutral'}>
                        {ann.scope === 'company'
                          ? '🌐 Company'
                          : `#${ann.groupId?.name || 'Group'}`}
                      </Badge>
                    </div>

                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px',
                        lineHeight: 1.4,
                      }}
                    >
                      {ann.body?.length > 120 ? `${ann.body.slice(0, 120)}...` : ann.body}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      <span>By {ann.createdBy?.name || 'Admin'}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(ann.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (SIDEBAR - 35%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. My Groups Compact List */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={17} color="var(--color-primary)" />
                <h3
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  My Channels
                </h3>
              </div>
              <button
                onClick={() => setTab('groups')}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  padding: '2px 8px',
                  height: '28px',
                  whiteSpace: 'nowrap',
                }}
              >
                All channels →
              </button>
            </div>

            {myGroups.length === 0 ? (
              <div
                style={{
                  padding: '20px 0',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                }}
              >
                You haven't been added to any channels yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myGroups.map((g) => {
                  const hasUnread = g.unreadCount > 0;
                  return (
                    <div
                      key={g._id}
                      onClick={() => {
                        setTab('chat');
                        if (onSelectGroup) onSelectGroup(g._id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
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
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(99, 102, 241, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                          }}
                        >
                          {g.name?.[0]?.toUpperCase() || '#'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: hasUnread ? 700 : 500,
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              #{g.name}
                            </span>
                            {hasUnread && (
                              <div
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: 'var(--color-primary)',
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: hasUnread
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-secondary)',
                              fontWeight: hasUnread ? 500 : 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px',
                            }}
                          >
                            {g.lastMessagePreview || 'No messages yet'}
                          </div>
                        </div>
                      </div>

                      {g.lastMessageAt && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            flexShrink: 0,
                            marginLeft: '8px',
                          }}
                        >
                          {formatRelativeTime(g.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Recent Activity Feed (Notifications Stream) */}
          <div
            className="card"
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={17} color="var(--color-primary)" />
                <h3
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  Recent Notifications
                </h3>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div
                style={{
                  padding: '20px 0',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                }}
              >
                No recent notifications.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentActivity.map((notif) => {
                  const getNotifIcon = (t) => {
                    switch (t) {
                      case 'meeting':
                        return <Video size={14} color="#3B82F6" />;
                      case 'task':
                        return <CheckSquare size={14} color="#10B981" />;
                      case 'announcement':
                        return <Megaphone size={14} color="#F59E0B" />;
                      default:
                        return <MessageSquare size={14} color="var(--color-primary)" />;
                    }
                  };

                  return (
                    <div
                      key={notif._id}
                      onClick={() => {
                        if (
                          notif.linkTo?.startsWith('/groups') ||
                          notif.linkTo?.startsWith('/chat')
                        ) {
                          setTab('chat');
                        } else if (notif.linkTo?.startsWith('/meetings')) {
                          setTab('meetings');
                        } else if (
                          notif.linkTo?.startsWith('/work') ||
                          notif.linkTo?.startsWith('/tasks')
                        ) {
                          setTab('tasks');
                        } else if (notif.linkTo?.startsWith('/announcements')) {
                          setTab('announcements');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {getNotifIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: notif.isRead ? 500 : 700,
                            color: 'var(--color-text)',
                          }}
                        >
                          {notif.title}
                        </div>
                        {notif.body && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {notif.body}
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-tertiary)',
                            marginTop: '2px',
                            display: 'block',
                          }}
                        >
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
