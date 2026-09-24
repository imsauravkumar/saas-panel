import { useState, useRef } from 'react';
import {
  Plus,
  Users,
  Trash2,
  ExternalLink,
  Search,
  Layers,
  AlertCircle,
  UserPlus,
  Settings,
  Camera,
  Upload,
  Hash,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Avatar from '../../components/Avatar';
import AddGroupMembersModal from '../../components/AddGroupMembersModal';
import GroupInfoModal from '../../components/GroupInfoModal';

const AdminGroups = ({ groups = [], users = [], fetchGroups, onSelectGroupDashboard }) => {
  const { user } = useAuth();
  const { addToast, confirm } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');

  // Group Info / Settings Modal State
  const [infoModalGroup, setInfoModalGroup] = useState(null);

  // Create Channel Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAvatarFile, setCreateAvatarFile] = useState(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState('');
  const createAvatarInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    chatPermission: 'everyone',
    memberIds: [],
  });

  // Add Members Modal State
  const [managingMembersGroup, setManagingMembersGroup] = useState(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setFormError('Channel name is required.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/groups', formData);
      if (data.success) {
        // If avatar selected, upload it immediately
        if (createAvatarFile && data.group?._id) {
          try {
            const avatarFormData = new FormData();
            avatarFormData.append('avatar', createAvatarFile);
            await api.put(`/groups/${data.group._id}/avatar`, avatarFormData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch (avatarErr) {
            console.warn('Avatar upload failed on creation:', avatarErr);
          }
        }

        addToast(`Channel #${data.group.name} created successfully!`, 'success');
        setIsCreateOpen(false);
        setFormError('');
        setCreateAvatarFile(null);
        setCreateAvatarPreview('');
        if (fetchGroups) fetchGroups();
        if (onSelectGroupDashboard) onSelectGroupDashboard(data.group._id);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create channel';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (group, e) => {
    if (e) e.stopPropagation();
    setInfoModalGroup(group);
  };

  const handleDeleteGroup = (group, e) => {
    if (e) e.stopPropagation();
    confirm({
      title: `Delete Channel #${group.name}`,
      message: `Are you sure you want to delete #${group.name}? All channel members will lose access to its messages and files.`,
      confirmText: 'Delete Channel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/groups/${group._id}`);
          if (data.success) {
            addToast(data.message || `Channel #${group.name} deleted`, 'success');
            if (fetchGroups) fetchGroups();
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete channel', 'error');
        }
      },
    });
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Channels</h1>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setFormData({
              name: '',
              description: '',
              chatPermission: 'everyone',
              memberIds: users.map((u) => u._id), // default all users checked
            });
            setIsCreateOpen(true);
          }}
        >
          <Plus size={15} /> Create Channel
        </button>
      </div>

      {/* Search Bar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search channels by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--color-text-muted)' }}
        >
          <Layers size={42} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-primary)' }} />
          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text-primary)' }}>
            No channels found
          </div>
          <p style={{ fontSize: '13px', maxWidth: '360px', margin: '6px auto 16px auto' }}>
            {searchTerm
              ? 'No channels matched your search term.'
              : 'Channels allow your workspace members to collaborate in dedicated team spaces.'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                chatPermission: 'everyone',
                memberIds: users.map((u) => u._id),
              });
              setIsCreateOpen(true);
            }}
          >
            <Plus size={14} /> Create Channel
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '16px',
          }}
        >
          {filteredGroups.map((group) => {
            const isLocked = group.chatPermission === 'adminOnly';

            return (
              <div key={group._id} className="group-card">
                {/* Header Row */}
                <div className="group-card-header">
                  <div
                    className="group-card-info"
                    onClick={() => handleOpenEdit(group)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view/edit channel details & photo"
                  >
                    <div className="group-avatar-box">
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                        />
                      ) : (
                        <Hash size={20} />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h3 className="group-card-title">
                        #{group.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '3px',
                        }}
                      >
                        <Users size={13} />
                        <span>{group.memberIds?.length || 0} members</span>
                      </div>
                    </div>
                  </div>

                  <span className={`task-priority-chip ${isLocked ? 'high' : 'low'}`}>
                    <span className="task-priority-dot" style={{ background: isLocked ? '#F59E0B' : '#10B981' }} />
                    {isLocked ? 'Admin Only' : 'Everyone'}
                  </span>
                </div>

                {/* Description */}
                <p className="group-card-desc">
                  {group.description || 'No description provided for this channel.'}
                </p>

                {/* Member Preview Avatars & Action Controls */}
                <div className="group-card-footer">
                  <div className="task-card-avatars">
                    {group.memberIds?.slice(0, 4).map((m, i) => (
                      <div
                        key={m._id || m || i}
                        className="task-card-avatar-item"
                        title={m.name || 'Member'}
                      >
                        <Avatar
                          name={m.name || 'Member'}
                          src={m.avatar}
                          size="xs"
                        />
                      </div>
                    ))}
                    {(group.memberIds?.length || 0) > 4 && (
                      <div
                        className="task-card-avatar-item"
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: 'var(--color-surface-alt)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        +{group.memberIds.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Channel Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="task-card-quick-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingMembersGroup(group);
                      }}
                      title="Add Members to Channel"
                    >
                      <UserPlus size={13} />
                    </button>

                    <button
                      type="button"
                      className="task-card-quick-btn"
                      onClick={(e) => handleOpenEdit(group, e)}
                      title="Channel Settings & Photo"
                    >
                      <Settings size={13} />
                    </button>

                    <button
                      type="button"
                      className="task-card-quick-btn danger"
                      onClick={(e) => handleDeleteGroup(group, e)}
                      title="Delete Channel"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{
                        fontSize: '12px',
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '2px',
                      }}
                      onClick={() => onSelectGroupDashboard && onSelectGroupDashboard(group._id)}
                      title="Open Channel Space"
                    >
                      <span>Open</span> <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Create Group Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormError('');
          setCreateAvatarFile(null);
          setCreateAvatarPreview('');
        }}
        title="Create New Channel"
        maxWidth="540px"
      >
        <form
          onSubmit={handleCreateSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-danger-soft)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Optional Channel Photo Upload */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Channel Photo / Icon (Optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                onClick={() => createAvatarInputRef.current?.click()}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '2px solid var(--color-border)',
                }}
                title="Upload Photo"
              >
                {createAvatarPreview ? (
                  <img
                    src={createAvatarPreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Camera size={20} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => createAvatarInputRef.current?.click()}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '12px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Upload size={13} /> {createAvatarFile ? 'Change Photo' : 'Upload Photo'}
                </button>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  PNG, JPG or WebP up to 8MB
                </span>
              </div>
              <input
                ref={createAvatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCreateAvatarFile(file);
                    setCreateAvatarPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Channel Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 🎯 Project Apollo"
              className="form-input"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formError) setFormError('');
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description (Optional)</label>
            <textarea
              placeholder="What will this channel be used for?"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Chat Posting Permission Radio Section */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Chat Posting Permission</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                onClick={() => setFormData({ ...formData, chatPermission: 'everyone' })}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${formData.chatPermission === 'everyone' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor:
                    formData.chatPermission === 'everyone'
                      ? 'var(--color-primary-soft)'
                      : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="modalChatPermission"
                  checked={formData.chatPermission === 'everyone'}
                  onChange={() => {}}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Everyone Can Chat
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    All members can post, reply, and share attachments in this space.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setFormData({ ...formData, chatPermission: 'adminOnly' })}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${formData.chatPermission === 'adminOnly' ? 'var(--color-warning)' : 'var(--color-border)'}`,
                  backgroundColor:
                    formData.chatPermission === 'adminOnly'
                      ? 'var(--color-warning-soft)'
                      : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="modalChatPermission"
                  checked={formData.chatPermission === 'adminOnly'}
                  onChange={() => {}}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Only Admin Can Chat (Broadcast Mode)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Members can read messages, but only Workspace Admins can post.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Select Initial Users */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">
                Initial Members ({formData.memberIds.length} selected)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (formData.memberIds.length === users.length) {
                    setFormData({ ...formData, memberIds: [] });
                  } else {
                    setFormData({ ...formData, memberIds: users.map((u) => u._id) });
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {formData.memberIds.length === users.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px',
              }}
            >
              {users.map((u) => {
                const isChecked = formData.memberIds.includes(u._id);
                return (
                  <label
                    key={u._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, memberIds: [...formData.memberIds, u._id] });
                        } else {
                          setFormData({
                            ...formData,
                            memberIds: formData.memberIds.filter((id) => id !== u._id),
                          });
                        }
                      }}
                    />
                    <Avatar name={u.name} src={u.avatar} size="sm" />
                    <span>
                      {u.name} ({u.post || 'Member'})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setFormError('');
                setCreateAvatarFile(null);
                setCreateAvatarPreview('');
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating Channel...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Members to Group Modal */}
      {managingMembersGroup && (
        <AddGroupMembersModal
          isOpen={!!managingMembersGroup}
          onClose={() => setManagingMembersGroup(null)}
          group={managingMembersGroup}
          allUsers={users}
          onMembersAdded={() => {
            if (fetchGroups) fetchGroups();
            setManagingMembersGroup(null);
          }}
        />
      )}

      {/* 3. WhatsApp-Style Group Info & Settings Modal */}
      {infoModalGroup && (
        <GroupInfoModal
          isOpen={!!infoModalGroup}
          onClose={() => setInfoModalGroup(null)}
          group={infoModalGroup}
          allUsers={users}
          isAdmin={true}
          currentUser={user}
          onGroupUpdated={(updatedGroup) => {
            if (fetchGroups) fetchGroups();
            setInfoModalGroup(updatedGroup);
          }}
          onGroupDeleted={() => {
            if (fetchGroups) fetchGroups();
            setInfoModalGroup(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminGroups;
