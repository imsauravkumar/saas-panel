import React, { useState, useEffect } from 'react';
import { Bell, Mail, Check, Shield, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const NotificationPreferencesModal = ({ isOpen, onClose }) => {
  const { addToast } = useNotification();
  const [preferences, setPreferences] = useState({
    email: {
      newMessage: false,
      newMeeting: true,
      taskAssigned: true,
      announcement: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/notifications/preferences');
        if (data.success && data.preferences) {
          setPreferences(data.preferences);
        }
      } catch (err) {
        console.warn('Failed to fetch preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPrefs();
    }
  }, [isOpen]);

  const toggleEmailPref = (key) => {
    setPreferences((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: !prev.email?.[key],
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/notifications/preferences', {
        emailPreferences: preferences.email,
      });
      if (data.success) {
        addToast('Notification preferences updated!', 'success');
        onClose();
      }
    } catch (err) {
      addToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notification Settings & Preferences" maxWidth="520px">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Configure where and how you receive workspace alerts. In-app notifications are always enabled in your top bar.
          </p>
        </div>

        {/* Section: Email Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <Mail size={16} color="var(--color-primary)" />
            <span>Email Delivery Channels</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* New Meeting */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Google Meet Invitations</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Receive calendar invites with 1-click Google Meet join links.
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email?.newMeeting ?? true}
                onChange={() => toggleEmailPref('newMeeting')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            {/* Task Assigned */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Work & Task Assignments</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Email alerts when new deliverables are assigned to you with deadlines.
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email?.taskAssigned ?? true}
                onChange={() => toggleEmailPref('taskAssigned')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            {/* Announcements */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Company & Channel Bulletins</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Important workspace broadcasts and administrative updates.
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email?.announcement ?? true}
                onChange={() => toggleEmailPref('announcement')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            {/* Chat Messages */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Chat Messages & Mentions</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Email digest for direct mentions and unread channel discussions.
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email?.newMessage ?? false}
                onChange={() => toggleEmailPref('newMessage')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NotificationPreferencesModal;
