import { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  Search,
  Copy,
  Check,
  Eye,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import MeetingDetailModal from '../../components/MeetingDetailModal';
import { TYPE_METADATA, formatMeetingDateTime, getMeetingCountdown } from '../../utils/meetingUtils';

const UserMeetings = ({ groups = [] }) => {
  const { addToast } = useNotification();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Modals & clipboard
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedGroupId) params.groupId = selectedGroupId;
      if (activeTab === 'upcoming') params.status = 'upcoming';
      if (activeTab === 'past') params.status = 'past';

      const queryStr = new URLSearchParams(params).toString();
      const { data } = await api.get(`/meetings${queryStr ? '?' + queryStr : ''}`);
      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (_err) {
      addToast('Failed to load your meetings', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedGroupId, addToast]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Socket real-time sync
  useEffect(() => {
    if (!socket) return;

    const handleMeetingEvent = () => fetchMeetings();
    socket.on('meeting:new', handleMeetingEvent);
    socket.on('meeting_created', handleMeetingEvent);
    socket.on('meeting:updated', handleMeetingEvent);
    socket.on('meeting:cancelled', handleMeetingEvent);

    return () => {
      socket.off('meeting:new', handleMeetingEvent);
      socket.off('meeting_created', handleMeetingEvent);
      socket.off('meeting:updated', handleMeetingEvent);
      socket.off('meeting:cancelled', handleMeetingEvent);
    };
  }, [socket, fetchMeetings]);

  const handleCopyLink = (meetingId, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(meetingId);
    addToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMeetings = meetings.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.groupId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Meetings</h1>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="filter-bar-container" style={{ justifyContent: 'space-between' }}>
        <div className="segmented-pill-tabs">
          <button
            type="button"
            className={`segmented-pill-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Calls
          </button>
          <button
            type="button"
            className={`segmented-pill-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Sessions
          </button>
        </div>

        {/* Filter by Channel & Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: '1 1 300px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div className="search-input-box" style={{ flex: '1 1 180px', maxWidth: '280px' }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {groups.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '130px', fontSize: '12.5px' }}
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">All Channels</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  #{g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        /* Loading Skeleton */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                height: '210px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: 0.6,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              <div style={{ height: '20px', width: '40%', background: 'var(--color-surface-hover)', borderRadius: '4px' }} />
              <div style={{ height: '24px', width: '75%', background: 'var(--color-surface-hover)', borderRadius: '4px' }} />
              <div style={{ height: '38px', width: '100%', background: 'var(--color-surface-hover)', borderRadius: '4px', marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '56px 20px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-primary)',
            }}
          >
            <Video size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
            {activeTab === 'upcoming' ? 'No Upcoming Video Calls' : 'No Past Meetings'}
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              maxWidth: '380px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            {activeTab === 'upcoming'
              ? 'You have no scheduled Google Meet video conferences right now. When an admin schedules a meeting for your team, it will appear here.'
              : 'Past video sessions will be listed here once concluded.'}
          </p>
        </div>
      ) : (
        /* Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '16px',
          }}
        >
          {filteredMeetings.map((m) => {
            const isCancelled = m.status === 'cancelled';
            const isCompleted = m.status === 'completed';
            const isUpcoming = m.status === 'upcoming';
            const typeInfo = TYPE_METADATA[m.meetingType] || TYPE_METADATA.general;
            const { formattedDate, formattedTime, timeZone } = formatMeetingDateTime(m.dateTime);
            const countdown = getMeetingCountdown(m.dateTime, m.durationMinutes || 30);
            const meetUrl = m.googleMeetLink || m.meetLink;
            const isDemo = m.isDemoLink || m.provider === 'demo';
            const isCopied = copiedId === m._id;

            return (
              <div
                key={m._id}
                className={`meeting-card ${isCancelled ? 'is-cancelled' : ''} ${countdown.isLive ? 'is-live' : ''}`}
              >
                {/* Header Meta */}
                <div className="meeting-card-header">
                  <div className="meeting-card-header-left">
                    {isCancelled ? (
                      <span className="meeting-status-chip cancelled">
                        <span className="task-priority-dot" style={{ background: '#DC2626' }} /> Cancelled
                      </span>
                    ) : countdown.isLive ? (
                      <span className="meeting-status-chip live">
                        <span className="task-priority-dot" style={{ background: '#059669', boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.25)' }} /> Live Now
                      </span>
                    ) : isUpcoming ? (
                      <span className="meeting-status-chip upcoming">
                        <span className="task-priority-dot" style={{ background: '#2563EB' }} /> Upcoming
                      </span>
                    ) : (
                      <span className="meeting-status-chip completed">
                        <span className="task-priority-dot" style={{ background: '#94A3B8' }} /> Completed
                      </span>
                    )}

                    <span className="task-priority-chip low">
                      {typeInfo.emoji} {typeInfo.label}
                    </span>

                    {m.groupId && (
                      <span className="task-group-pill">
                        #{typeof m.groupId === 'object' ? m.groupId.name : m.groupId}
                      </span>
                    )}

                    {isDemo && (
                      <span className="task-priority-chip high">
                        Demo Link
                      </span>
                    )}
                  </div>

                  <div className="meeting-card-header-right">
                    <button
                      type="button"
                      className="task-card-quick-btn"
                      onClick={() => setViewingMeeting(m)}
                      title="View Details"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>

                {/* Cancelled Alert Banner */}
                {isCancelled && (
                  <div className="task-card-banner danger">
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>Cancelled: {m.cancelReason || 'Meeting was cancelled by organizer.'}</span>
                  </div>
                )}

                {/* Title & Description */}
                <div>
                  <h3
                    className="meeting-title"
                    style={{ textDecoration: isCancelled ? 'line-through' : 'none', opacity: isCancelled ? 0.75 : 1 }}
                    onClick={() => setViewingMeeting(m)}
                  >
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="meeting-desc" style={{ marginTop: '3px' }}>
                      {m.description}
                    </p>
                  )}
                </div>

                {/* Localized Date & Time Box */}
                <div className="meeting-schedule-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--color-primary)" />
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formattedDate}</span>
                    </div>
                    {isUpcoming && countdown.text && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: countdown.isLive ? '#059669' : 'var(--color-primary)',
                        }}
                      >
                        {countdown.text}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <Clock size={13} color="var(--color-primary)" />
                    <span>
                      {formattedTime} <strong style={{ color: 'var(--color-text-muted)' }}>{timeZone}</strong> ({m.durationMinutes || 30} mins)
                    </span>
                  </div>
                </div>

                {/* Attendees */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <Users size={13} color="var(--color-text-muted)" />
                    <span>{m.attendeeIds?.length || 0} attendees</span>
                  </div>

                  <div className="task-card-avatars">
                    {(m.attendeeIds || []).slice(0, 4).map((att, i) => (
                      <div
                        key={att._id || i}
                        className="task-card-avatar-item"
                        title={att.name}
                      >
                        <Avatar name={att.name || 'User'} src={att.avatar} size="xs" />
                      </div>
                    ))}
                    {(m.attendeeIds?.length || 0) > 4 && (
                      <div
                        className="task-card-avatar-item"
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: 'var(--color-surface-alt)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        +{m.attendeeIds.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Join Actions */}
                <div className="meeting-card-footer">
                  {!isCancelled && meetUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <a
                        href={meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '12px',
                          height: '32px',
                          borderRadius: '8px',
                        }}
                      >
                        <Video size={13} /> Join Meet <ExternalLink size={11} />
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                        onClick={() => handleCopyLink(m._id, meetUrl)}
                        title="Copy Meet Link"
                      >
                        {isCopied ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                      </button>
                    </div>
                  ) : isCancelled ? (
                    <span style={{ fontSize: '11.5px', color: 'var(--color-danger)', fontWeight: 600 }}>
                      Meeting Cancelled
                    </span>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                      No link available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {viewingMeeting && (
        <MeetingDetailModal
          isOpen={!!viewingMeeting}
          onClose={() => setViewingMeeting(null)}
          meeting={viewingMeeting}
          currentUserId={user?.id}
          isAdmin={false}
        />
      )}
    </div>
  );
};

export default UserMeetings;
