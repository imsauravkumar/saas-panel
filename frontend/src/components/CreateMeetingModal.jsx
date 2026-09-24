import { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Users,
  Shield,
  FileText,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';
import { TYPE_METADATA, formatMeetingDateTime } from '../utils/meetingUtils';

const AGENDA_TEMPLATES = [
  {
    name: '⚡ Daily Standup',
    text: '• What did you accomplish yesterday?\n• What are you working on today?\n• Any blockers or dependencies?',
  },
  {
    name: '👥 1-on-1 Check-in',
    text: '• Key priorities & recent accomplishments\n• Challenges & questions\n• Career growth, support & feedback',
  },
  {
    name: '🔍 Review & Walkthrough',
    text: '• Overview & objectives\n• Walkthrough / Demo\n• Discussion, action items & next steps',
  },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 mins' },
  { value: 30, label: '30 mins (Default)' },
  { value: 45, label: '45 mins' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const CreateMeetingModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  groups = [],
  allUsers = [],
}) => {
  const isEditing = Boolean(initialData?._id);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [meetingType, setMeetingType] = useState('general');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // UI / Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdSuccessData, setCreatedSuccessData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // User's local timezone info
  const userTimezone = useMemo(() => {
    try {
      const d = new Date();
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      return tzPart ? tzPart.value : Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (_e) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    }
  }, []);

  // Helper to format Date to input datetime-local string in local time
  const getLocalDateString = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  // Reset or Populate form when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) {
      setCreatedSuccessData(null);
      setError('');
      return;
    }

    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setGroupId(initialData.groupId?._id || initialData.groupId || groups[0]?._id || '');
      setDurationMinutes(initialData.durationMinutes || 30);
      setMeetingType(initialData.meetingType || 'general');

      if (initialData.dateTime) {
        const d = new Date(initialData.dateTime);
        setDateTime(getLocalDateString(d));
      } else {
        const nextHour = new Date(Date.now() + 3600 * 1000);
        nextHour.setMinutes(0, 0, 0);
        setDateTime(getLocalDateString(nextHour));
      }

      const attendees = (initialData.attendeeIds || []).map((a) => a._id || a);
      setSelectedAttendeeIds(attendees);
      setCreatedSuccessData(null);
      setError('');
    } else {
      // Default new meeting: 1 hour from now, rounded to next 15 mins
      const start = new Date(Date.now() + 3600 * 1000);
      const remainder = 15 - (start.getMinutes() % 15);
      if (remainder < 15) {
        start.setMinutes(start.getMinutes() + remainder, 0, 0);
      } else {
        start.setSeconds(0, 0);
      }

      const defaultGroup = groups[0];
      const defaultMembers = defaultGroup?.memberIds?.map((m) => m._id || m) || [];

      setTitle('');
      setDescription('');
      setGroupId(defaultGroup?._id || '');
      setDateTime(getLocalDateString(start));
      setDurationMinutes(30);
      setMeetingType('general');
      setSelectedAttendeeIds(defaultMembers);
      setAttendeeSearch('');
      setError('');
      setCreatedSuccessData(null);
    }
  }, [isOpen, initialData, groups]);

  // When group changes, auto-select that channel's members if not manually edited
  const handleGroupChange = (newGroupId) => {
    setGroupId(newGroupId);
    const targetGroup = groups.find((g) => g._id === newGroupId);
    if (targetGroup && targetGroup.memberIds) {
      const memberIds = targetGroup.memberIds.map((m) => m._id || m);
      setSelectedAttendeeIds(memberIds);
    }
  };

  // Group members pool for the selected channel
  const currentGroupMembers = useMemo(() => {
    const selectedGroup = groups.find((g) => g._id === groupId);
    if (!selectedGroup || !selectedGroup.memberIds) return allUsers;

    const memberIdSet = new Set(selectedGroup.memberIds.map((m) => (m._id || m).toString()));
    return allUsers.filter((u) => memberIdSet.has(u._id.toString()));
  }, [groupId, groups, allUsers]);

  // Filtered attendees for the picker
  const visibleAttendees = useMemo(() => {
    if (!attendeeSearch.trim()) return currentGroupMembers;
    const q = attendeeSearch.toLowerCase();
    return currentGroupMembers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [currentGroupMembers, attendeeSearch]);

  const toggleAttendee = (id) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllAttendees = () => {
    setSelectedAttendeeIds(currentGroupMembers.map((m) => m._id));
  };

  const clearAllAttendees = () => {
    setSelectedAttendeeIds([]);
  };

  // Form validation & submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }

    if (!groupId) {
      setError('Please select a target channel.');
      return;
    }

    if (!dateTime) {
      setError('Please select a meeting date and time.');
      return;
    }

    const selectedDate = new Date(dateTime);
    if (isNaN(selectedDate.getTime())) {
      setError('Invalid date and time selected.');
      return;
    }

    // Check past date on new meeting creations
    if (!isEditing && selectedDate.getTime() < Date.now() - 60000) {
      setError('Meeting date and time cannot be in the past. Please select a future time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        groupId,
        dateTime: selectedDate.toISOString(),
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        meetingType,
        attendeeIds: selectedAttendeeIds,
      };

      const result = await onSubmit(payload);

      // If this was a create operation, display the generated link in the success screen
      if (!isEditing && result?.meeting) {
        setCreatedSuccessData(result.meeting);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('[Create Meeting Modal Error]:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        createdSuccessData
          ? 'Google Meet Scheduled'
          : isEditing
            ? 'Edit Meeting Schedule'
            : 'Schedule Google Meet Session'
      }
      maxWidth="620px"
    >
      {/* 1. Post-Creation Success View with Instant Meet Link */}
      {createdSuccessData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Video size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                {createdSuccessData.title}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {formatMeetingDateTime(createdSuccessData.dateTime, createdSuccessData.durationMinutes).fullStr}
              </div>
            </div>
          </div>

          {/* Generated Google Meet Link Box */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              GOOGLE MEET LINK
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  flex: 1,
                  wordBreak: 'break-all',
                }}
              >
                {createdSuccessData.googleMeetLink || createdSuccessData.meetLink}
              </code>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  handleCopyLink(createdSuccessData.googleMeetLink || createdSuccessData.meetLink)
                }
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                {copiedLink ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Demo Mode Notice if Google API credentials absent */}
          {createdSuccessData.isDemoLink && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '12px',
                color: '#B45309',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: 1.4,
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Demo Mode Link:</strong> Standard Google Meet room link generated in test mode.
                Connect Google Calendar API credentials in backend environment to sync real Google Calendar events.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <a
              href={createdSuccessData.googleMeetLink || createdSuccessData.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={14} /> Open Meeting Room
            </a>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        /* 2. Main Create / Edit Form */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#DC2626',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Meeting Title *</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{title.length}/120</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Q4 Sprint Planning & Architecture Review"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Channel / Group & Meeting Type Row */}
          <div className="responsive-form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Channel / Group *</label>
              <select
                className="form-select"
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                disabled={submitting || isEditing}
                required
              >
                <option value="" disabled>
                  Select channel...
                </option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    #{g.name} ({g.memberIds?.length || 0} members)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Session Format</label>
              <select
                className="form-select"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                disabled={submitting}
              >
                {Object.entries(TYPE_METADATA).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.emoji} {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Picker (Explicit Timezone Shown) + Duration */}
          <div className="responsive-form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} color="var(--color-primary)" />
                <span>Date & Time *</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  ({userTimezone})
                </span>
              </label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={submitting}
                style={{ height: '38px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-primary)" />
                <span>Duration</span>
              </label>
              <select
                className="form-select"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                disabled={submitting}
                style={{ height: '38px' }}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Attendees Selection with Search and Channel Member Badges */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Attendees ({selectedAttendeeIds.length} selected)
              </label>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px' }}>
                <button
                  type="button"
                  onClick={selectAllAttendees}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                <button
                  type="button"
                  onClick={clearAllAttendees}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Attendee search filter if group is large */}
            {currentGroupMembers.length > 5 && (
              <input
                type="text"
                placeholder="Filter attendees by name or email..."
                className="form-input"
                style={{ fontSize: '12px', padding: '6px 10px', height: '32px', marginBottom: '6px' }}
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
              />
            )}

            <div
              style={{
                maxHeight: '130px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                background: 'var(--color-surface-alt)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {visibleAttendees.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No members found matching filter.
                </div>
              ) : (
                visibleAttendees.map((u) => {
                  const isChecked = selectedAttendeeIds.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isChecked ? 'var(--color-surface)' : 'transparent',
                        border: isChecked ? '1px solid var(--color-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAttendee(u._id)}
                          disabled={submitting}
                        />
                        <Avatar name={u.name} src={u.avatar} size="xs" />
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{u.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ({u.post || u.email})
                        </span>
                      </div>
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 600 }}>
                          Admin
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Description & Agenda with quick templates */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Agenda / Discussion Notes
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {AGENDA_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => setDescription(tmpl.text)}
                    style={{
                      background: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="Outline the meeting purpose, key talking points, or reference documents..."
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              style={{ fontSize: '12.5px', lineHeight: 1.4 }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '8px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !title.trim() || !groupId || !dateTime}
              style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isEditing ? 'Updating Schedule...' : 'Generating Meet...'}</span>
                </>
              ) : (
                <>
                  <Video size={16} />
                  <span>{isEditing ? 'Save Changes' : 'Schedule & Generate Meet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default CreateMeetingModal;
