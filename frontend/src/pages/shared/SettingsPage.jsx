import { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Sparkles,
  Copy,
  Check,
  Camera,
  Upload,
  Trash2,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';

const SettingsPage = () => {
  const { user, setUser, logout } = useAuth();
  const { addToast, confirm } = useNotification();

  // Photo management state
  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState(false);

  // Close photo menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) {
        setShowPhotoMenu(false);
      }
    };
    if (showPhotoMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showPhotoMenu]);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast(`Copied ${key} to clipboard!`, 'info');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be less than 5MB.', 'error');
      return;
    }

    try {
      setAvatarLoading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.put('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        if (setUser) {
          setUser((prev) => ({ ...prev, avatar: res.data.avatar }));
        }
        addToast('Profile picture updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Photo Removal
  const handleRemovePhoto = async () => {
    try {
      setAvatarLoading(true);
      const res = await api.put('/users/me/avatar', { avatar: '' });
      if (res.data.success) {
        if (setUser) {
          setUser((prev) => ({ ...prev, avatar: '' }));
        }
        addToast('Profile photo removed. Default initials avatar active.', 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove photo.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { label: 'Weak', color: '#EF4444', percent: '25%' };
    if (score === 2) return { label: 'Fair', color: '#F59E0B', percent: '50%' };
    if (score === 3) return { label: 'Good', color: '#06B6D4', percent: '75%' };
    return { label: 'Strong', color: '#10B981', percent: '100%' };
  };

  const strength = getPasswordStrength();

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        addToast('Password changed successfully!', 'success');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to update password.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ gap: '20px', paddingTop: '20px' }}>
      {/* ========================================================================= */}
      {/* SECTION 1: PROFILE HERO & IDENTITY CARD */}
      {/* ========================================================================= */}
      <div className="settings-hero-card">
        <div className="settings-hero-main">
          {/* Avatar with Camera Management Menu & Permanent Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div
              className="settings-avatar-container"
              ref={photoMenuRef}
              onClick={() => setShowPhotoMenu(!showPhotoMenu)}
              title="Click to manage profile photo"
            >
              <Avatar
                name={user?.name || 'User'}
                src={user?.avatar}
                size="xl"
                imgStyle={{
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                  border: '3px solid var(--color-surface)',
                }}
              />
              <div className="settings-avatar-overlay">
                <Camera size={20} />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPhotoMenu(!showPhotoMenu);
                }}
                disabled={avatarLoading}
                className="settings-avatar-camera-btn"
                title="Change Photo"
              >
                <Camera size={14} />
              </button>

              {/* Photo Action Dropdown */}
              {showPhotoMenu && (
                <div
                  className="settings-photo-dropdown"
                  style={{ zIndex: 99999, minWidth: '220px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="settings-photo-dropdown-header">
                    <span>Profile Photo Options</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotoMenu(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={avatarLoading}
                    className="settings-photo-dropdown-item"
                  >
                    <Upload size={15} color="var(--color-primary)" />
                    <span>{user?.avatar ? 'Change / Upload Photo' : 'Upload Profile Photo'}</span>
                  </button>

                  {user?.avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoMenu(false);
                        setPreviewPhoto(true);
                      }}
                      className="settings-photo-dropdown-item"
                    >
                      <Eye size={15} color="var(--color-accent)" />
                      <span>View Profile Photo</span>
                    </button>
                  )}

                  {user?.avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoMenu(false);
                        handleRemovePhoto();
                      }}
                      disabled={avatarLoading}
                      className="settings-photo-dropdown-item danger"
                    >
                      <Trash2 size={15} color="var(--color-danger)" />
                      <span>Remove Profile Photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Permanent Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                title="Upload Photo"
              >
                <Upload size={12} color="var(--color-primary)" />
                <span>{user?.avatar ? 'Change' : 'Upload'}</span>
              </button>
              {user?.avatar && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11.5px', padding: '3px 8px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleRemovePhoto}
                  disabled={avatarLoading}
                  title="Remove Photo"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Identity Details */}
          <div className="settings-hero-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {user?.name}
              </h2>
              <Badge variant={user?.role === 'admin' ? 'primary' : 'neutral'}>
                {user?.role === 'admin' ? '🛡️ Workspace Admin' : '💼 Team Member'}
              </Badge>
              <span
                style={{
                  backgroundColor: 'var(--color-surface-alt)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={12} color="#F59E0B" /> Corporate Member
              </span>
            </div>

            <div
              style={{
                fontSize: '13.5px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {user?.post || 'Staff Member'}
              </span>
              <span>•</span>
              <span>{user?.workspaceName || 'SAAS Nexus'}</span>
            </div>

            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mail size={13} />
              <span>{user?.email}</span>
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="settings-hero-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/png, image/jpeg, image/webp, image/gif"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => {
                confirm({
                  title: 'Sign Out Account',
                  message: 'Are you sure you want to sign out of your account?',
                  confirmText: 'Sign Out',
                  cancelText: 'Cancel',
                  type: 'logout',
                  onConfirm: () => {
                    logout();
                  },
                });
              }}
              className="btn btn-ghost btn-sm"
              style={{
                color: 'var(--color-danger)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                height: '34px',
                padding: '0 14px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
              }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: CORPORATE CREDENTIALS TILES */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '15.5px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <Building2 size={17} color="var(--color-primary)" /> Corporate Directory Identity
            </h3>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                marginTop: '3px',
                margin: 0,
              }}
            >
              Role credentials and organizational metadata assigned by workspace administration.
            </p>
          </div>
          <Badge variant="neutral">🔒 Enterprise Managed</Badge>
        </div>

        <div className="credential-grid">
          {/* Name Tile */}
          <div className="credential-tile">
            <span className="credential-label">
              <User size={13} color="var(--color-primary)" /> Legal Full Name
            </span>
            <span className="credential-value">{user?.name || '—'}</span>
          </div>

          {/* Corporate Email Tile with Copy */}
          <div className="credential-tile">
            <span className="credential-label">
              <Mail size={13} color="var(--color-accent)" /> Corporate Work Email
            </span>
            <div className="credential-value">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || '—'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(user?.email || '', 'Email')}
                className="btn btn-ghost btn-icon"
                style={{ width: '26px', height: '26px', padding: 0 }}
                title="Copy Email"
              >
                {copiedKey === 'Email' ? (
                  <Check size={13} color="var(--color-success)" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          </div>

          {/* Role Title */}
          <div className="credential-tile">
            <span className="credential-label">
              <Briefcase size={13} color="var(--color-success)" /> Role Designation / Post
            </span>
            <span className="credential-value">
              {user?.post || (user?.role === 'admin' ? 'Workspace Administrator' : 'Team Member')}
            </span>
          </div>

          {/* Organization Tile with Copy */}
          <div className="credential-tile">
            <span className="credential-label">
              <Building2 size={13} color="var(--color-warning)" /> Workspace Organization
            </span>
            <div className="credential-value">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.workspaceName || 'SAAS Nexus'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(user?.workspaceName || '', 'Workspace')}
                className="btn btn-ghost btn-icon"
                style={{ width: '26px', height: '26px', padding: 0 }}
                title="Copy Workspace Name"
              >
                {copiedKey === 'Workspace' ? (
                  <Check size={13} color="var(--color-success)" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PROFESSIONAL PASSWORD CHANGE */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Change Account Password
              </h3>
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-text-secondary)',
                  margin: '2px 0 0 0',
                }}
              >
                Update your account password to maintain maximum workspace security.
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
            }}
          >
            <ShieldCheck size={13} color="var(--color-success)" /> Bcrypt 256-bit
          </span>
        </div>

        {/* Success / Error Alerts */}
        {passwordSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-success-soft)',
              border: '1px solid var(--color-success)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-success)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} /> {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} /> {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Current Password Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={12} /> Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    paddingRight: '38px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '30px',
                    height: '30px',
                    padding: 0,
                  }}
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  className="form-label"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <KeyRound size={12} /> New Password
                </label>
                {strength && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: strength.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {strength.label}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    paddingRight: '38px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '30px',
                    height: '30px',
                    padding: 0,
                  }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
              {newPassword && (
                <div
                  style={{
                    marginTop: '6px',
                    height: '4px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: strength?.percent || '0%',
                      backgroundColor: strength?.color || 'var(--color-primary)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  className="form-label"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Lock size={12} /> Confirm Password
                </label>
                {confirmPassword && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color:
                        confirmPassword === newPassword
                          ? 'var(--color-success)'
                          : 'var(--color-danger)',
                    }}
                  >
                    {confirmPassword === newPassword ? '✓ Match' : '✕ Mismatch'}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    paddingRight: '38px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    borderColor:
                      confirmPassword && confirmPassword !== newPassword
                        ? 'var(--color-danger)'
                        : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '30px',
                    height: '30px',
                    padding: 0,
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Password must contain at least 6 characters. Use letters, numbers, and symbols for
              best security.
            </span>

            <button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="btn btn-primary"
              style={{
                minWidth: '160px',
                height: '40px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <KeyRound size={15} />
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      {/* Lightbox Modal for Profile Photo */}
      {previewPhoto && user?.avatar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
          }}
          onClick={() => setPreviewPhoto(false)}
        >
          <div
            style={{ position: 'relative', maxWidth: '400px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhoto(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={28} />
            </button>
            <img
              src={user.avatar}
              alt={user.name || 'Profile'}
              style={{
                width: '100%',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'contain',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
