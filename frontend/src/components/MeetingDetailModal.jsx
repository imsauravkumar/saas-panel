import { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  AlertTriangle,
  Users,
  Info,
  Shield,
  Ban,
  MessageSquare,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';
import {
  TYPE_METADATA,
  formatMeetingDateTime,
  getMeetingCountdown,
} from '../utils/meetingUtils';

const MeetingDetailModal = ({
  isOpen,
  onClose,
  meeting,
  isAdmin = false,
  currentUserId = null,
  onEdit = null,
  onCancel = null,
}) => {
  const [copied, setCopied] = useState(false);
  const [countdownInfo, setCountdownInfo] = useState({ label: '', isLive: false, isPast: false });
  const [isCancelConfirming, setIsCancelConfirming] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Live countdown timer calculation
  useEffect(() => {
    if (!meeting || !meeting.dateTime) return;

    const updateCountdown = () => {
      setCountdownInfo(
        getMeetingCountdown(meeting.dateTime, meeting.durationMinutes, meeting.status)
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 15000);
    return () => clearInterval(timer);
  }, [meeting]);

  useEffect(() => {
    setIsCancelConfirming(false);
    setCancelReason('');
    setCancelling(false);
  }, [isOpen, meeting?._id]);

  if (!meeting) return null;

  const dateTimeInfo = formatMeetingDateTime(meeting.dateTime, meeting.durationMinutes);
  const isCancelled = meeting.status === 'cancelled';
  const isCompleted = meeting.status === 'completed' || dateTimeInfo.isPast;
  const isLive = dateTimeInfo.isLive && !isCancelled;
  const typeMeta = TYPE_METADATA[meeting.meetingType] || TYPE_METADATA.general;

  const isCreator =
    currentUserId &&
    (meeting.createdBy?._id === currentUserId || meeting.createdBy === currentUserId);
  const canManage = isAdmin || isCreator;
  const meetLink = meeting.googleMeetLink || meeting.meetLink;

  const handleCopy = () => {
    if (!meetLink) return;
    navigator.clipboard.writeText(meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmCancel = async () => {
    if (!onCancel) return;
    setCancelling(true);
    try {
      await onCancel(meeting, cancelReason);
      setIsCancelConfirming(false);
    } catch (err) {
      console.error('Failed to cancel meeting:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Overview & Details" maxWidth="620px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Cancelled Alert Banner */}
        {isCancelled && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Ban size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#DC2626' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>
                This meeting was cancelled
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '3px', lineHeight: 1.4 }}>
                {meeting.cancelledBy && (
                  <span>
                    Cancelled by <strong>{meeting.cancelledBy.name || 'Organizer'}</strong>
                    {meeting.cancelledAt && ` on ${new Date(meeting.cancelledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}.
                  </span>
                )}
                {meeting.cancelReason && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#991B1B' }}>
                    &ldquo;{meeting.cancelReason}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Header Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px' }}>{typeMeta.emoji}</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'var(--color-primary-soft)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {typeMeta.label}
            </span>

            {meeting.groupId && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                #{meeting.groupId.name}
              </span>
            )}

            {/* Status / Countdown badge */}
            {isCancelled ? (
              <Badge variant="danger">Cancelled</Badge>
            ) : isLive ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#10B981',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                Live Right Now
              </span>
            ) : isCompleted ? (
              <Badge variant="neutral">Concluded</Badge>
            ) : (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: countdownInfo.color,
                  background: countdownInfo.bg,
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                {countdownInfo.label}
              </span>
            )}

            {meeting.isDemoLink && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#D97706',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                title="Demo Mode: Simulated Google Meet URL"
              >
                Demo Link
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {meeting.title}
          </h2>

          {/* Schedule Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              marginTop: '4px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color="var(--color-primary)" />
              <div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Date</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {dateTimeInfo.dateStr || 'Not set'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="var(--color-primary)" />
              <div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Time & Zone</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {dateTimeInfo.timeRangeStr} ({dateTimeInfo.tzAbbr})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Primary Google Meet CTA Section */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: isCancelled
              ? 'var(--color-surface-alt)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: isCancelled ? '1px solid var(--color-border)' : '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color={isCancelled ? 'var(--color-text-muted)' : 'var(--color-primary)'} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>
                Google Meet Conference Room
              </span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCopy}
              disabled={!meetLink}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Join CTA Button */}
          {isCancelled ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled
              style={{ width: '100%', justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed' }}
            >
              Meeting Cancelled
            </button>
          ) : isCompleted ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled
                style={{ flex: 1, justifyContent: 'center', opacity: 0.7 }}
              >
                Session Ended
              </button>
              {meetLink && (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={13} /> Re-open Room
                </a>
              )}
            </div>
          ) : (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Video size={18} />
              <span>Join Google Meet Now</span>
              <ExternalLink size={15} style={{ marginLeft: '4px', opacity: 0.8 }} />
            </a>
          )}
        </div>

        {/* 4. Agenda / Description */}
        {meeting.description && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '6px',
              }}
            >
              AGENDA & NOTES
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-text)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {meeting.description}
            </div>
          </div>
        )}

        {/* 5. Organizer & Attendees */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Organizer */}
          {meeting.createdBy && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ORGANIZER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar name={meeting.createdBy.name} src={meeting.createdBy.avatar} size="xs" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {meeting.createdBy.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  ({meeting.createdBy.post || meeting.createdBy.role || 'Member'})
                </span>
              </div>
            </div>
          )}

          {/* Attendees List */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px',
              }}
            >
              INVITED ATTENDEES ({meeting.attendeeIds?.length || 0})
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
                maxHeight: '140px',
                overflowY: 'auto',
              }}
            >
              {meeting.attendeeIds?.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  All channel members
                </div>
              ) : (
                meeting.attendeeIds?.map((attendee) => (
                  <div
                    key={attendee._id || attendee}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-border)',
                      fontSize: '12px',
                    }}
                  >
                    <Avatar name={attendee.name} src={attendee.avatar} size="xs" />
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {attendee.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {attendee.post || attendee.email}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 6. Admin Danger Zone & Edit Actions */}
        {canManage && !isCancelled && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ORGANIZER CONTROLS
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {onEdit && !isCompleted && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onEdit(meeting);
                      onClose();
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    <Edit2 size={13} /> Edit Schedule
                  </button>
                )}

                {onCancel && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setIsCancelConfirming(true)}
                    style={{ fontSize: '12px' }}
                  >
                    <Ban size={13} /> Cancel Meeting
                  </button>
                )}
              </div>
            </div>

            {/* Inline Cancellation Reason Confirmation Panel */}
            {isCancelConfirming && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#B91C1C' }}>
                  Are you sure you want to cancel this meeting?
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  This will notify all attendees, post a cancellation notice in the channel, and
                  remove the event from Google Calendar.
                </p>

                <input
                  type="text"
                  placeholder="Optional cancellation note / reason for attendees..."
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px 10px', height: '32px' }}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelling}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsCancelConfirming(false)}
                    disabled={cancelling}
                  >
                    Keep Meeting
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm & Notify Attendees'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MeetingDetailModal;
