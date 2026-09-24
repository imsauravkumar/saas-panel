/**
 * Centralized formatting and timezone helpers for Meetings feature
 */

export const TYPE_METADATA = {
  general: {
    label: 'General Discussion',
    shortLabel: 'General',
    emoji: '💬',
    desc: 'Open team syncs, planning & discussions',
    badgeVariant: 'primary',
  },
  standup: {
    label: 'Daily Standup',
    shortLabel: 'Standup',
    emoji: '⚡',
    desc: 'Quick progress, priorities & blocker check-in',
    badgeVariant: 'warning',
  },
  sync: {
    label: '1-on-1 Sync',
    shortLabel: '1-on-1',
    emoji: '👥',
    desc: 'Personal check-in, growth & feedback',
    badgeVariant: 'primary',
  },
  review: {
    label: 'Review & Demo',
    shortLabel: 'Review',
    emoji: '🔍',
    desc: 'Sprint demo, design & code review',
    badgeVariant: 'info',
  },
  allhands: {
    label: 'All-Hands Meeting',
    shortLabel: 'All-Hands',
    emoji: '🏢',
    desc: 'Company-wide updates & strategic milestones',
    badgeVariant: 'purple',
  },
};

/**
 * Returns formatted localized date, time, and timezone information
 */
export const formatMeetingDateTime = (dateTimeStr, durationMinutes = 30) => {
  if (!dateTimeStr) {
    return {
      dateStr: '',
      startTimeStr: '',
      endTimeStr: '',
      timeRangeStr: '',
      tzAbbr: '',
      fullStr: '',
      isPast: false,
      isLive: false,
    };
  }

  const d = new Date(dateTimeStr);
  const duration = durationMinutes || 30;
  const end = new Date(d.getTime() + duration * 60000);
  const now = new Date();

  // Get user's timezone abbreviation (e.g. IST, PST, GMT+5:30)
  let tzAbbr = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    tzAbbr = tzPart ? tzPart.value : Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (_e) {
    tzAbbr = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  }

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric',
  });

  const startTimeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const endTimeStr = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const isLive = now >= d && now <= end;
  const isPast = now > end;

  return {
    dateStr,
    startTimeStr,
    endTimeStr,
    timeRangeStr: `${startTimeStr} – ${endTimeStr}`,
    tzAbbr,
    fullStr: `${dateStr} · ${startTimeStr} – ${endTimeStr} (${tzAbbr})`,
    isLive,
    isPast,
  };
};

/**
 * Calculates live human-readable countdown text for meetings
 */
export const getMeetingCountdown = (dateTimeStr, durationMinutes = 30, status = 'upcoming') => {
  if (status === 'cancelled') {
    return { label: 'Cancelled', isLive: false, isPast: true, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (!dateTimeStr) {
    return { label: '', isLive: false, isPast: false, color: 'var(--color-text-secondary)', bg: 'transparent' };
  }

  const start = new Date(dateTimeStr).getTime();
  const duration = durationMinutes || 30;
  const end = start + duration * 60000;
  const now = Date.now();

  if (now > end || status === 'completed') {
    return { label: 'Concluded', isLive: false, isPast: true, color: 'var(--color-text-muted)', bg: 'var(--color-surface-alt)' };
  }

  if (now >= start && now <= end) {
    return { label: 'Live Now', isLive: true, isPast: false, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
  }

  const diffMs = start - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return {
      label: `Starts in ${diffDays}d ${remHours > 0 ? `${remHours}h` : ''}`.trim(),
      isLive: false,
      isPast: false,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-soft)',
    };
  }

  if (diffHours > 0) {
    const remMins = diffMins % 60;
    return {
      label: `Starts in ${diffHours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim(),
      isLive: false,
      isPast: false,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-soft)',
    };
  }

  if (diffMins > 0) {
    return {
      label: `Starts in ${diffMins} min${diffMins > 1 ? 's' : ''}`,
      isLive: false,
      isPast: false,
      color: '#D97706',
      bg: 'rgba(245, 158, 11, 0.15)',
    };
  }

  return {
    label: 'Starting momentarily',
    isLive: true,
    isPast: false,
    color: '#D97706',
    bg: 'rgba(245, 158, 11, 0.15)',
  };
};
