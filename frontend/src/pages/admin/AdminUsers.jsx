import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Trash2,
  Edit2,
  Key,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Activity,
  Lock,
  CheckSquare,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import CreateTaskModal from '../../components/CreateTaskModal';

const AdminUsers = ({ groups = [] }) => {
  const { user: currentAuthUser } = useAuth();
  const { addToast, confirm } = useNotification();

  // Directory state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [generatedCreds, setGeneratedCreds] = useState(null);
  const [copied, setCopied] = useState(false);
  const [assignTaskUser, setAssignTaskUser] = useState(null);
  const [adminConfirmed, setAdminConfirmed] = useState(false);

  // User Detail Drawer / Modal state
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Admin Reset Password Modal
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newTempPwd, setNewTempPwd] = useState('');
  const [resetPwdCopied, setResetPwdCopied] = useState(false);

  // Form state for Create User
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    post: 'MERN Developer',
    department: 'Engineering',
    role: 'user',
    groupIds: [],
    sendInviteEmail: true,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedGroup) params.append('groupId', selectedGroup);
      if (selectedRole) params.append('role', selectedRole);

      const { data } = await api.get(`/users?${params.toString()}`);
      if (data.success) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (_err) {
      addToast('Failed to load users directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedStatus, selectedGroup, selectedRole, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // View User Detail
  const handleOpenDetail = async (user) => {
    setDetailUser(user);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/users/${user._id}`);
      if (data.success) {
        setDetailData(data);
      }
    } catch (_err) {
      addToast('Failed to load user details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const pwd = Array.from(
      { length: 10 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    setFormData((prev) => ({ ...prev, password: pwd }));
    return pwd;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (formData.role === 'admin' && !adminConfirmed) {
      addToast(
        'Please confirm administrator access authorization before creating an Admin account.',
        'warning'
      );
      return;
    }
    try {
      const { data } = await api.post('/users', formData);
      if (data.success) {
        addToast(
          `${data.user.role === 'admin' ? 'Administrator' : 'User'} ${data.user.name} created successfully!`,
          'success'
        );
        setGeneratedCreds({
          name: formData.name,
          email: formData.email,
          password: data.temporaryPassword || formData.password,
          post: formData.post,
        });
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/users/${editingUser._id}`, editingUser);
      if (data.success) {
        addToast('User details updated successfully', 'success');
        setIsEditOpen(false);
        fetchUsers();
        if (detailUser?._id === editingUser._id) {
          handleOpenDetail(data.user);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const { data } = await api.patch(`/users/${user._id}/status`);
      if (data.success) {
        addToast(`User account is now ${data.status}`, 'info');
        fetchUsers();
        if (detailUser?._id === user._id) {
          handleOpenDetail({ ...user, status: data.status });
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to toggle user status', 'error');
    }
  };

  const handleDeleteUser = (user) => {
    confirm({
      title: 'Permanently Remove User',
      message: `Are you sure you want to permanently delete ${user.name}? This will remove them from all groups and tasks.`,
      confirmText: 'Delete User',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/users/${user._id}`);
          if (data.success) {
            addToast('User permanently removed', 'success');
            if (detailUser?._id === user._id) setDetailUser(null);
            fetchUsers();
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete user', 'error');
        }
      },
    });
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    try {
      const { data } = await api.post(`/users/${resetPwdUser._id}/reset-password`, {
        tempPassword: newTempPwd,
      });
      if (data.success) {
        addToast(`Temporary password generated for ${resetPwdUser.name}`, 'success');
        setNewTempPwd(data.temporaryPassword);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map((u) => u._id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action) => {
    const actionLabel = action === 'delete' ? 'permanently delete' : 'disable';
    confirm({
      title: `Bulk ${action === 'delete' ? 'Delete' : 'Disable'} Users`,
      message: `Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected users?`,
      confirmText: action === 'delete' ? 'Bulk Delete' : 'Bulk Disable',
      type: action === 'delete' ? 'danger' : 'warning',
      onConfirm: async () => {
        try {
          const { data } = await api.post('/users/bulk-action', {
            userIds: selectedUserIds,
            action,
          });
          if (data.success) {
            addToast(data.message, 'success');
            setSelectedUserIds([]);
            fetchUsers();
          }
        } catch (_err) {
          addToast('Failed to execute bulk action', 'error');
        }
      },
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Team Management</h1>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setGeneratedCreds(null);
            setCopied(false);
            setAdminConfirmed(false);
            const pwd = generateRandomPassword();
            setFormData({
              name: '',
              email: '',
              password: pwd,
              post: 'MERN Developer',
              department: 'Engineering',
              role: 'user',
              groupIds: [],
              sendInviteEmail: true,
            });
            setIsCreateOpen(true);
          }}
        >
          <UserPlus size={15} /> Provision New User
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or title..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="form-select filter-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Accounts</option>
          <option value="disabled">Disabled Accounts</option>
        </select>

        <select
          className="form-select filter-select"
          value={selectedGroup}
          onChange={(e) => {
            setSelectedGroup(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Channels</option>
          {groups.map((g) => (
            <option key={g._id} value={g._id}>
              #{g.name}
            </option>
          ))}
        </select>

        <select
          className="form-select filter-select"
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="user">Team Members</option>
        </select>

        {(searchTerm || selectedStatus || selectedGroup || selectedRole) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('');
              setSelectedGroup('');
              setSelectedRole('');
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedUserIds.length > 0 && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary-soft)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-primary)' }}>
            {selectedUserIds.length} {selectedUserIds.length === 1 ? 'user' : 'users'} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleBulkAction('disable')}
            >
              <UserX size={14} /> Bulk Disable
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('delete')}>
              <Trash2 size={14} /> Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '38px' }}>
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Member</th>
              <th>Role & Post Label</th>
              <th>Department</th>
              <th>Channel Memberships</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skel-user-${idx}`}>
                  <td style={{ width: '40px' }}>
                    <div className="skeleton-shimmer" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}>
                        <div className="skeleton-shimmer" style={{ height: '13px', width: '90px' }} />
                        <div className="skeleton-shimmer" style={{ height: '11px', width: '120px' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="skeleton-shimmer" style={{ height: '16px', width: '60px', borderRadius: '4px' }} />
                      <div className="skeleton-shimmer" style={{ height: '11px', width: '85px' }} />
                    </div>
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ height: '18px', width: '80px', borderRadius: '12px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ height: '18px', width: '90px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ height: '18px', width: '65px', borderRadius: '12px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ height: '12px', width: '75px' }} />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}
                >
                  No members found matching your search criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);

                return (
                  <tr
                    key={u._id}
                    className={isSelected ? 'is-selected' : ''}
                  >
                    <td style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectUser(u._id)}
                      />
                    </td>

                    <td>
                      <div className="member-cell" onClick={() => handleOpenDetail(u)}>
                        <Avatar name={u.name} src={u.avatar} size="md" />
                        <div className="member-cell-info">
                          <div className="member-cell-name">{u.name}</div>
                          <div className="member-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="role-title-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {u.isOwner ? (
                            <Badge
                              variant="warning"
                              icon={Crown}
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#D97706',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                fontWeight: 700,
                              }}
                            >
                              Owner
                            </Badge>
                          ) : u.role === 'admin' ? (
                            <Badge variant="primary" icon={Shield}>
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Member</Badge>
                          )}
                        </div>
                        <div className="role-title-text">{u.post || (u.isOwner ? 'Workspace Owner' : u.role === 'admin' ? 'Administrator' : 'Team Member')}</div>
                      </div>
                    </td>

                    <td>
                      <span className="dept-pill">{u.department || 'General'}</span>
                    </td>

                    <td>
                      <div className="channel-tag-group">
                        {u.groupIds && u.groupIds.length > 0 ? (
                          <>
                            {u.groupIds.slice(0, 2).map((g) => (
                              <span key={g._id || g} className="channel-tag-chip">
                                #{g.name || 'channel'}
                              </span>
                            ))}
                            {u.groupIds.length > 2 && (
                              <span
                                className="channel-tag-chip is-more"
                                title={u.groupIds.slice(2).map((g) => '#' + (g.name || 'channel')).join(', ')}
                              >
                                +{u.groupIds.length - 2} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            No channels
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${u.status === 'active' ? 'is-active' : 'is-disabled'}`}>
                        <span className="status-dot" />
                        <span>{u.status === 'active' ? 'Active' : 'Disabled'}</span>
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Page Change Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <button
          className="pagination-nav-btn"
          style={{ padding: '4px 10px', fontSize: '12px', height: '28px' }}
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, padding: '0 4px' }}>
          Page {page} of {totalPages || 1}
        </span>
        <button
          className="pagination-nav-btn"
          style={{ padding: '4px 10px', fontSize: '12px', height: '28px' }}
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next <ChevronRight size={13} />
        </button>
      </div>

      {/* 1.2 Modal: Create User */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={generatedCreds ? 'User Credentials Generated' : 'Provision New Team Member'}
      >
        {generatedCreds ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-soft)',
                border: '1px solid var(--color-success)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  color: 'var(--color-success)',
                  marginBottom: '4px',
                }}
              >
                <CheckCircle2 size={18} /> Account Created Successfully
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                Please provide the credentials below to <strong>{generatedCreds.name}</strong>. The
                user will be required to set a secure password upon their first login.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13.5px',
              }}
            >
              <div>
                <strong>Full Name:</strong> {generatedCreds.name}
              </div>
              <div>
                <strong>Email:</strong> {generatedCreds.email}
              </div>
              <div>
                <strong>Temporary Password:</strong>{' '}
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontWeight: 600,
                  }}
                >
                  {generatedCreds.password}
                </code>
              </div>
              <div>
                <strong>Role / Title:</strong> {generatedCreds.post}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  copyToClipboard(
                    `Email: ${generatedCreds.email}\nTemporary Password: ${generatedCreds.password}`
                  )
                }
              >
                {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                {copied ? 'Credentials Copied!' : 'Copy Credentials'}
              </button>

              <button className="btn btn-primary" onClick={() => setIsCreateOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleCreateSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. David Chen"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Work Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. david@nexus.corp"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <label className="form-label">Temporary Password *</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Regenerate
                </button>
              </div>
              <input
                type="text"
                required
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role & Access Level *</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  if (role === 'user') setAdminConfirmed(false);
                  setFormData({
                    ...formData,
                    role,
                    post: role === 'admin' && (!formData.post || formData.post === 'Team Member' || formData.post === 'MERN Developer') ? 'Manager' : formData.post,
                  });
                }}
              >
                <option value="user">Standard User (Team Member)</option>
                <option value="admin">Administrator (Full Admin Access: CEO, Manager, HR)</option>
              </select>
              {formData.role === 'admin' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontSize: '12.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <Shield size={15} />
                    <span>Full Administrator Privileges Authorization</span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
                    This member will have identical administrator access to the workspace, including creating users, verifying tasks, managing channels, and auditing logs.
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '4px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                      color: 'var(--color-text)',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={adminConfirmed}
                      onChange={(e) => setAdminConfirmed(e.target.checked)}
                      style={{ marginTop: '2px' }}
                    />
                    <span>I confirm granting full administrator access to this account.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="responsive-form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Post / Role Label (e.g. CEO, Manager, HR)</label>
                <input
                  type="text"
                  placeholder="e.g. CEO, Manager, HR Director, Lead Engineer"
                  className="form-input"
                  list="suggested-posts-create"
                  value={formData.post}
                  onChange={(e) => setFormData({ ...formData, post: e.target.value })}
                />
                <datalist id="suggested-posts-create">
                  <option value="CEO" />
                  <option value="Operations Manager" />
                  <option value="HR Manager" />
                  <option value="HR Director" />
                  <option value="Lead Engineer" />
                  <option value="Project Manager" />
                  <option value="Product Manager" />
                  <option value="UI/UX Designer" />
                  <option value="Team Member" />
                </datalist>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Executive, Management, HR, Engineering"
                  className="form-input"
                  list="suggested-depts-create"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
                <datalist id="suggested-depts-create">
                  <option value="Executive" />
                  <option value="Management" />
                  <option value="Human Resources" />
                  <option value="Engineering" />
                  <option value="Product & Design" />
                  <option value="Marketing" />
                </datalist>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assign to Channel(s)</label>
              <div
                style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                }}
              >
                {groups.map((g) => {
                  const isChecked = formData.groupIds.includes(g._id);
                  return (
                    <label
                      key={g._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, groupIds: [...formData.groupIds, g._id] });
                          } else {
                            setFormData({
                              ...formData,
                              groupIds: formData.groupIds.filter((id) => id !== g._id),
                            });
                          }
                        }}
                      />
                      <span>{g.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formData.role === 'admin' && !adminConfirmed}
              >
                {formData.role === 'admin' ? 'Provision Admin & Generate Access' : 'Provision User & Generate Access'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 1.3 Modal: Edit User */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Team Member Details"
      >
        {editingUser && (
          <form
            onSubmit={handleEditSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={editingUser.name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Work Email (Non-Editable)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  disabled
                  className="form-input"
                  style={{
                    backgroundColor: 'var(--color-surface-alt)',
                    color: 'var(--color-text-muted)',
                    cursor: 'not-allowed',
                    paddingLeft: '34px',
                  }}
                  value={editingUser.email || ''}
                />
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role & Access Level</label>
              <select
                className="form-select"
                value={editingUser.role || 'user'}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                <option value="user">Standard User (Team Member)</option>
                <option value="admin">Administrator (Full Admin Access: CEO, Manager, HR)</option>
              </select>
            </div>

            <div className="responsive-form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Post / Role Label (e.g. CEO, Manager, HR)</label>
                <input
                  type="text"
                  className="form-input"
                  list="suggested-posts-create"
                  value={editingUser.post || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, post: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  list="suggested-depts-create"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Channel Memberships</label>
              <div
                style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                }}
              >
                {groups.map((g) => {
                  const isChecked = editingUser.groupIds?.includes(g._id);
                  return (
                    <label
                      key={g._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingUser({
                              ...editingUser,
                              groupIds: [...(editingUser.groupIds || []), g._id],
                            });
                          } else {
                            setEditingUser({
                              ...editingUser,
                              groupIds: editingUser.groupIds.filter((id) => id !== g._id),
                            });
                          }
                        }}
                      />
                      <span>{g.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 1.4 User Detail Slide-Over / Modal */}
      {detailUser && (
        <Modal
          isOpen={!!detailUser}
          onClose={() => {
            setDetailUser(null);
            setDetailData(null);
          }}
          title="Team Member Profile"
          maxWidth="520px"
        >
          {detailLoading ? (
            <div
              style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-secondary)', fontSize: '13px' }}
            >
              Loading user profile & activity...
            </div>
          ) : detailData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Profile Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Avatar name={detailData.user.name} src={detailData.user.avatar} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      {detailData.user.name}
                    </h3>
                    {detailData.user.isOwner ? (
                      <Badge
                        variant="warning"
                        icon={Crown}
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#D97706',
                          borderColor: 'rgba(245, 158, 11, 0.4)',
                          fontWeight: 700,
                        }}
                      >
                        OWNER
                      </Badge>
                    ) : (
                      <Badge variant={detailData.user.role === 'admin' ? 'primary' : 'neutral'}>
                        {detailData.user.role?.toUpperCase()}
                      </Badge>
                    )}
                    <Badge variant={detailData.user.status === 'active' ? 'success' : 'danger'}>
                      {detailData.user.status?.toUpperCase()}
                    </Badge>
                  </div>

                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <span>{detailData.user.email}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 500 }}>
                      {detailData.user.post || (detailData.user.isOwner ? 'Workspace Owner' : detailData.user.role === 'admin' ? 'Administrator' : 'Team Member')}
                      {detailData.user.department ? ` (${detailData.user.department})` : ''}
                    </span>
                  </div>

                  <div
                    style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}
                  >
                    Member since {new Date(detailData.user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar with Labels */}
              <div className="user-modal-actions-toolbar">
                <button
                  type="button"
                  className="user-modal-action-btn is-primary"
                  title="Assign Work / Task"
                  aria-label="Assign Task"
                  onClick={() => {
                    setAssignTaskUser(detailData.user);
                    setDetailUser(null);
                  }}
                >
                  <CheckSquare size={14} color="var(--color-primary)" />
                  <span className="user-modal-btn-label">Assign</span>
                </button>

                <button
                  type="button"
                  className="user-modal-action-btn"
                  title="Edit Profile"
                  aria-label="Edit Profile"
                  onClick={() => {
                    setEditingUser({
                      ...detailData.user,
                      groupIds: detailData.user.groupIds?.map((g) => g._id || g) || [],
                    });
                    setIsEditOpen(true);
                    setDetailUser(null);
                  }}
                >
                  <Edit2 size={14} />
                  <span className="user-modal-btn-label">Edit</span>
                </button>

                <button
                  type="button"
                  className="user-modal-action-btn"
                  title="Reset Password"
                  aria-label="Reset Password"
                  onClick={() => {
                    setResetPwdUser(detailData.user);
                    const chars =
                      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
                    setNewTempPwd(
                      Array.from(
                        { length: 10 },
                        () => chars[Math.floor(Math.random() * chars.length)]
                      ).join('')
                    );
                    setResetPwdCopied(false);
                    setDetailUser(null);
                  }}
                >
                  <Key size={14} color="#F59E0B" />
                  <span className="user-modal-btn-label">Password</span>
                </button>

                {/* Disable Button (Hidden/Disabled for Owner & Self) */}
                {!detailData.user.isOwner && (
                  <button
                    type="button"
                    disabled={detailData.user._id === currentAuthUser?.id || detailData.user._id === currentAuthUser?._id}
                    className={`user-modal-action-btn ${detailData.user.status === 'active' ? '' : 'is-primary-solid'}`}
                    title={
                      detailData.user._id === currentAuthUser?.id || detailData.user._id === currentAuthUser?._id
                        ? 'You cannot disable your own administrator account'
                        : detailData.user.status === 'active'
                          ? 'Disable Account'
                          : 'Enable Account'
                    }
                    aria-label={detailData.user.status === 'active' ? 'Disable Account' : 'Enable Account'}
                    onClick={async () => {
                      await handleToggleStatus(detailData.user);
                      setDetailData((prev) =>
                        prev
                          ? {
                            ...prev,
                            user: {
                              ...prev.user,
                              status: prev.user.status === 'active' ? 'disabled' : 'active',
                            },
                          }
                          : prev
                      );
                    }}
                  >
                    {detailData.user.status === 'active' ? (
                      <>
                        <UserX size={14} color="var(--color-warning)" />
                        <span className="user-modal-btn-label">Disable</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} />
                        <span className="user-modal-btn-label">Enable</span>
                      </>
                    )}
                  </button>
                )}

                {/* Delete Button (Hidden/Disabled for Owner & Self) */}
                {!detailData.user.isOwner && (
                  <button
                    type="button"
                    disabled={detailData.user._id === currentAuthUser?.id || detailData.user._id === currentAuthUser?._id}
                    className="user-modal-action-btn is-danger"
                    title={
                      detailData.user._id === currentAuthUser?.id || detailData.user._id === currentAuthUser?._id
                        ? 'You cannot delete your own account'
                        : 'Delete Member'
                    }
                    aria-label="Delete Member"
                    onClick={() => {
                      setDetailUser(null);
                      handleDeleteUser(detailData.user);
                    }}
                  >
                    <Trash2 size={14} />
                    <span className="user-modal-btn-label">Delete</span>
                  </button>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="responsive-grid-3" style={{ gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                    {detailData.stats?.groupsCount || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                    Channels
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-warning)', lineHeight: 1.2 }}>
                    {detailData.stats?.openTasksCount || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                    Open Deliverables
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)', lineHeight: 1.2 }}>
                    {detailData.stats?.completedTasksCount || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                    Completed Tasks
                  </div>
                </div>
              </div>

              {/* Channels List */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Assigned Channels
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {!detailData.user.groupIds || detailData.user.groupIds.length === 0 ? (
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      No channels assigned.
                    </span>
                  ) : (
                    detailData.user.groupIds.map((g) => (
                      <span
                        key={g._id || g}
                        className="channel-tag-chip"
                        style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface-alt)',
                          border: '1px solid var(--color-border)',
                          fontSize: '11.5px',
                          fontWeight: 500,
                        }}
                      >
                        #{g.name || 'channel'}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Log Audit Trail */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <Activity size={13} color="var(--color-primary)" />
                  <span>Recent Activity Audit Trail</span>
                </div>
                <div
                  style={{
                    maxHeight: '140px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {!detailData.recentActivity || detailData.recentActivity.length === 0 ? (
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      No activity logs recorded.
                    </span>
                  ) : (
                    detailData.recentActivity.map((log) => (
                      <div
                        key={log._id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface-alt)',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div style={{ color: 'var(--color-text-primary)' }}>
                          <strong>{log.action}</strong>: {log.details}
                        </div>
                        <span
                          style={{
                            color: 'var(--color-text-muted)',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Admin Reset Password Modal */}
      {resetPwdUser && (
        <Modal
          isOpen={!!resetPwdUser}
          onClose={() => setResetPwdUser(null)}
          title={`Generate Temporary Password for ${resetPwdUser.name}`}
        >
          <form
            onSubmit={handleAdminResetPassword}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              This will update the account password and mark <code>mustResetPassword: true</code>,
              requiring the user to choose their own private password upon their next login.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Temporary Password</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={newTempPwd}
                  onChange={(e) => setNewTempPwd(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newTempPwd);
                    setResetPwdCopied(true);
                    setTimeout(() => setResetPwdCopied(false), 2000);
                  }}
                >
                  {resetPwdCopied ? (
                    <Check size={14} color="var(--color-success)" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {resetPwdCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetPwdUser(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Issue Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Task Modal */}
      {assignTaskUser && (
        <CreateTaskModal
          isOpen={!!assignTaskUser}
          onClose={() => setAssignTaskUser(null)}
          initialData={{ assignedTo: [assignTaskUser._id] }}
          groups={groups}
          allUsers={users}
          onSubmit={async (formData) => {
            const { data } = await api.post('/tasks', formData);
            if (data.success) {
              addToast(`Task assigned to ${assignTaskUser.name}!`, 'success');
              setAssignTaskUser(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminUsers;
