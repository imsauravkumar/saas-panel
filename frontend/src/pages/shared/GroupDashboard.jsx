import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Users,
  FileText,
  Video,
  Settings,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Trash2,
  Save,
  Clock,
  ExternalLink,
  Shield,
  AlertTriangle,
  Send,
  Plus,
  Calendar,
  Copy,
  Check,
  Eye,
  Camera,
  Upload,
  Hash,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import AddGroupMembersModal from '../../components/AddGroupMembersModal';
import CreateMeetingModal from '../../components/CreateMeetingModal';
import MeetingDetailModal from '../../components/MeetingDetailModal';
import CreateTaskModal from '../../components/CreateTaskModal';
import TaskDetailModal from '../../components/TaskDetailModal';
import GroupInfoModal from '../../components/GroupInfoModal';
import GroupChat from './GroupChat';

const GroupDashboard = ({ groupId, onBack, onGroupDeleted, onSelectChatGroup, allUsers = [] }) => {
  const { user, isAdmin } = useAuth();
  const { socket, joinGroupRoom, leaveGroupRoom } = useSocket();
  const { addToast, confirm } = useNotification();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'members' | 'files' | 'meetings' | 'settings'

  // Modals state
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [groupMeetings, setGroupMeetings] = useState([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [groupTasks, setGroupTasks] = useState([]);

  // Settings form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPermission, setEditPermission] = useState('everyone');
  const [savingSettings, setSavingSettings] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef(null);

  // Fetch full group details
  const fetchGroupDetail = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/groups/${groupId}`);
      if (data.success) {
        setGroup(data.group);
        setEditName(data.group.name);
        setEditDescription(data.group.description || '');
        setEditPermission(data.group.chatPermission || 'everyone');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load group channel', 'error');
      if (onBack) onBack();
    } finally {
      setLoading(false);
    }
  }, [groupId, addToast, onBack]);

  // Fetch channel-specific meetings
  const fetchGroupMeetings = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data } = await api.get(`/meetings?groupId=${groupId}`);
      if (data.success) {
        setGroupMeetings(data.meetings);
      }
    } catch (err) {
      console.warn('Failed to load group meetings:', err);
    }
  }, [groupId]);

  // Fetch channel-specific tasks
  const fetchGroupTasks = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data } = await api.get(`/tasks?groupId=${groupId}`);
      if (data.success) {
        setGroupTasks(data.tasks);
      }
    } catch (err) {
      console.warn('Failed to load group tasks:', err);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupDetail();
    fetchGroupMeetings();
    fetchGroupTasks();
    joinGroupRoom(groupId);

    return () => {
      leaveGroupRoom(groupId);
    };
  }, [groupId, fetchGroupDetail, fetchGroupMeetings, fetchGroupTasks, joinGroupRoom, leaveGroupRoom]);

  // Real-time Socket.IO Listeners for permission & member changes
  useEffect(() => {
    if (!socket || !groupId) return;

    const handlePermissionChanged = ({ groupId: changedId, chatPermission }) => {
      if (changedId === groupId) {
        setGroup((prev) => (prev ? { ...prev, chatPermission } : null));
        setEditPermission(chatPermission);
        addToast(
          `Channel posting permission changed to ${chatPermission === 'adminOnly' ? 'Admin Only' : 'Everyone'}`,
          'info'
        );
      }
    };

    const handleMemberRemoved = ({ groupId: changedId, userId }) => {
      if (changedId === groupId) {
        if (userId === user?.id) {
          addToast('You have been removed from this channel', 'warning');
          if (onBack) onBack();
        } else {
          setGroup((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              memberIds: prev.memberIds.filter((m) => (m._id || m).toString() !== userId),
            };
          });
        }
      }
    };

    const handleMembersAdded = ({ groupId: changedId }) => {
      if (changedId === groupId) {
        fetchGroupDetail();
      }
    };

    socket.on('group:permissionChanged', handlePermissionChanged);
    socket.on('group:memberRemoved', handleMemberRemoved);
    socket.on('group:membersAdded', handleMembersAdded);
    socket.on('meeting:new', fetchGroupMeetings);
    socket.on('meeting_created', fetchGroupMeetings);
    socket.on('meeting:updated', fetchGroupMeetings);
    socket.on('meeting:cancelled', fetchGroupMeetings);
    socket.on('task_created', fetchGroupTasks);
    socket.on('task:new', fetchGroupTasks);
    socket.on('task:assigned', fetchGroupTasks);
    socket.on('task_updated', fetchGroupTasks);
    socket.on('task:statusChanged', fetchGroupTasks);
    socket.on('task:deleted', fetchGroupTasks);

    return () => {
      socket.off('group:permissionChanged', handlePermissionChanged);
      socket.off('group:memberRemoved', handleMemberRemoved);
      socket.off('group:membersAdded', handleMembersAdded);
      socket.off('meeting:new', fetchGroupMeetings);
      socket.off('meeting_created', fetchGroupMeetings);
      socket.off('meeting:updated', fetchGroupMeetings);
      socket.off('meeting:cancelled', fetchGroupMeetings);
      socket.off('task_created', fetchGroupTasks);
      socket.off('task:new', fetchGroupTasks);
      socket.off('task:assigned', fetchGroupTasks);
      socket.off('task_updated', fetchGroupTasks);
      socket.off('task:statusChanged', fetchGroupTasks);
      socket.off('task:deleted', fetchGroupTasks);
    };
  }, [socket, groupId, user?.id, addToast, onBack, fetchGroupDetail, fetchGroupMeetings, fetchGroupTasks]);

  // Settings: Save Rename, Description & Chat Permission
  const handleSaveInfo = async (e) => {
    e?.preventDefault();
    if (!editName.trim()) {
      addToast('Channel name is required.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const { data } = await api.put(`/groups/${groupId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        chatPermission: editPermission,
      });

      if (data.success) {
        setGroup(data.group);
        setEditName(data.group.name);
        setEditDescription(data.group.description || '');
        setEditPermission(data.group.chatPermission || 'everyone');
        addToast('Channel settings & permissions saved successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update channel settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Settings: Update Chat Permission instantly
  const handlePermissionUpdate = async (newPermission) => {
    setEditPermission(newPermission);
    try {
      const { data } = await api.patch(`/groups/${groupId}/permission`, {
        chatPermission: newPermission,
      });

      if (data.success) {
        setGroup((prev) => (prev ? { ...prev, chatPermission: newPermission } : null));
        addToast(data.message || `Posting permission updated to ${newPermission === 'adminOnly' ? 'Admin Only' : 'Everyone'}`, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update permission', 'error');
    }
  };

  // Members: Remove Member
  const handleRemoveMember = (targetUser) => {
    confirm({
      title: 'Remove Member from Channel',
      message: `Are you sure you want to remove ${targetUser.name} from #${group.name}?`,
      confirmText: 'Remove Member',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/groups/${groupId}/members/${targetUser._id}`);
          if (data.success) {
            addToast(`Removed ${targetUser.name} from channel`, 'success');
            setGroup((prev) => ({
              ...prev,
              memberIds: prev.memberIds.filter((m) => m._id !== targetUser._id),
            }));
          }
        } catch (err) {
          addToast('Failed to remove member', 'error');
        }
      },
    });
  };

  // Settings: Soft Delete Group
  const handleDeleteGroup = () => {
    confirm({
      title: `Delete Channel #${group.name}`,
      message: `Are you sure you want to delete #${group.name}? All channel members will lose access.`,
      confirmText: 'Delete Channel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/groups/${groupId}`);
          if (data.success) {
            addToast(data.message, 'success');
            if (onGroupDeleted) onGroupDeleted(groupId);
            if (onBack) onBack();
          }
        } catch (err) {
          addToast('Failed to delete group channel', 'error');
        }
      },
    });
  };

  // Handle Channel Photo Upload directly
  const handleAvatarUpload = async (e) => {
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
      const { data } = await api.put(`/groups/${groupId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        addToast('Channel photo updated successfully!', 'success');
        setGroup(data.group);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload channel photo', 'error');
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Handle Channel Photo Removal
  const handleRemoveAvatar = async () => {
    try {
      setAvatarLoading(true);
      const { data } = await api.put(`/groups/${groupId}/avatar`, { avatar: '' });
      if (data.success) {
        addToast('Channel photo removed.', 'info');
        setGroup(data.group);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove channel photo', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading channel dashboard...</div>
      </div>
    );
  }

  const isLocked = group.chatPermission === 'adminOnly';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: 'var(--color-bg)' }}>
      {/* Top Header Banner */}
      <div style={{
        padding: '16px 28px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: '34px', height: '34px' }}
              onClick={onBack}
              title="Back to Channels"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* Clickable Channel Avatar & Title (WhatsApp-style Channel Info trigger) */}
          <div
            onClick={() => setIsGroupInfoOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Click to view channel information, change photo & settings"
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {group.avatar ? (
                <img src={group.avatar} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Hash size={22} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 700 }}>#{group.name}</h1>
                <Badge variant={isLocked ? 'warning' : 'neutral'}>
                  {isLocked ? 'Admin Only' : 'Everyone Can Chat'}
                </Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {group.description || 'Tap here for channel details, photo & members'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          border: '1px solid var(--color-border)',
          gap: '2px',
        }}>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'chat' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'chat' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'chat' ? 600 : 500,
            }}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={14} /> Chat
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'members' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'members' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'members' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'members' ? 600 : 500,
            }}
            onClick={() => setActiveTab('members')}
          >
            <Users size={14} /> Members ({group.memberIds?.length || 0})
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'files' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'files' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'files' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'files' ? 600 : 500,
            }}
            onClick={() => setActiveTab('files')}
          >
            <FileText size={14} /> Files
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'tasks' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'tasks' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'tasks' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'tasks' ? 600 : 500,
            }}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={14} /> Tasks ({groupTasks.length})
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'meetings' ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === 'meetings' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'meetings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'meetings' ? 600 : 500,
            }}
            onClick={() => setActiveTab('meetings')}
          >
            <Video size={14} /> Meetings ({groupMeetings.length})
          </button>

          {isAdmin && (
            <button
              className={`btn btn-ghost btn-sm ${activeTab === 'settings' ? 'active' : ''}`}
              style={{
                backgroundColor: activeTab === 'settings' ? 'var(--color-surface)' : 'transparent',
                color: activeTab === 'settings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'settings' ? 600 : 500,
              }}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={14} /> Settings
            </button>
          )}
        </div>
      </div>

      {/* Tab Body View Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tab 1: Chat View */}
        {activeTab === 'chat' && (
          <GroupChat
            groups={[group]}
            activeGroupId={group._id}
            onSelectGroup={() => {}}
            embedded={true}
          />
        )}

        {/* Tab 2: Members Directory */}
        {activeTab === 'members' && (
          <div className="page-container">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <h2 style={{ fontSize: '16px' }}>Channel Members ({group.memberIds?.length || 0})</h2>
                <p style={{ fontSize: '13px' }}>Teammates currently participating in #{group.name}</p>
              </div>

              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddMembersOpen(true)}
                >
                  <UserPlus size={14} /> Add Member
                </button>
              )}
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role & Post Label</th>
                    <th>Department</th>
                    <th>Status</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {group.memberIds?.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar name={m.name} src={m.avatar} size="md" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge variant={m.role === 'admin' ? 'primary' : 'neutral'}>
                            {m.role?.toUpperCase()}
                          </Badge>
                          <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                            {m.post || 'Member'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px' }}>{m.department || 'General'}</span>
                      </td>

                      <td>
                        <Badge variant={m.status === 'active' ? 'success' : 'danger'}>
                          {m.status?.toUpperCase()}
                        </Badge>
                      </td>

                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}
                            title="Remove from Channel"
                            onClick={() => handleRemoveMember(m)}
                          >
                            <UserMinus size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Files View (Placeholder for Phase 4) */}
        {activeTab === 'files' && (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h2 style={{ fontSize: '16px' }}>Shared Files & Documents</h2>
                <p style={{ fontSize: '13px' }}>Photos and documents shared in #{group.name}</p>
              </div>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                Channel File Repository
              </div>
              <p style={{ fontSize: '13px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
                Files uploaded during live chat conversations will automatically be indexed and cataloged here.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3.5: Channel Tasks & Work Assignment */}
        {activeTab === 'tasks' && (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h2 style={{ fontSize: '16px' }}>Channel Tasks ({groupTasks.length})</h2>
                <p style={{ fontSize: '13px' }}>Work deliverables and assignments for #{group.name}</p>
              </div>

              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsCreateTaskOpen(true)}
                >
                  <Plus size={14} /> Assign Work Task
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))', gap: '16px' }}>
              {groupTasks.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                  <CheckSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-primary)' }} />
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>No tasks assigned in this channel</div>
                  <p style={{ fontSize: '13px', margin: '4px auto 14px auto', maxWidth: '340px' }}>
                    Admins can assign deliverables and track progress with real-time status updates.
                  </p>
                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setIsCreateTaskOpen(true)}
                    >
                      <Plus size={14} /> Assign Work Task
                    </button>
                  )}
                </div>
              ) : (
                groupTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  const isInProgress = t.status === 'inprogress';
                  const deadlineDate = new Date(t.deadline);
                  const isOverdue = !isDone && deadlineDate < new Date();

                  return (
                    <div
                      key={t._id}
                      className="card"
                      style={{
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        borderTop: `3px solid ${
                          t.priority === 'urgent'
                            ? 'var(--color-danger)'
                            : t.priority === 'high'
                            ? 'var(--color-warning)'
                            : t.priority === 'medium'
                            ? 'var(--color-primary)'
                            : 'var(--color-success)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge variant={isDone ? 'success' : isInProgress ? 'primary' : 'neutral'}>
                          {isDone ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'TO DO'}
                        </Badge>
                        <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'neutral'}>
                          {t.priority.toUpperCase()}
                        </Badge>
                      </div>

                      <div>
                        <h3
                          style={{ fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', color: 'var(--color-text-primary)' }}
                          onClick={() => setViewingTask(t)}
                        >
                          {t.title}
                        </h3>
                        {t.description && (
                          <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                            {t.description}
                          </p>
                        )}
                      </div>

                      {/* Assignees Avatars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Assigned:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {(t.assignedTo || []).map((u) => (
                            <Avatar key={u._id || u} name={u.name || 'Member'} src={u.avatar} size="xs" />
                          ))}
                        </div>
                      </div>

                      {/* Deadline */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)', marginTop: 'auto' }}>
                        <Calendar size={13} color={isOverdue ? 'var(--color-danger)' : 'inherit'} />
                        <span>Due {deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Bottom Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '12px', padding: '2px 6px' }}
                          onClick={() => setViewingTask(t)}
                        >
                          <Eye size={13} /> View Details
                        </button>

                        {(isAdmin || t.assignedTo?.some((u) => (u._id || u).toString() === (user?.id || '').toString())) && (
                          <button
                            type="button"
                            className={`btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ fontSize: '11.5px', padding: '3px 8px' }}
                            onClick={async () => {
                              const nextStatus = isDone ? 'todo' : isInProgress ? 'completed' : 'inprogress';
                              await api.patch(`/tasks/${t._id}/status`, { status: nextStatus });
                              addToast(`Task marked as ${nextStatus.toUpperCase()}`, 'info');
                              fetchGroupTasks();
                            }}
                          >
                            <Check size={12} /> {isDone ? 'Reopen' : isInProgress ? 'Complete' : 'Start'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Channel Meetings */}
        {activeTab === 'meetings' && (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h2 style={{ fontSize: '16px' }}>Channel Meetings ({groupMeetings.length})</h2>
                <p style={{ fontSize: '13px' }}>Google Meet sessions scheduled for #{group.name}</p>
              </div>

              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsCreateMeetingOpen(true)}
                >
                  <Plus size={14} /> Schedule Meeting
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
              {groupMeetings.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                  <Video size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-primary)' }} />
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>No channel meetings scheduled</div>
                  <p style={{ fontSize: '13px', margin: '4px auto 14px auto', maxWidth: '340px' }}>
                    Schedule Google Meet syncs for #{group.name} and all members will be notified automatically.
                  </p>
                  {isAdmin && (
                    <button className="btn btn-primary btn-sm" onClick={() => setIsCreateMeetingOpen(true)}>
                      <Plus size={14} /> Schedule First Meeting
                    </button>
                  )}
                </div>
              ) : (
                groupMeetings.map((m) => {
                  const isUpcoming = m.status === 'upcoming';
                  const isCancelled = m.status === 'cancelled';
                  const meetDate = new Date(m.dateTime);

                  return (
                    <div key={m._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge variant={isCancelled ? 'danger' : isUpcoming ? 'primary' : 'success'}>
                          {m.status.toUpperCase()}
                        </Badge>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}
                          onClick={() => setViewingMeeting(m)}
                        >
                          <Eye size={13} /> View
                        </button>
                      </div>

                      <div>
                        <h3
                          style={{ fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => setViewingMeeting(m)}
                        >
                          {m.title}
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                          {m.description || 'No description provided.'}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '12px',
                          backgroundColor: 'var(--color-surface-alt)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="var(--color-primary)" />
                          <span>{meetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="var(--color-primary)" />
                          <span>{meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.durationMinutes} min)</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                        {!isCancelled ? (
                          <a
                            href={m.googleMeetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ width: '100%', backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', fontWeight: 600 }}
                          >
                            <Video size={14} /> Join Google Meet <ExternalLink size={12} />
                          </a>
                        ) : (
                          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                            Meeting Cancelled
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Settings (Admin Only) */}
        {activeTab === 'settings' && isAdmin && (
          <div className="page-container" style={{ maxWidth: '680px' }}>
            {/* Channel Photo Card */}
            <div className="card">
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Channel Photo / Icon</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                Click on the avatar below to change or update the channel photo.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    width: '78px',
                    height: '78px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '3px solid var(--color-surface)',
                    boxShadow: 'var(--shadow-md)',
                    position: 'relative',
                  }}
                  title="Click to change channel photo"
                >
                  {avatarLoading ? (
                    <Loader2 size={26} className="spin" />
                  ) : group.avatar ? (
                    <img src={group.avatar} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Hash size={36} />
                  )}

                  {/* Hover Camera Overlay */}
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
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <Camera size={22} color="#FFFFFF" />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-text-primary)' }}>
                    {group.avatar ? 'Custom Channel Photo' : 'Default Channel Icon'}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Tap the photo to upload a new image. (JPG, PNG, WebP up to 8MB)
                  </span>
                  {group.avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        fontWeight: 600,
                        marginTop: '4px',
                      }}
                    >
                      Remove photo & reset to default icon
                    </button>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            {/* Channel Settings & Permission Form Card */}
            <div className="card">
              <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Channel Settings & Permissions</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '18px' }}>
                Manage channel name, description, and message posting rules.
              </p>

              <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Channel Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Provide a description for this channel..."
                    style={{ minHeight: '70px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Chat Posting Permission</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label
                      onClick={() => handlePermissionUpdate('everyone')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${editPermission === 'everyone' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: editPermission === 'everyone' ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="chatPermission"
                        checked={editPermission === 'everyone'}
                        onChange={() => {}}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-text-primary)' }}>
                          Everyone Can Chat (Open Discussion)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          All channel members can post messages, reply, and upload photo/document attachments.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => handlePermissionUpdate('adminOnly')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${editPermission === 'adminOnly' ? 'var(--color-warning)' : 'var(--color-border)'}`,
                        backgroundColor: editPermission === 'adminOnly' ? 'var(--color-warning-soft)' : 'var(--color-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="chatPermission"
                        checked={editPermission === 'adminOnly'}
                        onChange={() => {}}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-text-primary)' }}>
                          Only Admin Can Chat (Broadcast Mode)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Members can read messages and files, but only Workspace Administrators can post. Non-admin posts are blocked.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                  <button type="submit" disabled={savingSettings} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} /> {savingSettings ? 'Saving Changes...' : 'Save All Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--color-danger)', marginBottom: '6px' }}>Danger Zone</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Soft-deleting this channel will remove it from all members' active channels list.
              </p>

              <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup}>
                <Trash2 size={14} /> Soft Delete Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Group Members Modal */}
      {isAddMembersOpen && (
        <AddGroupMembersModal
          isOpen={isAddMembersOpen}
          onClose={() => setIsAddMembersOpen(false)}
          group={group}
          allUsers={allUsers}
          onMembersAdded={(updatedGroup) => setGroup(updatedGroup)}
        />
      )}

      {/* Schedule Meeting Modal */}
      {isCreateMeetingOpen && (
        <CreateMeetingModal
          isOpen={isCreateMeetingOpen}
          onClose={() => setIsCreateMeetingOpen(false)}
          onSubmit={async (formData) => {
            const { data } = await api.post('/meetings', { ...formData, groupId });
            if (data.success) {
              addToast('Channel meeting scheduled and Google Meet link generated!', 'success');
              fetchGroupMeetings();
            }
          }}
          initialData={{ groupId }}
          groups={[group]}
          allUsers={allUsers}
        />
      )}

      {/* View Meeting Detail Modal */}
      {viewingMeeting && (
        <MeetingDetailModal
          isOpen={!!viewingMeeting}
          onClose={() => setViewingMeeting(null)}
          meeting={viewingMeeting}
          isAdmin={isAdmin}
          onCancel={async (meetingId) => {
            await api.patch(`/meetings/${meetingId}/cancel`);
            addToast('Meeting cancelled', 'info');
            fetchGroupMeetings();
          }}
        />
      )}

      {/* Channel Create / Assign Task Modal */}
      {isCreateTaskOpen && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          initialData={{ groupId }}
          groups={[group]}
          allUsers={allUsers.length > 0 ? allUsers : (group?.memberIds || [])}
          onSubmit={async (formData) => {
            const { data } = await api.post('/tasks', { ...formData, groupId });
            if (data.success) {
              addToast('Channel task assigned successfully!', 'success');
              fetchGroupTasks();
            }
          }}
        />
      )}

      {/* View Task Detail Modal */}
      {viewingTask && (
        <TaskDetailModal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          task={viewingTask}
          isAdmin={isAdmin}
          onStatusChange={async (taskId, nextStatus) => {
            await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
            addToast(`Task status changed to ${nextStatus.toUpperCase()}`, 'info');
            fetchGroupTasks();
          }}
        />
      )}

      {/* WhatsApp-Style Group Info & Photo Settings Modal */}
      {group && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          group={group}
          allUsers={allUsers}
          isAdmin={isAdmin}
          currentUser={user}
          onGroupUpdated={(updatedGroup) => {
            if (updatedGroup) {
              setGroup(updatedGroup);
              setEditName(updatedGroup.name || '');
              setEditDescription(updatedGroup.description || '');
              setEditPermission(updatedGroup.chatPermission || 'everyone');
            }
          }}
          onGroupDeleted={() => {
            if (onGroupDeleted) onGroupDeleted(groupId);
            if (onBack) onBack();
          }}
        />
      )}
    </div>
  );
};

export default GroupDashboard;
