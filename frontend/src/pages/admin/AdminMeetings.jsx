import { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  Trash2,
  XCircle,
  Copy,
  Check,
  Search,
  Eye,
  Edit2,
  Plus,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import CreateMeetingModal from '../../components/CreateMeetingModal';
import MeetingDetailModal from '../../components/MeetingDetailModal';
import { TYPE_METADATA, formatMeetingDateTime, getMeetingCountdown } from '../../utils/meetingUtils';

const AdminMeetings = ({ groups = [], users = [] }) => {
  const { addToast, confirm } = useNotification();
  const { socket } = useSocket();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

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
      if (activeTab === 'cancelled') params.status = 'cancelled';

      const queryStr = new URLSearchParams(params).toString();
      const { data } = await api.get(`/meetings${queryStr ? '?' + queryStr : ''}`);
      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (_err) {
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

  // Save / Update Meeting
  const handleSaveMeeting = async (formData) => {
    if (editingMeeting) {
      const { data } = await api.put(`/meetings/${editingMeeting._id}`, formData);
      if (data.success) {
        addToast('Meeting updated & calendar synced!', 'success');
        setEditingMeeting(null);
        fetchMeetings();
      }
    } else {
      const { data } = await api.post('/meetings', formData);
      if (data.success) {
        addToast(
          data.isDemo
            ? 'Meeting created with demo link (Google credentials not set).'
            : 'Meeting scheduled & Google Meet link generated!',
          'success'
        );
        fetchMeetings();
      }
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async (meetingId, reason = '') => {
    try {
      const { data } = await api.patch(`/meetings/${meetingId}/cancel`, { cancelReason: reason });
      if (data.success) {
        addToast('Meeting cancelled & attendees notified.', 'info');
        fetchMeetings();
        if (viewingMeeting && viewingMeeting._id === meetingId) {
          setViewingMeeting(null);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel meeting', 'error');
    }
  };

  // Delete Meeting Permanently
  const handleDelete = (meetingId, title) => {
    confirm({
      title: 'Delete Meeting Record',
      message: `Are you sure you want to permanently delete meeting "${title}"? This cannot be undone.`,
      confirmText: 'Delete Meeting',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/meetings/${meetingId}`);
          if (data.success) {
            addToast('Meeting deleted successfully', 'success');
            fetchMeetings();
          }
        } catch (_err) {
          addToast('Failed to delete meeting', 'error');
        }
      },
    });
  };

  // Copy Meet Link
  const handleCopyLink = (meetingId, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(meetingId);
    addToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter meetings by search query
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingMeeting(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={16} /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="filter-bar-container" style={{ justifyContent: 'space-between' }}>
        {/* Tabs */}
        <div className="segmented-pill-tabs">
          <button
            type="button"
            className={`segmented-pill-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`segmented-pill-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past & Completed
          </button>
          <button
            type="button"
            className={`segmented-pill-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
          </button>
        </div>

        {/* Search, Channel Filter & View Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: '1 1 320px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div className="search-input-box" style={{ flex: '1 1 180px', maxWidth: '300px' }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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

          {/* Desktop View Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--color-border)',
            }}
            className="desktop-only"
          >
            <button
              type="button"
              className={`btn btn-ghost btn-icon btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--color-surface)' : 'transparent',
                width: '28px',
                height: '28px',
              }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-icon btn-sm ${viewMode === 'table' ? 'active' : ''}`}
              style={{
                backgroundColor: viewMode === 'table' ? 'var(--color-surface)' : 'transparent',
                width: '28px',
                height: '28px',
              }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        /* Loading Skeleton */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                height: '220px',
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
              <div style={{ height: '40px', width: '100%', background: 'var(--color-surface-hover)', borderRadius: '4px', marginTop: 'auto' }} />
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
            No {activeTab} meetings found
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              maxWidth: '380px',
              margin: '0 auto 20px',
              lineHeight: 1.5,
            }}
          >
            {activeTab === 'upcoming'
              ? 'There are no upcoming Google Meet calls scheduled. Schedule one now to sync with your team.'
              : activeTab === 'cancelled'
                ? 'No meetings have been cancelled.'
                : 'No past completed meetings in this workspace yet.'}
          </p>
          {activeTab === 'upcoming' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingMeeting(null);
                setIsCreateOpen(true);
              }}
            >
              <Plus size={14} /> Schedule Meeting
            </button>
          )}
        </div>
      ) : (
        /* Meeting Cards Grid / Stack */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '16px',
          }}
        >
          {filteredMeetings.map((m) => {
            const isUpcoming = m.status === 'upcoming';
            const isCancelled = m.status === 'cancelled';
            const isCompleted = m.status === 'completed';
            const isCopied = copiedId === m._id;
            const typeInfo = TYPE_METADATA[m.meetingType] || TYPE_METADATA.general;
            const { formattedDate, formattedTime, timeZone } = formatMeetingDateTime(m.dateTime);
            const countdown = getMeetingCountdown(m.dateTime, m.durationMinutes || 30);
            const meetUrl = m.googleMeetLink || m.meetLink;
            const isDemo = m.isDemoLink || m.provider === 'demo';

            return (
              <div
                key={m._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  borderLeft: isCancelled
                    ? '4px solid var(--color-danger)'
                    : countdown.isLive
                      ? '4px solid var(--color-success)'
                      : isUpcoming
                        ? '4px solid var(--color-primary)'
                        : '4px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  padding: '16px 18px',
                  position: 'relative',
                  opacity: isCancelled ? 0.82 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Top Meta Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge
                      variant={
                        isCancelled ? 'danger' : isCompleted ? 'neutral' : countdown.isLive ? 'success' : 'primary'
                      }
                    >
                      {isCancelled ? 'CANCELLED' : countdown.isLive ? 'LIVE NOW' : isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                    </Badge>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'var(--color-surface-alt)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
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
                        #{typeof m.groupId === 'object' ? m.groupId.name : m.groupId}
                      </span>
                    )}

                    {isDemo && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#D97706',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        Demo Link
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

                {/* Cancelled Banner if applicable */}
                {isCancelled && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '12px',
                      color: 'var(--color-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>Cancelled: {m.cancelReason || 'Meeting was cancelled by organizer.'}</span>
                  </div>
                )}

                {/* Title & Agenda */}
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      margin: '0 0 4px 0',
                      lineHeight: 1.3,
                      textDecoration: isCancelled ? 'line-through' : 'none',
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
                        margin: 0,
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
                </div>

                {/* Localized Date, Time, Timezone & Live countdown */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--color-primary)" />
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formattedDate}</span>
                    </div>
                    {isUpcoming && countdown.text && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: countdown.isLive ? '#10B981' : 'var(--color-primary)',
                        }}
                      >
                        {countdown.text}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="var(--color-primary)" />
                    <span>
                      {formattedTime} <strong style={{ color: 'var(--color-text-secondary)' }}>{timeZone}</strong> ({m.durationMinutes || 30} mins)
                    </span>
                  </div>
                </div>

                {/* Attendees Avatar Stack */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <Users size={14} color="var(--color-text-tertiary)" />
                    <span>{m.attendeeIds?.length || 0} attendees</span>
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

                {/* Footer Controls */}
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
                          fontWeight: 700,
                          fontSize: '12.5px',
                          minHeight: '34px',
                        }}
                      >
                        <Video size={14} /> Join Meet <ExternalLink size={11} />
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ width: '34px', height: '34px' }}
                        onClick={() => handleCopyLink(m._id, meetUrl)}
                        title="Copy Google Meet Link"
                      >
                        {isCopied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : isCancelled ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                      Meeting Cancelled
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      No link available
                    </span>
                  )}

                  {/* Admin Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isUpcoming && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ width: '34px', height: '34px' }}
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
                        style={{ width: '34px', height: '34px', color: 'var(--color-warning)' }}
                        onClick={() => {
                          confirm({
                            title: 'Cancel Meeting',
                            message: `Are you sure you want to cancel meeting "${m.title}"? Attendees will be notified and the Google Calendar event will be removed.`,
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
                      style={{ width: '34px', height: '34px', color: 'var(--color-danger)' }}
                      onClick={() => handleDelete(m._id, m.title)}
                      title="Delete Record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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

      {/* Detail Modal */}
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
