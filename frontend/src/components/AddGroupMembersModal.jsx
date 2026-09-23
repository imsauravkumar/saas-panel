import { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const AddGroupMembersModal = ({ isOpen, onClose, group, allUsers = [], onMembersAdded }) => {
  const { addToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState([]);

  // If allUsers was not passed from parent or is empty, fetch workspace users directly
  useEffect(() => {
    if (isOpen && (!allUsers || allUsers.length === 0)) {
      const loadWorkspaceUsers = async () => {
        try {
          const { data } = await api.get('/users');
          if (data.success) {
            setFetchedUsers(data.users || []);
          }
        } catch (err) {
          console.warn('Failed to fetch workspace users:', err);
        }
      };
      loadWorkspaceUsers();
    }
  }, [isOpen, allUsers]);

  const effectiveUsers = allUsers && allUsers.length > 0 ? allUsers : fetchedUsers;

  // Users in the workspace who are NOT already in the group
  const existingMemberIds = useMemo(() => {
    return new Set(group?.memberIds?.map((m) => (m._id ? m._id.toString() : m.toString())) || []);
  }, [group]);

  const availableUsers = useMemo(() => {
    return effectiveUsers.filter(
      (u) => !existingMemberIds.has(u._id ? u._id.toString() : u.toString())
    );
  }, [effectiveUsers, existingMemberIds]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return availableUsers;
    return availableUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.post?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableUsers, searchTerm]);

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const { data } = await api.post(`/groups/${group._id}/members`, {
        userIds: selectedUserIds,
      });

      if (data.success) {
        addToast(data.message || 'Members added successfully!', 'success');
        setSelectedUserIds([]);
        if (onMembersAdded) onMembersAdded(data.group);
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add members', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Members to #${group?.name || 'Channel'}`}
      maxWidth="500px"
    >
      <form
        onSubmit={handleAddSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Search and select team members to invite to this channel.
        </p>

        {/* Search input */}
        <div className="search-input-box" style={{ width: '100%' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Available Users List */}
        <div
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredUsers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
              }}
            >
              {availableUsers.length === 0
                ? 'All workspace team members are already in this channel!'
                : 'No users matching your search.'}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isChecked = selectedUserIds.includes(u._id);

              return (
                <div
                  key={u._id}
                  onClick={() => toggleSelectUser(u._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isChecked ? 'var(--color-primary-soft)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by parent div click
                    style={{ pointerEvents: 'none' }}
                  />
                  <Avatar name={u.name} src={u.avatar} size="sm" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {u.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                      {u.post || u.email}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
            <strong>{selectedUserIds.length}</strong>{' '}
            {selectedUserIds.length === 1 ? 'user' : 'users'} selected
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedUserIds.length === 0 || loading}
              className="btn btn-primary"
            >
              <UserPlus size={14} /> Add Selected Members
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddGroupMembersModal;
