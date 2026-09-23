import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Trash2,
  Edit2,
  Save,
  Search,
  Hash,
  Calendar,
  Camera,
  Loader2,
  AlertCircle,
  X,
  Check,
  Upload,
  Eye,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';
import PhotoLightbox from './PhotoLightbox';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import AddGroupMembersModal from './AddGroupMembersModal';

const GroupInfoModal = ({
  isOpen,
  onClose,
  group,
  allUsers = [],
  isAdmin = false,
  currentUser,
  onGroupUpdated,
  onGroupDeleted,
}) => {
  const { addToast, confirm } = useNotification();

  const userIsAdmin = isAdmin || currentUser?.role === 'admin';

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group?.name || '');
  const [editDesc, setEditDesc] = useState(group?.description || '');
  const [editPermission, setEditPermission] = useState(group?.chatPermission || 'everyone');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  // Avatar Upload & Menu State
  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Close photo menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) {
        setPhotoMenuOpen(false);
      }
    };
    if (photoMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [photoMenuOpen]);

  // Track group id to only reset form when switching channels or opening modal
  const lastGroupIdRef = useRef(null);

  // Sync state only when modal opens or a different group is selected
  useEffect(() => {
    if (isOpen && group) {
      if (lastGroupIdRef.current !== group._id) {
        lastGroupIdRef.current = group._id;
        setEditName(group.name || '');
        setEditDesc(group.description || '');
        setEditPermission(group.chatPermission || 'everyone');
        setIsEditing(false);
        setEditError('');
      }
    } else if (!isOpen) {
      lastGroupIdRef.current = null;
      setIsEditing(false);
      setEditError('');
    }
  }, [group?._id, isOpen]);

  if (!group) return null;

  const members = group.memberIds || [];
  const filteredMembers = members.filter((m) => {
    const name = m.name || '';
    const email = m.email || '';
    const post = m.post || '';
    const term = memberSearch.toLowerCase();
    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || post.toLowerCase().includes(term);
  });

  // Handle Channel Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      addToast('Image size exceeds 8MB limit.', 'error');
      return;
    }

    setAvatarLoading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.put(`/groups/${group._id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        addToast('Channel photo updated successfully!', 'success');
        if (onGroupUpdated) onGroupUpdated(data.group);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload channel photo', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Channel Photo Removal
  const handleRemovePhoto = async () => {
    try {
      setAvatarLoading(true);
      const { data } = await api.put(`/groups/${group._id}/avatar`, { avatar: '' });
      if (data.success) {
        addToast('Channel photo removed. Default icon restored.', 'info');
        if (onGroupUpdated) onGroupUpdated(data.group);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove channel photo', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Save Name, Description and Posting Permissions
  const handleSaveGroupSettings = async (e) => {
    e?.preventDefault();
    if (!editName.trim()) {
      setEditError('Channel name is required.');
      return;
    }

    setEditError('');
    setIsSaving(true);
    try {
      // 1. Update name, description, and chatPermission atomically
      const { data: updateData } = await api.put(`/groups/${group._id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
        chatPermission: editPermission,
      });

      // 2. Also call dedicated permission patch to ensure all socket rooms and audit logs are refreshed
      if (editPermission !== group.chatPermission) {
        try {
          await api.patch(`/groups/${group._id}/permission`, {
            chatPermission: editPermission,
          });
        } catch (permErr) {
          console.warn('Permission patch fallback note:', permErr);
        }
      }

      if (updateData.success) {
        const updated = {
          ...group,
          ...updateData.group,
          name: editName.trim(),
          description: editDesc.trim(),
          chatPermission: editPermission,
        };
        addToast(`Channel #${editName.trim()} saved successfully!`, 'success');
        setIsEditing(false);
        if (onGroupUpdated) onGroupUpdated(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update channel settings';
      setEditError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Participant
  const handleRemoveMember = (targetMember) => {
    confirm({
      title: 'Remove Member from Channel',
      message: `Are you sure you want to remove ${targetMember.name} from #${group.name}?`,
      confirmText: 'Remove Member',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/groups/${group._id}/members/${targetMember._id}`);
          if (data.success) {
            addToast(`Removed ${targetMember.name} from #${group.name}`, 'success');
            const updatedGroup = {
              ...group,
              memberIds: group.memberIds.filter((m) => (m._id || m) !== targetMember._id),
            };
            if (onGroupUpdated) onGroupUpdated(updatedGroup);
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to remove member', 'error');
        }
      },
    });
  };

  // Delete Channel
  const handleDeleteGroup = () => {
    confirm({
      title: `Delete Channel #${group.name}`,
      message: `Are you sure you want to delete #${group.name}? All channel members will lose access.`,
      confirmText: 'Delete Channel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/groups/${group._id}`);
          if (data.success) {
            addToast(data.message || 'Channel deleted', 'success');
            onClose();
            if (onGroupDeleted) onGroupDeleted(group._id);
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete channel', 'error');
        }
      },
    });
  };

  const isLocked = group.chatPermission === 'adminOnly';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? `Edit Channel: #${group.name}` : "Channel Info & Settings"}
        maxWidth="560px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Top Hero Photo & Basic Info Banner */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px 16px',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            position: 'relative',
          }}>
            {/* Big Channel Avatar with Interactive Click Menu */}
            <div ref={photoMenuRef} style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
              <div
                onClick={() => {
                  if (userIsAdmin) {
                    if (group.avatar) {
                      setPhotoMenuOpen((prev) => !prev);
                    } else {
                      fileInputRef.current?.click();
                    }
                  } else if (group.avatar) {
                    setLightboxSrc(group.avatar);
                  }
                }}
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  border: '3px solid var(--color-surface)',
                  cursor: (userIsAdmin || group.avatar) ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
                }}
                title={userIsAdmin ? "Click to manage channel photo" : group.avatar ? "Click to view full photo" : undefined}
              >
                {avatarLoading ? (
                  <Loader2 size={30} className="spin" />
                ) : group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Hash size={40} />
                )}

                {/* Hover overlay hint */}
                {!avatarLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      borderRadius: 'var(--radius-full)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    {userIsAdmin ? <Camera size={24} color="#FFFFFF" /> : <Eye size={24} color="#FFFFFF" />}
                  </div>
                )}
              </div>

              {/* Camera Icon Overlay Badge (Only for Admin) */}
              {userIsAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (group.avatar) {
                      setPhotoMenuOpen((prev) => !prev);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="btn btn-primary btn-icon"
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    padding: 0,
                    boxShadow: 'var(--shadow-md)',
                    border: '2px solid var(--color-surface)',
                  }}
                  title="Photo Options"
                >
                  <Camera size={13} />
                </button>
              )}

              {/* Interactive Photo Actions Dropdown Popover */}
              {userIsAdmin && photoMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '94px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-dropdown)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    zIndex: 100,
                    minWidth: '160px',
                    animation: 'slideUp 120ms ease-out',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      width: '100%',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Upload size={14} color="var(--color-primary)" />
                    <span>Upload New Photo</span>
                  </button>

                  {group.avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoMenuOpen(false);
                        setLightboxSrc(group.avatar);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        color: 'var(--color-text-primary)',
                        textAlign: 'left',
                        width: '100%',
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Eye size={14} color="var(--color-primary)" />
                      <span>View Full Photo</span>
                    </button>
                  )}

                  {group.avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoMenuOpen(false);
                        handleRemovePhoto();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        color: 'var(--color-danger)',
                        textAlign: 'left',
                        width: '100%',
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Trash2 size={14} />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Hidden Photo Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  setPhotoMenuOpen(false);
                  handlePhotoUpload(e);
                }}
              />
            </div>

            {/* View Mode Titles & Info */}
            {!isEditing ? (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  #{group.name}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', maxWidth: '440px', lineHeight: 1.45 }}>
                  {group.description || 'No description provided for this channel.'}
                </p>

                {/* Badges Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Badge variant={isLocked ? 'warning' : 'neutral'}>
                    {isLocked ? 'Admin Only Broadcast' : 'Everyone Can Chat'}
                  </Badge>
                  <Badge variant="primary" icon={Users}>
                    {members.length} Members
                  </Badge>
                  {group.createdAt && (
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      Created {new Date(group.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Admin Action: Enter Edit Mode */}
                {userIsAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditName(group.name || '');
                      setEditDesc(group.description || '');
                      setEditPermission(group.chatPermission || 'everyone');
                      setEditError('');
                      setIsEditing(true);
                    }}
                    style={{ marginTop: '14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={13} /> Edit Details & Permissions
                  </button>
                )}
              </>
            ) : null}
          </div>

          {/* Dedicated Channel Edit Form (When Edit Mode is active) */}
          {userIsAdmin && isEditing && (
            <form onSubmit={handleSaveGroupSettings} style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Edit Channel Details & Permissions
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>Editing Mode</span>
              </div>

              {editError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-danger-soft)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-danger)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Channel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Apollo"
                  className="form-input"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError('');
                  }}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  placeholder="What is this channel used for?"
                  className="form-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{ minHeight: '65px' }}
                />
              </div>

              {/* Chat Posting Permission Radios */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chat Posting Permission</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    onClick={() => setEditPermission('everyone')}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${editPermission === 'everyone' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: editPermission === 'everyone' ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="radio" name="modalChatPerm" checked={editPermission === 'everyone'} onChange={() => {}} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>Everyone Can Chat</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>All channel members can post messages and attachments</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setEditPermission('adminOnly')}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${editPermission === 'adminOnly' ? 'var(--color-warning)' : 'var(--color-border)'}`,
                      backgroundColor: editPermission === 'adminOnly' ? 'var(--color-warning-soft)' : 'var(--color-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="radio" name="modalChatPerm" checked={editPermission === 'adminOnly'} onChange={() => {}} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>Only Admin Can Chat (Broadcast Mode)</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Members can read messages, but only workspace admins can post</div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Save size={13} /> {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Members List Section (WhatsApp style) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {members.length} Participants
              </div>

              {userIsAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddMembersOpen(true)}
                  style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <UserPlus size={13} /> Add Member
                </button>
              )}
            </div>

            {/* Search members within channel */}
            {members.length > 5 && (
              <div className="search-input-box" style={{ width: '100%' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '6px 10px 6px 30px' }}
                />
              </div>
            )}

            {/* Member List */}
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  No members found.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelf = m._id === currentUser?.id || m._id === currentUser?._id;
                  const isMemberAdmin = m.role === 'admin';

                  return (
                    <div
                      key={m._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelf ? 'var(--color-surface-alt)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <Avatar name={m.name} src={m.avatar} size="sm" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                              {m.name} {isSelf && <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>(You)</span>}
                            </span>
                            {isMemberAdmin && (
                              <span style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                backgroundColor: 'var(--color-primary-soft)',
                                color: 'var(--color-primary)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}>
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {m.post || m.email}
                          </div>
                        </div>
                      </div>

                      {/* Admin action: remove participant */}
                      {userIsAdmin && !isSelf && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }}
                          onClick={() => handleRemoveMember(m)}
                          title={`Remove ${m.name} from channel`}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Danger Zone: Delete Channel (Only Admin) */}
          {userIsAdmin && (
            <div style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-danger)' }}>
                  Delete this channel
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                  Permanently delete channel and messages
                </div>
              </div>

              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteGroup}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Trash2 size={13} /> Delete Channel
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Nested Add Members Modal */}
      {isAddMembersOpen && (
        <AddGroupMembersModal
          isOpen={isAddMembersOpen}
          onClose={() => setIsAddMembersOpen(false)}
          group={group}
          allUsers={allUsers}
          onMembersAdded={(updatedGroup) => {
            if (onGroupUpdated) onGroupUpdated(updatedGroup);
            setIsAddMembersOpen(false);
          }}
        />
      )}

      {/* Lightbox to View Full Channel Photo */}
      {lightboxSrc && (
        <PhotoLightbox
          isOpen={!!lightboxSrc}
          onClose={() => setLightboxSrc(null)}
          src={lightboxSrc}
          fileName={`${group.name}-photo.png`}
        />
      )}
    </>
  );
};

export default GroupInfoModal;
