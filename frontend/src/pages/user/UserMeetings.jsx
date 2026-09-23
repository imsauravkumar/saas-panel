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
  Zap,
  Edit2,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import MeetingDetailModal from '../../components/MeetingDetailModal';
import CreateMeetingModal from '../../components/CreateMeetingModal';

const TYPE_EMOJIS = {
  general: { label: 'General', emoji: '📹' },
  standup: { label: 'Standup', emoji: '⚡' },
  sync: { label: '1-on-1', emoji: '👥' },
  review: { label: 'Review', emoji: '🔍' },
  demo: { label: 'Demo', emoji: '🚀' },
  allhands: { label: 'All-Hands', emoji: '🏢' },
};

const UserMeetings = ({ groups = [], users = [] }) => {
  const { addToast } = useNotification();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
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

  // Real-time socket sync
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

  // Create or Update meeting submit
  const handleSaveMeeting = async (formData) => {
    if (editingMeeting) {
      const { data } = await api.put(`/meetings/${editingMeeting._id}`, formData);
      if (data.success) {
        addToast('Meeting updated successfully!', 'success');
        setEditingMeeting(null);
        fetchMeetings();
      }
    } else {
      const { data } = await api.post('/meetings', formData);
      if (data.success) {
        addToast(
          formData.isInstant
            ? '⚡ Instant Google Meet call started & shared in channel!'
            : 'Meeting scheduled and Google Meet link generated!',
          'success'
        );
        fetchMeetings();
      }
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async (meetingId) => {
    try {
      const { data } = await api.patch(`/meetings/${meetingId}/cancel`);
      if (data.success) {
        addToast('Meeting cancelled', 'info');
        fetchMeetings();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel meeting', 'error');
    }
  };

  const handleCopyLink = (meetingId, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(meetingId);
    addToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMeetings = meetings.filter((m) => {
    return (
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Google Meet Video Calls</h1>
          <p>
            Join upcoming team video conferences, launch instant Google Meet sessions, or schedule
            calls with your teammates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: '#EA4335', borderColor: '#EA4335' }}
            onClick={() => {
              setEditingMeeting(null);
              setIsCreateOpen(true);
            }}
          >
            <Zap size={16} />
            <span>+ Start or Schedule Call</span>
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${activeTab === 'upcoming' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'upcoming' ? 'var(--color-surface)' : 'transparent',
              color:
                activeTab === 'upcoming' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'upcoming' ? 700 : 500,
            }}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Calls
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${activeTab === 'past' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'past' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'past' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'past' ? 700 : 500,
            }}
            onClick={() => setActiveTab('past')}
          >
            Past Sessions
          </button>
        </div>

        {/* Filter by Channel */}
        {groups.length > 0 && (
          <select
            className="form-select"
            style={{ maxWidth: '200px', fontSize: '12.5px' }}
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

        <div
          className="search-input-box"
          style={{ flex: '1 1 200px', maxWidth: '320px', minWidth: '160px' }}
        >
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search meetings by topic or channel..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-primary)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Loading Google Meet schedule...
          </div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-text-muted)',
            }}
          >
            <Video size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
            {activeTab === 'upcoming' ? 'No Upcoming Video Calls' : 'No Past Meetings'}
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              maxWidth: '420px',
              margin: '0 auto 18px',
            }}
          >
            {activeTab === 'upcoming'
              ? 'You have no scheduled Google Meet video conferences right now. Start an instant call or schedule one for your channel.'
              : 'Past video sessions and recordings will appear here.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingMeeting(null);
              setIsCreateOpen(true);
            }}
          >
            <Zap size={14} /> Start Call Now
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredMeetings.map((m) => {
            const isCancelled = m.status === 'cancelled';
            const meetDate = new Date(m.dateTime);
            const isCreator = user && (m.createdBy?._id === user.id || m.createdBy === user.id);
            const typeInfo = TYPE_EMOJIS[m.meetingType] || TYPE_EMOJIS.general;

            return (
              <div
                key={m._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  opacity: isCancelled ? 0.75 : 1,
                }}
              >
                <div>
                  {/* Card Header Top */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-surface-alt)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {typeInfo.emoji} {typeInfo.label}
                      </span>

                      {m.groupId && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                          }}
                        >
                          #{m.groupId.name}
                        </span>
                      )}
                    </div>

                    <Badge
                      variant={
                        isCancelled ? 'danger' : activeTab === 'upcoming' ? 'primary' : 'neutral'
                      }
                    >
                      {m.status?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewingMeeting(m)}
                  >
                    {m.title}
                  </h3>

                  {m.description && (
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '12px',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {m.description}
                    </p>
                  )}

                  {/* Date & Time Info */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <Calendar size={14} color="var(--color-primary)" />
                      <span>
                        {meetDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <Clock size={14} color="var(--color-primary)" />
                      <span>
                        {meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                        {m.durationMinutes} mins)
                      </span>
                    </div>

                    {m.attendeeIds && m.attendeeIds.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <Users size={14} />
                        <span>{m.attendeeIds.length} invited attendees</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    marginTop: '6px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setViewingMeeting(m)}
                      title="View full details"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <Eye size={14} />
                    </button>

                    {!isCancelled && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCopyLink(m._id, m.googleMeetLink)}
                        title="Copy Google Meet Link"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        {copiedId === m._id ? (
                          <Check size={14} color="var(--color-success)" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}

                    {isCreator && !isCancelled && activeTab === 'upcoming' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingMeeting(m);
                          setIsCreateOpen(true);
                        }}
                        title="Edit Meeting"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>

                  {!isCancelled && (
                    <a
                      href={m.googleMeetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{
                        backgroundColor: '#EA4335',
                        borderColor: '#EA4335',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '5px 12px',
                      }}
                    >
                      <Video size={13} /> Join Meet <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <CreateMeetingModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingMeeting(null);
          }}
          onSubmit={handleSaveMeeting}
          initialData={editingMeeting}
          groups={groups}
          allUsers={users}
        />
      )}

      {/* Details View Modal */}
      {viewingMeeting && (
        <MeetingDetailModal
          isOpen={!!viewingMeeting}
          onClose={() => setViewingMeeting(null)}
          meeting={viewingMeeting}
          currentUserId={user?.id}
          onEdit={(m) => {
            setViewingMeeting(null);
            setEditingMeeting(m);
            setIsCreateOpen(true);
          }}
          onCancel={handleCancelMeeting}
        />
      )}
    </div>
  );
};

export default UserMeetings;
