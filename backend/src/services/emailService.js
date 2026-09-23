const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

/**
 * Send meeting invitation / update email
 */
const sendMeetingEmail = async ({ to, subject, meeting, action = 'scheduled' }) => {
  if (!to || (Array.isArray(to) && to.length === 0)) return;

  const recipients = Array.isArray(to) ? to.join(', ') : to;
  const meetTime = new Date(meeting.dateTime).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const actionText =
    action === 'scheduled'
      ? 'You have been invited to a new Google Meet session'
      : action === 'updated'
      ? 'A Google Meet session has been updated'
      : 'A Google Meet session has been cancelled';

  const actionColor = action === 'cancelled' ? '#EF4444' : '#4F46E5';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background-color: #1E293B; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
          .badge { display: inline-block; padding: 4px 10px; background-color: ${actionColor}20; color: ${actionColor}; border: 1px solid ${actionColor}40; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0 0 12px 0; }
          .detail-box { background-color: #0F172A; border-radius: 8px; border: 1px solid #334155; padding: 16px; margin: 20px 0; font-size: 14px; }
          .detail-row { display: flex; margin-bottom: 8px; }
          .detail-label { color: #94A3B8; width: 100px; font-weight: 500; }
          .detail-val { color: #F8FAFC; font-weight: 600; }
          .btn-join { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 10px; }
          .footer { font-size: 12px; color: #64748B; margin-top: 24px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">${action.toUpperCase()}</div>
          <h2 class="title">${meeting.title}</h2>
          <p style="color: #94A3B8; font-size: 14px; margin: 0;">${actionText} on SAAS Nexus.</p>
          
          <div class="detail-box">
            <div style="margin-bottom: 8px;"><strong>Date & Time:</strong> ${meetTime}</div>
            <div style="margin-bottom: 8px;"><strong>Duration:</strong> ${meeting.durationMinutes || 45} minutes</div>
            <div style="margin-bottom: 8px;"><strong>Channel:</strong> #${meeting.groupId?.name || 'Workspace Channel'}</div>
            ${meeting.description ? `<div><strong>Agenda:</strong> ${meeting.description}</div>` : ''}
          </div>

          ${
            action !== 'cancelled' && meeting.googleMeetLink
              ? `<div style="text-align: center; margin: 24px 0;">
                  <a href="${meeting.googleMeetLink}" target="_blank" class="btn-join">🎥 Join Google Meet</a>
                  <div style="margin-top: 10px; font-size: 12px; color: #94A3B8;">Link: <a href="${meeting.googleMeetLink}" style="color: #6366F1;">${meeting.googleMeetLink}</a></div>
                </div>`
              : ''
          }

          <div class="footer">
            SAAS Nexus — Internal Workspace Platform<br/>
            This is an automated notification.
          </div>
        </div>
      </body>
    </html>
  `;

  const transport = getTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || '"SAAS Nexus Workspace" <no-reply@nexus.corp>',
        to: recipients,
        subject: subject || `[SAAS Nexus] ${action === 'cancelled' ? 'Cancelled: ' : ''}${meeting.title}`,
        html,
      });
    } catch (err) {
      console.warn('[Nodemailer Send Warning]:', err.message);
    }
  } else {
    // Simulated log for development
    console.log(`[Email Service (Simulated)]: Dispatched "${subject}" to ${recipients}`);
  }
};

module.exports = {
  sendMeetingEmail,
};
