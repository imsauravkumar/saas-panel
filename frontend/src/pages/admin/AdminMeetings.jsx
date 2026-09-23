import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Search,
  Filter,
  Eye,
  Edit2,
  Lock,
  Zap,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import CreateMeetingModal from '../../components/CreateMeetingModal';
import MeetingDetailModal from '../../components/MeetingDetailModal';

const TYPE_EMOJIS = {
  general: { label: 'General', emoji: '📹' },
  standup: { label: 'Standup', emoji: '⚡' },
  sync: { label: '1-on-1', emoji: '👥' },
  review: { label: 'Review', emoji: '🔍' },
  demo: { label: 'Demo', emoji: '🚀' },
  allhands: { label: 'All-Hands', emoji: '🏢' },
};

const AdminMeetings = ({ groups = [], users = [] }) => {
  const { addToast, confirm } = useNotification();
  const { socket } = useSocket();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Modals state
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
    } catch (err) {
      addToast('Failed to load meetings schedule', 'error');
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

    const handleMeetingNew = () => fetchMeetings();
    const handleMeetingUpdated = () => fetchMeetings();
    const handleMeetingCancelled = () => fetchMeetings();

    socket.on('meeting:new', handleMeetingNew);
    socket.on('meeting_created', handleMeetingNew);
    socket.on('meeting:updated', handleMeetingUpdated);
    socket.on('meeting:cancelled', handleMeetingCancelled);

    return () => {
      socket.off('meeting:new', handleMeetingNew);
      socket.off('meeting_created', handleMeetingNew);
      socket.off('meeting:updated', handleMeetingUpdated);
      socket.off('meeting:cancelled', handleMeetingCancelled);
    };
  }, [socket, fetchMeetings]);

  // Create or Edit Submit
  const handleSaveMeeting = async (formData) => {
    if (editingMeeting) {
      const { data } = await api.put(`/meetings/${editingMeeting._id}`, formData);
      if (data.success) {
        addToast('Meeting details updated & calendar synced!', 'success');
        setEditingMeeting(null);
        fetchMeetings();
      }
    } else {
      const { data } = await api.post('/meetings', formData);
      if (data.success) {
        addToast(
          formData.isInstant
            ? '⚡ Instant Google Meet call started & broadcasted to channel!'
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
        addToast('Meeting cancelled & notifications sent to attendees', 'info');
        fetchMeetings();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel meeting', 'error');
    }
  };

  // Delete Meeting
  const handleDelete = (meetingId, title) => {
    confirm({
      title: 'Delete Meeting',
      message: `Are you sure you want to permanently delete meeting "${title}"? This cannot be undone.`,
      confirmText: 'Delete Meeting',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/meetings/${meetingId}`);
          if (data.success) {
            addToast('Meeting deleted from workspace', 'success');
            fetchMeetings();
          }
        } catch (err) {
          addToast('Failed to delete meeting', 'error');
        }
      },
    });
  };

  // Copy Link
  const handleCopyLink = (meetingId, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(meetingId);
    addToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered meetings
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Google Meet & Video Syncs</h1>
          <p>
            Schedule video conferences with auto-generated Google Meet links, attendee sync, and automated channel alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: '#EA4335', borderColor: '#EA4335' }}
            onClick={() => {
              setEditingMeeting(null);
              setIsCreateOpen(true);
            }}
          >
            <Zap size={16} /> + Start or Schedule Meet
          </button>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
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
        {/* Tabs: Upcoming vs Past */}
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
              color: activeTab === 'upcoming' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'upcoming' ? 700 : 500,
            }}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Sessions
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
            Past & Cancelled
          </button>
        </div>

        {/* Search & Channel Filters */}
        <div className="filter-bar-container" style={{ flex: '1 1 280px', marginBottom: 0 }}>
          <div className="search-input-box filter-search-input">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search meetings or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select filter-select"
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
        </div>
      </div>

      {/* Meetings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '18px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
            Loading meetings calendar...
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '56px 24px', color: 'var(--color-text-muted)' }}>
            <Video size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: '#EA4335' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              No {activeTab} meetings found
            </div>
            <p style={{ fontSize: '13px', maxWidth: '360px', margin: '4px auto 16px auto' }}>
              {activeTab === 'upcoming'
                ? 'There are no upcoming Google Meet calls scheduled. Click below to start or schedule a sync.'
                : 'No past or archived meetings to show in this view.'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#EA4335', borderColor: '#EA4335' }}
                onClick={() => {
                  setEditingMeeting(null);
                  setIsCreateOpen(true);
                }}
              >
                <Zap size={14} /> Start Call Now
              </button>
            )}
          </div>
        ) : (
          filteredMeetings.map((m) => {
            const isUpcoming = m.status === 'upcoming';
            const isCancelled = m.status === 'cancelled';
            const meetDate = new Date(m.dateTime);
            const isCopied = copiedId === m._id;
            const typeInfo = TYPE_EMOJIS[m.meetingType] || TYPE_EMOJIS.general;

            return (
              <div
                key={m._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderLeft: isCancelled
                    ? '4px solid var(--color-danger)'
                    : isUpcoming
                    ? '4px solid #EA4335'
                    : '4px solid var(--color-success)',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                }}
              >
                {/* Card Top Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge
                      variant={
                        isCancelled ? 'danger' : isUpcoming ? 'primary' : 'success'
                      }
                    >
                      {m.status.toUpperCase()}
                    </Badge>

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
                        #{m.groupId?.name || 'Channel'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}
                    onClick={() => setViewingMeeting(m)}
                    title="View Full Details"
                  >
                    <Eye size={13} /> View
                  </button>
                </div>

                {/* Title & Agenda */}
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                    }}
                    onClick={() => setViewingMeeting(m)}
                  >
                    {m.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      marginTop: '4px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {m.description || 'No specific agenda description specified.'}
                  </p>
                </div>

                {/* Time & Duration Pill */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} color="var(--color-primary)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {meetDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} color="var(--color-primary)" />
                    <span>
                      {meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.durationMinutes} mins)
                    </span>
                  </div>
                </div>

                {/* Attendees Avatar Stack */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="var(--color-text-muted)" />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {m.attendeeIds?.length || 0} attendees invited
                    </span>
                  </div>

                  <div style={{ display: 'flex', marginRight: '4px' }}>
                    {(m.attendeeIds || []).slice(0, 4).map((att, i) => (
                      <div
                        key={att._id || i}
                        style={{
                          marginLeft: i > 0 ? '-8px' : '0',
                          border: '2px solid var(--color-surface)',
                          borderRadius: '50%',
                        }}
                      >
                        <Avatar name={att.name || 'User'} src={att.avatar} size="xs" />
                      </div>
                    ))}
                    {(m.attendeeIds?.length || 0) > 4 && (
                      <div
                        style={{
                          marginLeft: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-surface-alt)',
                          border: '2px solid var(--color-surface)',
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

                {/* Bottom Action Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    marginTop: 'auto',
                    gap: '8px',
                  }}
                >
                  {!isCancelled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <a
                        href={m.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{
                          backgroundColor: '#EA4335',
                          borderColor: '#EA4335',
                          flex: 1,
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12.5px',
                        }}
                      >
                        <Video size={14} /> Join Meet <ExternalLink size={11} />
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => handleCopyLink(m._id, m.googleMeetLink)}
                        title="Copy Meet Link"
                      >
                        {isCopied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--color-danger)', fontWeight: 600 }}>
                      Meeting Cancelled
                    </span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isUpcoming && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => {
                          setEditingMeeting(m);
                          setIsCreateOpen(true);
                        }}
                        title="Edit Meeting"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    {isUpcoming && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ width: '32px', height: '32px', color: 'var(--color-warning)' }}
                        onClick={() => {
                          confirm({
                            title: 'Cancel Meeting',
                            message: `Are you sure you want to cancel meeting "${m.title}"? Attendees will be notified.`,
                            confirmText: 'Cancel Meeting',
                            type: 'warning',
                            onConfirm: () => handleCancelMeeting(m._id),
                          });
                        }}
                        title="Cancel Meeting"
                      >
                        <XCircle size={14} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}
                      onClick={() => handleDelete(m._id, m.title)}
                      title="Delete Permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Meeting Modal */}
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

      {/* View Meeting Detail Modal */}
      {viewingMeeting && (
        <MeetingDetailModal
          isOpen={!!viewingMeeting}
          onClose={() => setViewingMeeting(null)}
          meeting={viewingMeeting}
          isAdmin={true}
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

export default AdminMeetings;
