import React, { useState } from 'react';
import { KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const FirstLoginReset = () => {
  const { updatePassword, user, logout } = useAuth();
  const { addToast, confirm } = useNotification();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(null, newPassword);
      addToast('Password successfully updated! Welcome to SAAS Nexus.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-warning-soft)',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <KeyRound size={26} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Set Your Private Password</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Welcome, <strong>{user?.name}</strong>. Your account was provisioned with a temporary password. Please set a new password before accessing the workspace.
          </p>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', height: '44px', marginTop: '6px' }}>
            {loading ? 'Securing Account...' : 'Save Password & Enter Workspace'}
            <ArrowRight size={16} />
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            confirm({
              title: 'Sign Out Confirmation',
              message: 'Are you sure you want to sign out? You will need to log in again with your initial credentials.',
              confirmText: 'Sign Out',
              cancelText: 'Stay on Page',
              type: 'logout',
              onConfirm: () => {
                logout();
              },
            });
          }}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'center', color: 'var(--color-text-muted)' }}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
};

export default FirstLoginReset;
