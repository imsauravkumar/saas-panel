const { google } = require('googleapis');
const crypto = require('crypto');

/**
 * Helper to generate a realistic Google Meet format URL (e.g. https://meet.google.com/abc-defg-hij)
 */
const generateFallbackMeetLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randStr = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${randStr(3)}-${randStr(4)}-${randStr(3)}`;
};

/**
 * Checks whether valid Google Calendar credentials are provided in environment
 */
const isGoogleCredentialsConfigured = () => {
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
  const hasOAuth2 = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
  return hasServiceAccount || hasOAuth2;
};

/**
 * Initializes Google Calendar API client
 */
const getCalendarClient = () => {
  try {
    if (
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        privateKey,
        [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        process.env.GOOGLE_IMPERSONATED_ADMIN_EMAIL || undefined
      );
      return google.calendar({ version: 'v3', auth });
    }

    if (
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    ) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      return google.calendar({ version: 'v3', auth: oauth2Client });
    }

    return null;
  } catch (err) {
    console.warn('[Google Calendar Client Init Warning]:', err.message);
    return null;
  }
};

/**
 * Executes an async Google API call with automatic retry & exponential backoff on transient errors
 */
const executeWithRetry = async (apiCallFn, maxRetries = 1, initialDelayMs = 1000) => {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await apiCallFn();
    } catch (err) {
      attempt++;
      const isTransient =
        err.code === 429 ||
        err.status === 429 ||
        err.code === 500 ||
        err.code === 503 ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT';

      if (attempt <= maxRetries && isTransient) {
        console.warn(
          `[Google API Transient Error]: Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`
        );
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
};

/**
 * Creates Google Calendar event with an auto-generated Google Meet conference
 */
const createMeetingEvent = async ({
  summary,
  description = '',
  start,
  end,
  attendeeEmails = [],
}) => {
  const calendar = getCalendarClient();

  if (calendar) {
    try {
      const requestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const res = await executeWithRetry(() =>
        calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          conferenceDataVersion: 1,
          sendUpdates: 'all',
          requestBody: {
            summary,
            description,
            start: { dateTime: new Date(start).toISOString() },
            end: { dateTime: new Date(end).toISOString() },
            attendees: attendeeEmails.map((email) => ({ email: email.trim().toLowerCase() })),
            conferenceData: {
              createRequest: {
                requestId,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          },
        })
      );

      const hangoutLink =
        res.data.hangoutLink ||
        res.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;

      if (hangoutLink) {
        return {
          eventId: res.data.id,
          meetLink: hangoutLink,
          isDemoLink: false,
          provider: 'google',
        };
      }
    } catch (err) {
      console.warn(
        '[Google Calendar API Warning]: Failed to create live event, falling back to demo mode:',
        err.message
      );
    }
  }

  // Demo Mode Fallback: realistic Meet link flagged with isDemoLink: true
  const fallbackLink = generateFallbackMeetLink();
  const fallbackEventId = `gmeet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    eventId: fallbackEventId,
    meetLink: fallbackLink,
    isDemoLink: true,
    provider: 'demo',
  };
};

/**
 * Updates an existing Google Calendar event
 */
const updateMeetingEvent = async (
  eventId,
  { summary, description, start, end, attendeeEmails }
) => {
  const calendar = getCalendarClient();

  if (!calendar || !eventId || eventId.startsWith('gmeet_')) {
    return { eventId, isDemoLink: true };
  }

  try {
    const patchBody = {};
    if (summary) patchBody.summary = summary;
    if (description !== undefined) patchBody.description = description;
    if (start) patchBody.start = { dateTime: new Date(start).toISOString() };
    if (end) patchBody.end = { dateTime: new Date(end).toISOString() };
    if (attendeeEmails) {
      patchBody.attendees = attendeeEmails.map((email) => ({
        email: email.trim().toLowerCase(),
      }));
    }

    const res = await executeWithRetry(() =>
      calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        sendUpdates: 'all',
        requestBody: patchBody,
      })
    );

    return { eventId: res.data.id, isDemoLink: false };
  } catch (err) {
    console.warn('[Google Calendar Update Warning]:', err.message);
    return { eventId, error: err.message, isDemoLink: false };
  }
};

/**
 * Cancels / Deletes an existing Google Calendar event
 */
const cancelMeetingEvent = async (eventId) => {
  const calendar = getCalendarClient();

  if (!calendar || !eventId || eventId.startsWith('gmeet_')) {
    return true;
  }

  try {
    await executeWithRetry(() =>
      calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        sendUpdates: 'all',
      })
    );
    return true;
  } catch (err) {
    console.warn('[Google Calendar Delete Warning]:', err.message);
    return false;
  }
};

module.exports = {
  createMeetingEvent,
  updateMeetingEvent,
  cancelMeetingEvent,
  isGoogleCredentialsConfigured,
  generateFallbackMeetLink,
  // Backwards compatibility aliases
  createEventWithMeet: createMeetingEvent,
  updateEvent: updateMeetingEvent,
  deleteOrCancelEvent: cancelMeetingEvent,
  createGoogleMeetEvent: createMeetingEvent,
};
