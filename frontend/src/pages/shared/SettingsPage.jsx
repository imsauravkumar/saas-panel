import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Shield,
  Bell,
  Activity,
  Mail,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Save,
  Clock,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Video,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';

const SettingsPage = ({ isDarkTheme: propDarkTheme, onToggleTheme }) => {
  const { user, setUser, logout } = useAuth();
  const { addToast, confirm } = useNotification();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'notifications', 'activity'

  // Appearance & Theme State
  const [isDark, setIsDark] = useState(() => {
    if (typeof propDarkTheme === 'boolean') return propDarkTheme;
    return localStorage.getItem('nexus_theme') === 'dark';
  });

  useEffect(() => {
    if (typeof propDarkTheme === 'boolean') {
      setIsDark(propDarkTheme);
    }
  }, [propDarkTheme]);

  const handleSelectTheme = (mode) => {
    const nextDark = mode === 'dark';
    setIsDark(nextDark);
    localStorage.setItem('nexus_theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (onToggleTheme && nextDark !== isDark) {
      onToggleTheme();
    }
    addToast(`Switched to ${nextDark ? 'Dark' : 'Light'} theme`, 'info', 2000);
  };

  // Profile State
  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Close photo menu on outside click or touch
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

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification Preferences State
  const [emailPrefs, setEmailPrefs] = useState({
    newMessage: false,
    newMeeting: true,
    taskAssigned: true,
    announcement: true,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Personal Activity State
  const [activityStats, setActivityStats] = useState({
    tasksCompleted: 0,
    meetingsAttended: 0,
    messagesSent: 0,
    recentLogs: [],
  });
  const [activityLoading, setActivityLoading] = useState(false);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast(`Copied ${key} to clipboard!`, 'info');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Fetch notification preferences & activity on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await api.get('/users/me');
        if (res.data.success && res.data.user.notificationPreferences?.email) {
          setEmailPrefs({
            newMessage: !!res.data.user.notificationPreferences.email.newMessage,
            newMeeting: res.data.user.notificationPreferences.email.newMeeting !== false,
            taskAssigned: res.data.user.notificationPreferences.email.taskAssigned !== false,
            announcement: res.data.user.notificationPreferences.email.announcement !== false,
          });
        }
      } catch (err) {
        console.warn('Failed to load user notification prefs:', err);
      }
    };

    fetchPrefs();
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const res = await api.get('/users/me/activity');
      if (res.data.success) {
        setActivityStats(res.data.activity);
      }
    } catch (err) {
      console.warn('Failed to load user activity:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab, fetchActivity]);

  // Handle Photo File Upload
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

  // Handle Photo Removal (Reset to Default Initials Avatar)
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
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Notification Preferences Save
  const handleSavePrefs = async () => {
    try {
      setPrefsSaving(true);
      const res = await api.put('/users/me/notification-preferences', {
        email: emailPrefs,
      });
      if (res.data.success) {
        addToast('Notification preferences saved!', 'success');
      }
    } catch (_err) {
      addToast('Failed to update notification settings.', 'error');
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ gap: '16px', paddingTop: '20px' }}>
      {/* Modern Segmented Tabs Navigation (All in 1 Clean Line) */}
      <div className="settings-tabs-wrapper">
        <div className="settings-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User size={15} />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          >
            <Shield size={15} />
            <span>Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          >
            <Bell size={15} />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`settings-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          >
            <Activity size={15} />
            <span>Activity</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE & IDENTITY */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sleek Modern Profile Hero Card */}
          <div className="settings-hero-card">
            <div className="settings-hero-accent">
              {/* Upper Side Theme Switcher Button */}
              <button
                type="button"
                onClick={() => handleSelectTheme(isDark ? 'light' : 'dark')}
                className="settings-theme-upper-btn"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color="#6366F1" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            <div className="settings-hero-main">
              {/* Avatar with click/tap camera popup menu */}
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

                {/* Professional Floating Photo Action Popup */}
                {showPhotoMenu && (
                  <div className="settings-photo-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="settings-photo-dropdown-header">
                      <span>Profile Photo</span>
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
                      <span>Upload New Photo</span>
                    </button>

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
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Identity Details */}
              <div className="settings-hero-info">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
                >
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

              {/* Clean Hero Actions with Quick Sign Out */}
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
                  title="Sign Out of SAAS Nexus"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Corporate Credentials Tiles */}
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
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
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
                  {user?.post ||
                    (user?.role === 'admin' ? 'Workspace Administrator' : 'Team Member')}
                </span>
              </div>

              {/* Organization Tile with Copy */}
              <div className="credential-tile">
                <span className="credential-label">
                  <Building2 size={13} color="var(--color-warning)" /> Workspace Organization
                </span>
                <div className="credential-value">
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY & PASSWORD */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}
            >
              <KeyRound size={20} color="var(--color-primary)" />
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Change Account Password
              </h3>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                marginBottom: '20px',
              }}
            >
              Ensure your account is protected with a secure password containing at least 6
              characters.
            </p>

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
                  marginBottom: '18px',
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
                  marginBottom: '18px',
                }}
              >
                <AlertCircle size={16} /> {passwordError}
              </div>
            )}

            <form
              onSubmit={handleChangePassword}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ paddingRight: '38px' }}
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
                      width: '28px',
                      height: '28px',
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingRight: '38px' }}
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
                      width: '28px',
                      height: '28px',
                    }}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '38px' }}
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
                      width: '28px',
                      height: '28px',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '42px',
                  marginTop: '6px',
                  justifyContent: 'center',
                }}
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Security Info Tile */}
          <div
            className="card"
            style={{ padding: '18px 22px', backgroundColor: 'var(--color-surface-alt)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '13.5px',
                marginBottom: '6px',
              }}
            >
              <ShieldCheck size={17} color="var(--color-success)" /> Active Session Security
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
              }}
            >
              Your session is protected with <strong>TLS 256-bit encryption</strong> and
              authenticated via secure JWT sessions.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NOTIFICATION PREFERENCES */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}
            >
              <Bell size={20} color="var(--color-primary)" />
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Notification Preferences
              </h3>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                marginBottom: '20px',
              }}
            >
              Configure how and when you receive notifications across workspace channels and email.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Chat Messages */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      Direct Messages & Mentions
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Receive email digests for direct messages & channel mentions
                    </div>
                  </div>
                </div>

                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={emailPrefs.newMessage}
                    onChange={(e) => setEmailPrefs({ ...emailPrefs, newMessage: e.target.checked })}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {/* Row 2: Meetings */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(6, 182, 212, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                    }}
                  >
                    <Video size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      Meeting Invitations & Updates
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Email invitations with Google Meet video join links
                    </div>
                  </div>
                </div>

                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={emailPrefs.newMeeting}
                    onChange={(e) => setEmailPrefs({ ...emailPrefs, newMeeting: e.target.checked })}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {/* Row 3: Tasks */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success)',
                      flexShrink: 0,
                    }}
                  >
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      Task Assignments & Deadlines
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Email alerts when tasks are assigned or due dates updated
                    </div>
                  </div>
                </div>

                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={emailPrefs.taskAssigned}
                    onChange={(e) =>
                      setEmailPrefs({ ...emailPrefs, taskAssigned: e.target.checked })
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {/* Row 4: Announcements */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-warning)',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      Workspace Bulletins & Announcements
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Priority email delivery for company-wide bulletins
                    </div>
                  </div>
                </div>

                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={emailPrefs.announcement}
                    onChange={(e) =>
                      setEmailPrefs({ ...emailPrefs, announcement: e.target.checked })
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  disabled={prefsSaving}
                  className="btn btn-primary"
                  style={{ minWidth: '160px', height: '40px' }}
                >
                  <Save size={15} />
                  {prefsSaving ? 'Saving Preferences...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MY ACTIVITY & AUDIT TIMELINE */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metrics Row */}
          <div className="stat-grid">
            <div className="stat-card">
              <div
                className="stat-icon-wrapper"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))',
                  color: 'var(--color-success)',
                }}
              >
                <CheckSquare size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{activityStats.tasksCompleted}</div>
                <div className="stat-lbl">Tasks Completed</div>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon-wrapper"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.25))',
                  color: 'var(--color-accent)',
                }}
              >
                <Video size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{activityStats.meetingsAttended}</div>
                <div className="stat-lbl">Meetings Attended</div>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon-wrapper"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(99, 102, 241, 0.25))',
                  color: 'var(--color-primary)',
                }}
              >
                <MessageSquare size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{activityStats.messagesSent}</div>
                <div className="stat-lbl">Messages Sent</div>
              </div>
            </div>
          </div>

          {/* Activity Timeline Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
            >
              <Activity size={18} color="var(--color-primary)" />
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Recent Account Activity
              </h3>
            </div>

            {activityLoading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                }}
              >
                Loading activity audit timeline...
              </div>
            ) : activityStats.recentLogs?.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                }}
              >
                <Clock size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <div>No recent activity recorded for your account yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activityStats.recentLogs?.map((log) => (
                  <div
                    key={log._id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-alt)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                        }}
                      >
                        {log.details || log.action}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(log.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
