import { useState } from 'react';
import { KeyRound, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const FirstLoginReset = () => {
  const { updatePassword, user, logout } = useAuth();
  const { addToast, confirm } = useNotification();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const clearErrors = () => {
    setFieldErrors({});
    setFormError('');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    clearErrors();

    const errors = {};
    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await updatePassword(null, newPassword);
      addToast('Password successfully updated! Welcome to SAAS Nexus.', 'success');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update password. Please try again.';
      setFormError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: 'clamp(14px, 4vw, 24px)',
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'clamp(24px, 5vw, 36px) clamp(18px, 5vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-warning-soft)',
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={26} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Set Your Private Password</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Welcome, <strong>{user?.name}</strong>. Your account was provisioned with a temporary
            password. Please set a new password before accessing the workspace.
          </p>
        </div>

        {formError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{formError}</span>
          </div>
        )}

        <form
          onSubmit={handleReset}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              disabled={loading}
              className={`form-input ${fieldErrors.newPassword ? 'input-error' : ''}`}
              style={fieldErrors.newPassword ? { borderColor: '#EF4444' } : {}}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) clearErrors();
              }}
            />
            {fieldErrors.newPassword && (
              <span
                style={{
                  color: '#EF4444',
                  fontSize: '11.5px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {fieldErrors.newPassword}
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              autoComplete="new-password"
              disabled={loading}
              className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              style={fieldErrors.confirmPassword ? { borderColor: '#EF4444' } : {}}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) clearErrors();
              }}
            />
            {fieldErrors.confirmPassword && (
              <span
                style={{
                  color: '#EF4444',
                  fontSize: '11.5px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Securing Account...</span>
              </>
            ) : (
              <>
                <span>Save Password & Enter Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            confirm({
              title: 'Sign Out Confirmation',
              message:
                'Are you sure you want to sign out? You will need to log in again with your initial credentials.',
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
