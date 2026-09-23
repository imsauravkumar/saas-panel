import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Lock,
  Phone,
  Save,
  KeyRound,
  Shield,
  Briefcase,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';

const UserProfile = () => {
  const { user, setUser, updateProfile, updatePassword } = useAuth();
  const { addToast } = useNotification();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({ name, phone });
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(currentPassword, newPassword);
      addToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Account & Profile Settings</h1>
          <p>View your role credentials and manage personal profile settings.</p>
        </div>
      </div>

      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Details Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar name={user?.name} src={user?.avatar} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                title="Change photo"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '26px',
                  height: '26px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  border: '2px solid var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                }}
              >
                <Camera size={13} />
              </button>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>{user?.name}</h2>
                <Badge variant={user?.role === 'admin' ? 'primary' : 'neutral'}>
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {user?.post || 'Team Member'}
              </div>

              {/* Photo Upload Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Upload size={13} />
                  {avatarLoading ? 'Uploading...' : 'Upload Photo'}
                </button>
                {user?.avatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={avatarLoading}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '12px', padding: '5px 8px', color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="responsive-form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Work Email (Admin-Managed)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    disabled
                    className="form-input"
                    style={{ backgroundColor: 'var(--color-surface-alt)', cursor: 'not-allowed', paddingLeft: '32px' }}
                    value={user?.email || ''}
                  />
                  <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role Title (Admin-Managed)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input"
                    style={{ backgroundColor: 'var(--color-surface-alt)', cursor: 'not-allowed', paddingLeft: '32px' }}
                    value={user?.post || 'Team Member'}
                  />
                  <Briefcase size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isSavingProfile} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
              <Save size={15} /> Save Profile Details
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} color="var(--color-primary)" /> Security & Password
          </h3>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password (min 6 characters)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
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
                placeholder="••••••••"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isSavingPassword} className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
