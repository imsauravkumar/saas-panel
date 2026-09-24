import { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Hash, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { formatMeetingDateTime, getMeetingCountdown } from '../utils/meetingUtils';

const NextMeetingWidget = ({ meeting, onScheduleClick, onViewAllClick }) => {
  const [countdown, setCountdown] = useState({ text: '', isLive: false, isPast: false });

  useEffect(() => {
    if (!meeting || !meeting.dateTime) {
      setCountdown({ text: '', isLive: false, isPast: false });
      return;
    }

    const update = () => {
      const cd = getMeetingCountdown(meeting.dateTime, meeting.durationMinutes || 30);
      setCountdown(cd);
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [meeting]);

  if (!meeting) {
    return (
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--color-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Video size={15} />
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Next Meeting
            </span>
          </div>

          {onViewAllClick && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onViewAllClick}
              style={{ fontSize: '11.5px', padding: '2px 8px' }}
            >
              View calendar →
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 0',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              No upcoming meetings scheduled
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Your schedule is completely clear.
            </div>
          </div>
        </div>

        {onScheduleClick && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onScheduleClick}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
          >
            + Schedule a Meeting
          </button>
        )}
      </div>
    );
  }

  const { formattedDate, formattedTime, timeZone } = formatMeetingDateTime(meeting.dateTime);
  const meetUrl = meeting.googleMeetLink || meeting.meetLink;
  const isDemo = meeting.isDemoLink || meeting.provider === 'demo';

  return (
    <div
      className="card"
      style={{
        background: 'var(--color-surface)',
        borderLeft: countdown.isLive ? '4px solid var(--color-success)' : '4px solid var(--color-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        border: '1px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: countdown.isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 67, 53, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: countdown.isLive ? '#10B981' : '#EA4335',
            }}
          >
            <Video size={15} />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: countdown.isLive ? 'var(--color-success)' : 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {countdown.isLive ? 'Live Meeting Now' : 'Next Upcoming Meeting'}
          </span>

          {isDemo && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#D97706',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              Demo Link
            </span>
          )}
        </div>

        {onViewAllClick && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onViewAllClick}
            style={{ fontSize: '11.5px', padding: '2px 8px', color: 'var(--color-text-secondary)' }}
          >
            All meetings →
          </button>
        )}
      </div>

      {/* Title & Group */}
      <div style={{ marginBottom: '12px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: '0 0 4px 0',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {meeting.title}
        </h3>

        {meeting.description && (
          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--color-text-secondary)',
              margin: '0 0 6px 0',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {meeting.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            flexWrap: 'wrap',
            marginTop: '6px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} color="var(--color-primary)" />
            {formattedDate}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} color="var(--color-primary)" />
            {formattedTime} {timeZone} ({meeting.durationMinutes || 30}m)
          </span>
          {meeting.groupId && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={13} color="var(--color-text-tertiary)" />
              #{typeof meeting.groupId === 'object' ? meeting.groupId.name : meeting.groupId}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Countdown Chip & Join Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          paddingTop: '10px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: countdown.isLive
              ? 'rgba(16, 185, 129, 0.15)'
              : 'var(--color-surface-hover)',
            color: countdown.isLive ? '#10B981' : 'var(--color-primary)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: countdown.isLive ? '#10B981' : 'var(--color-primary)',
              display: 'inline-block',
            }}
          />
          {countdown.text || 'Upcoming'}
        </div>

        {meetUrl ? (
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{
              fontWeight: 700,
              fontSize: '12.5px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Video size={14} /> Join Google Meet <ExternalLink size={11} />
          </a>
        ) : (
          onViewAllClick && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onViewAllClick}
            >
              View Details
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default NextMeetingWidget;
