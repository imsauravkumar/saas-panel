import { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  XCircle,
  CalendarPlus,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';
import { useNotification } from '../context/NotificationContext';

const TYPE_EMOJIS = {
  general: { label: 'General Call', emoji: '📹' },
  standup: { label: 'Daily Standup', emoji: '⚡' },
  sync: { label: '1-on-1 Sync', emoji: '👥' },
  review: { label: 'Design / Code Review', emoji: '🔍' },
  demo: { label: 'Product Demo', emoji: '🚀' },
  allhands: { label: 'All-Hands', emoji: '🏢' },
};

const MeetingDetailModal = ({
  isOpen,
  onClose,
  meeting,
  isAdmin = false,
  currentUserId = null,
  onEdit = null,
  onCancel = null,
}) => {
  const { addToast, confirm } = useNotification();
  const [copied, setCopied] = useState(false);
  const [countdownText, setCountdownText] = useState('');

  // Live countdown timer calculation
  useEffect(() => {
    if (!meeting || !meeting.dateTime) return;

    const calculateCountdown = () => {
      const start = new Date(meeting.dateTime).getTime();
      const durationMs = (meeting.durationMinutes || 45) * 60 * 1000;
      const end = start + durationMs;
      const now = Date.now();

      if (meeting.status === 'cancelled') {
        setCountdownText('Cancelled');
        return;
      }

      if (now > end) {
        setCountdownText('Concluded');
        return;
      }

      if (now >= start && now <= end) {
        setCountdownText('🟢 Live Now');
        return;
      }

      const diffMs = start - now;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        setCountdownText(`Starts in ${diffDays}d ${remainingHours}h`);
      } else if (diffHours > 0) {
        const remainingMins = diffMins % 60;
        setCountdownText(`Starts in ${diffHours}h ${remainingMins}m`);
      } else if (diffMins > 0) {
        setCountdownText(`Starts in ${diffMins} mins`);
      } else {
        setCountdownText('Starting momentarily');
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 30000);
    return () => clearInterval(interval);
  }, [meeting]);

  if (!meeting) return null;

  const meetDate = new Date(meeting.dateTime);
  const endDate = new Date(meetDate.getTime() + (meeting.durationMinutes || 45) * 60 * 1000);
  const isCancelled = meeting.status === 'cancelled';
  const isUpcoming = meeting.status === 'upcoming';
  const typeInfo = TYPE_EMOJIS[meeting.meetingType] || TYPE_EMOJIS.general;

  const isCreator =
    currentUserId &&
    (meeting.createdBy?._id === currentUserId || meeting.createdBy === currentUserId);
  const canManage = isAdmin || isCreator;

  const handleCopyLink = () => {
    if (!meeting.googleMeetLink) return;
    navigator.clipboard.writeText(meeting.googleMeetLink);
    setCopied(true);
    addToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const getGoogleCalendarUrl = () => {
    if (!meeting || !meeting.dateTime) return '#';
    const start = new Date(meeting.dateTime);
    const end = new Date(start.getTime() + (meeting.durationMinutes || 45) * 60 * 1000);
    const formatTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(meeting.title || 'Google Meet');
    const details = encodeURIComponent(
      `${meeting.description || ''}\n\nJoin Google Meet: ${meeting.googleMeetLink || ''}`
    );
    const location = encodeURIComponent(meeting.googleMeetLink || 'Google Meet');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(start)}/${formatTime(end)}&details=${details}&location=${location}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google Meet Details" maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                flexWrap: 'wrap',
              }}
            >
              <Badge variant={isCancelled ? 'danger' : isUpcoming ? 'primary' : 'success'}>
                {meeting.status?.toUpperCase()}
              </Badge>

              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {typeInfo.emoji} {typeInfo.label}
              </span>

              {meeting.groupId && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                  #{meeting.groupId?.name || 'Channel'}
                </span>
              )}

              {countdownText && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: countdownText.includes('🟢')
                      ? 'var(--color-success)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-alt)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {countdownText}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
              {meeting.title}
            </h2>
          </div>
        </div>

        {/* Schedule & Timezone Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Calendar size={18} color="var(--color-primary)" style={{ marginTop: '2px' }} />
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                DATE
              </div>
              <div
                style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}
              >
                {meetDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Clock size={18} color="var(--color-primary)" style={{ marginTop: '2px' }} />
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                TIME & DURATION
              </div>
              <div
                style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}
              >
                {meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                {meeting.durationMinutes} mins)
              </div>
            </div>
          </div>
        </div>

        {/* Primary Google Meet Join CTA */}
        {!isCancelled && (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background:
                'linear-gradient(135deg, rgba(234, 67, 53, 0.08), rgba(66, 133, 244, 0.08))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🟢</span> Google Meet Video Conference
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  Click below to launch the video call or add to your Google Calendar
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Add this event to Google Calendar"
                  style={{ fontSize: '12px' }}
                >
                  <CalendarPlus size={14} />
                  <span>Google Calendar</span>
                </a>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyLink}
                  title="Copy link"
                  style={{ fontSize: '12px' }}
                >
                  {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={meeting.googleMeetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#EA4335',
                    borderColor: '#EA4335',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  <Video size={15} /> Join Google Meet <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--color-surface)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                wordBreak: 'break-all',
              }}
            >
              {meeting.googleMeetLink}
            </div>
          </div>
        )}

        {/* Description / Agenda */}
        {meeting.description && (
          <div>
            <h4
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
                fontWeight: 700,
              }}
            >
              Agenda / Notes
            </h4>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-surface-alt)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                whiteSpace: 'pre-line',
              }}
            >
              {meeting.description}
            </div>
          </div>
        )}

        {/* Organizer & Attendees */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <h4
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                margin: 0,
                fontWeight: 700,
              }}
            >
              Invited Attendees ({meeting.attendeeIds?.length || 0})
            </h4>

            {meeting.createdBy && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Host:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {meeting.createdBy.name}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {meeting.attendeeIds?.map((att) => (
              <div
                key={att._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Avatar name={att.name} src={att.avatar} size="xs" />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {att.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {att.post || att.department || 'Member'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar (For Admin or Meeting Creator) */}
        {canManage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '14px',
              marginTop: '2px',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              {isAdmin ? 'Administrator Controls' : 'Meeting Creator Controls'}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isUpcoming && onEdit && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose();
                    onEdit(meeting);
                  }}
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}

              {isUpcoming && onCancel && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => {
                    confirm({
                      title: 'Cancel Meeting',
                      message: `Are you sure you want to cancel meeting "${meeting.title}"? Attendees will be notified.`,
                      confirmText: 'Cancel Meeting',
                      type: 'warning',
                      onConfirm: () => {
                        onCancel(meeting._id);
                        onClose();
                      },
                    });
                  }}
                >
                  <XCircle size={13} /> Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MeetingDetailModal;
