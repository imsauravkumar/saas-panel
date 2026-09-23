import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Users,
  X,
  AlertCircle,
  Check,
  Loader2,
  Zap,
  Sparkles,
  Link,
  FileText,
  Tag,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';

const MEETING_TYPES = [
  { id: 'general', label: 'General Call', emoji: '📹', description: 'Standard video sync' },
  { id: 'standup', label: 'Daily Standup', emoji: '⚡', description: 'Quick team progress check' },
  { id: 'sync', label: '1-on-1 Sync', emoji: '👥', description: 'Individual check-in' },
  { id: 'review', label: 'Design / Code Review', emoji: '🔍', description: 'Walkthrough & feedback' },
  { id: 'demo', label: 'Product Demo', emoji: '🚀', description: 'Feature showcase' },
  { id: 'allhands', label: 'All-Hands', emoji: '🏢', description: 'Company / Channel wide' },
];

const AGENDA_TEMPLATES = [
  {
    name: '⚡ Standup 3-Questions',
    text: '• What did you accomplish yesterday?\n• What are you focusing on today?\n• Any blockers or impediments?',
  },
  {
    name: '👥 1-on-1 Check-in',
    text: '• Recent wins & highlights\n• Current priorities & obstacles\n• Feedback, career growth & support needed',
  },
  {
    name: '🔍 Review & Feedback',
    text: '• Context & problem overview\n• Live demo / walkthrough\n• Discussion, open questions & action items',
  },
];

const CreateMeetingModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  groups = [],
  allUsers = [],
}) => {
  const [isInstant, setIsInstant] = useState(false);
  const [meetingType, setMeetingType] = useState('general');
  const [linkMode, setLinkMode] = useState('auto'); // 'auto' | 'custom'
  const [customMeetLink, setCustomMeetLink] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    groupId: '',
    dateTime: '',
    durationMinutes: 45,
    attendeeIds: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prepopulate or initialize
  useEffect(() => {
    if (initialData) {
      const dt = initialData.dateTime
        ? new Date(initialData.dateTime).toISOString().slice(0, 16)
        : '';
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        groupId: initialData.groupId?._id || initialData.groupId || (groups[0]?._id || ''),
        dateTime: dt,
        durationMinutes: initialData.durationMinutes || 45,
        attendeeIds: (initialData.attendeeIds || []).map((a) => a._id || a),
      });
      setMeetingType(initialData.meetingType || 'general');
      setIsInstant(!!initialData.isInstant);
      if (initialData.googleMeetLink && !initialData.googleMeetLink.includes('meet.google.com/')) {
        setLinkMode('custom');
        setCustomMeetLink(initialData.googleMeetLink);
      }
    } else {
      // Default: 1 hour from now rounded
      const defaultTime = new Date(Date.now() + 3600 * 1000);
      defaultTime.setMinutes(Math.ceil(defaultTime.getMinutes() / 15) * 15, 0, 0);
      const dtStr = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      const firstGroup = groups[0];
      const initialAttendees = firstGroup ? (firstGroup.memberIds || []).map((m) => m._id || m) : [];

      setFormData({
        title: '',
        description: '',
        groupId: firstGroup?._id || '',
        dateTime: dtStr,
        durationMinutes: 45,
        attendeeIds: initialAttendees,
      });
      setIsInstant(false);
      setMeetingType('general');
      setLinkMode('auto');
      setCustomMeetLink('');
    }
    setError('');
  }, [initialData, groups, isOpen]);

  // When group changes, default attendeeIds to all members of that group
  const handleGroupChange = (newGroupId) => {
    const selectedGroup = groups.find((g) => g._id === newGroupId);
    const members = selectedGroup ? (selectedGroup.memberIds || []).map((m) => m._id || m) : [];
    setFormData((prev) => ({
      ...prev,
      groupId: newGroupId,
      attendeeIds: members,
    }));
  };

  // Quick Time Presets
  const applyTimePreset = (offsetMinutes) => {
    const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const dtStr = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData((prev) => ({ ...prev, dateTime: dtStr }));
    setIsInstant(false);
  };

  const applyTomorrowPreset = (hour) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    const dtStr = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData((prev) => ({ ...prev, dateTime: dtStr }));
    setIsInstant(false);
  };

  // Get current group's resolved members
  const currentGroup = groups.find((g) => g._id === formData.groupId);
  const groupMembers = (currentGroup?.memberIds || []).map((m) => {
    if (typeof m === 'object' && m._id) return m;
    return allUsers.find((u) => u._id === m) || { _id: m, name: 'Team Member', email: '' };
  });

  const toggleAttendee = (userId) => {
    setFormData((prev) => {
      const exists = prev.attendeeIds.includes(userId);
      return {
        ...prev,
        attendeeIds: exists
          ? prev.attendeeIds.filter((id) => id !== userId)
          : [...prev.attendeeIds, userId],
      };
    });
  };

  const selectAllAttendees = () => {
    const allIds = groupMembers.map((m) => m._id);
    setFormData((prev) => ({ ...prev, attendeeIds: allIds }));
  };

  const clearAllAttendees = () => {
    setFormData((prev) => ({ ...prev, attendeeIds: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Meeting title is required.');
      return;
    }
    if (!formData.groupId) {
      setError('Please select a target channel.');
      return;
    }
    if (!isInstant && !formData.dateTime) {
      setError('Please specify a valid date and start time.');
      return;
    }
    if (linkMode === 'custom' && customMeetLink.trim() && !customMeetLink.startsWith('http')) {
      setError('Please provide a valid URL starting with https://');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        meetingType,
        isInstant,
        googleMeetLink: linkMode === 'custom' && customMeetLink.trim() ? customMeetLink.trim() : undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to schedule meeting.');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!initialData?._id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Scheduled Meeting' : 'Create Google Meet Video Call'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Call Mode Switcher: Instant vs Scheduled */}
        {!isEdit && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              backgroundColor: 'var(--color-surface-alt)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsInstant(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: !isInstant ? 'var(--color-surface)' : 'transparent',
                color: !isInstant ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: !isInstant ? 700 : 500,
                fontSize: '13px',
                border: !isInstant ? '1px solid var(--color-border)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} />
              <span>Schedule for Later</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsInstant(true);
                if (!formData.title) setFormData((prev) => ({ ...prev, title: 'Quick Google Meet Call' }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isInstant ? 'var(--color-primary-soft)' : 'transparent',
                color: isInstant ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isInstant ? 700 : 500,
                fontSize: '13px',
                border: isInstant ? '1px solid var(--color-primary)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={15} color={isInstant ? 'var(--color-primary)' : 'currentColor'} />
              <span>Start Call Now (Instant Meet)</span>
            </button>
          </div>
        )}

        {/* Meeting Type Badges */}
        <div>
          <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={13} /> Meeting Type
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {MEETING_TYPES.map((t) => {
              const isSelected = meetingType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMeetingType(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-primary)',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Meeting Title */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Meeting Topic / Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Q3 Architecture Sync & Demo"
            className="form-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {/* Channel Selection & Duration */}
        <div className="responsive-form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Channel / Group *</label>
            <select
              className="form-select"
              required
              value={formData.groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
            >
              <option value="">Select Channel</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  #{g.name} ({g.memberIds?.length || 0} members)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estimated Duration</label>
            <select
              className="form-select"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) })}
            >
              <option value={15}>15 mins (Quick Sync)</option>
              <option value={30}>30 mins (Standup)</option>
              <option value={45}>45 mins (Standard Call)</option>
              <option value={60}>60 mins (All-Hands / Workshop)</option>
              <option value={90}>90 mins (Deep Dive)</option>
            </select>
          </div>
        </div>

        {/* Date & Time Picker (Hidden if Instant Call) */}
        {!isInstant && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Start Date & Time *</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => applyTimePreset(15)}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  In 15m
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => applyTimePreset(60)}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  In 1h
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => applyTomorrowPreset(10)}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  Tmrw 10AM
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => applyTomorrowPreset(15)}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  Tmrw 3PM
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required={!isInstant}
              className="form-input"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            />
          </div>
        )}

        {/* Agenda / Description with quick templates */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={13} /> Agenda / Notes (Optional)
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {AGENDA_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: '10.5px', padding: '2px 6px' }}
                  onClick={() => setFormData((prev) => ({ ...prev, description: tmpl.text }))}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            placeholder="Outline topics, deliverables, or objectives for this video sync..."
            className="form-textarea"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Google Meet Link Options */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}>
              <Sparkles size={14} color="var(--color-primary)" />
              <span>Google Meet Link Generation</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-ghost btn-xs ${linkMode === 'auto' ? 'active' : ''}`}
                style={{
                  backgroundColor: linkMode === 'auto' ? 'var(--color-surface)' : 'transparent',
                  fontWeight: linkMode === 'auto' ? 700 : 500,
                  fontSize: '11px',
                }}
                onClick={() => setLinkMode('auto')}
              >
                Auto-generate
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs ${linkMode === 'custom' ? 'active' : ''}`}
                style={{
                  backgroundColor: linkMode === 'custom' ? 'var(--color-surface)' : 'transparent',
                  fontWeight: linkMode === 'custom' ? 700 : 500,
                  fontSize: '11px',
                }}
                onClick={() => setLinkMode('custom')}
              >
                Custom URL
              </button>
            </div>
          </div>

          {linkMode === 'auto' ? (
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
              A unique standard Google Meet conference code (<code style={{ color: 'var(--color-primary)' }}>https://meet.google.com/xxx-yyyy-zzz</code>) will be created and synchronized with the channel automatically.
            </div>
          ) : (
            <input
              type="url"
              placeholder="https://meet.google.com/your-custom-room"
              className="form-input"
              style={{ fontSize: '12.5px' }}
              value={customMeetLink}
              onChange={(e) => setCustomMeetLink(e.target.value)}
            />
          )}
        </div>

        {/* Attendees Checklist */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Invited Attendees ({formData.attendeeIds.length} of {groupMembers.length} selected)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px' }}
                onClick={selectAllAttendees}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}
                onClick={clearAllAttendees}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {groupMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Please select a channel to load available attendees.
              </div>
            ) : (
              groupMembers.map((m) => {
                const isSelected = formData.attendeeIds.includes(m._id);
                return (
                  <label
                    key={m._id}
                    onClick={() => toggleAttendee(m._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent',
                      border: isSelected ? '1px solid var(--color-border)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <Avatar name={m.name} src={m.avatar} size="xs" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {m.post || m.email}
                        </div>
                      </div>
                    </div>

                    {m.role === 'admin' && (
                      <Badge variant="primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        ADMIN
                      </Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              minWidth: '180px',
              backgroundColor: isInstant ? '#EA4335' : undefined,
              borderColor: isInstant ? '#EA4335' : undefined,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>{isEdit ? 'Updating Meeting...' : 'Generating Google Meet...'}</span>
              </>
            ) : isInstant ? (
              <>
                <Zap size={16} />
                <span>Start Google Meet Now</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>{isEdit ? 'Save Changes' : 'Schedule Google Meet'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMeetingModal;
