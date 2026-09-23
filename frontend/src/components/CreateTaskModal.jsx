import { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, Search, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';

const CreateTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  groups = [],
  allUsers = [],
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    groupId: '',
    assignedTo: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (initialData) {
      const dl = initialData.deadline
        ? new Date(initialData.deadline).toISOString().slice(0, 16)
        : '';
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        deadline: dl,
        groupId: initialData.groupId?._id || initialData.groupId || '',
        assignedTo: (initialData.assignedTo || []).map((u) => u._id || u),
      });
    } else {
      // Default deadline: 3 days from now
      const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      defaultDeadline.setHours(18, 0, 0, 0);
      const dlStr = new Date(
        defaultDeadline.getTime() - defaultDeadline.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        deadline: dlStr,
        groupId: '',
        assignedTo: [],
      });
    }
    setError('');
    setUserSearch('');
  }, [initialData, isOpen]);

  // Candidates for assignment (if group is selected, filter by group members)
  const selectedGroup = groups.find((g) => g._id === formData.groupId);
  const candidateUsers =
    selectedGroup && selectedGroup.memberIds?.length > 0
      ? allUsers.filter((u) => selectedGroup.memberIds.some((m) => (m._id || m) === u._id))
      : allUsers;

  const filteredUsers = candidateUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.post?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (userId) => {
    setFormData((prev) => {
      const exists = prev.assignedTo.includes(userId);
      return {
        ...prev,
        assignedTo: exists
          ? prev.assignedTo.filter((id) => id !== userId)
          : [...prev.assignedTo, userId],
      };
    });
  };

  const selectAllCandidates = () => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: candidateUsers.map((u) => u._id),
    }));
  };

  const clearAllCandidates = () => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!formData.deadline) {
      setError('Please specify a valid deadline.');
      return;
    }
    if (formData.assignedTo.length === 0) {
      setError('Please assign at least one team member.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!initialData?._id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Work Task' : 'Create & Assign Work Task'}
      maxWidth="620px"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Task Title / Deliverable *</label>
          <input
            type="text"
            required
            placeholder="e.g. Implement WebSocket Reconnect & Backoff Engine"
            className="form-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Instructions / Acceptance Criteria</label>
          <textarea
            placeholder="Outline technical requirements, links to designs, or deliverables..."
            className="form-textarea"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Priority & Deadline */}
        <div className="responsive-form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Priority Level *</label>
            <select
              className="form-select"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🟠 High Priority</option>
              <option value="urgent">🔴 Urgent / Critical</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Deadline / Due Date *</label>
            <input
              type="datetime-local"
              required
              className="form-input"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
        </div>

        {/* Channel Selection */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Associated Channel (Optional)</label>
          <select
            className="form-select"
            value={formData.groupId}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
          >
            <option value="">Workspace Wide (All Channels)</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                #{g.name} ({g.memberIds?.length || 0} members)
              </option>
            ))}
          </select>
        </div>

        {/* Assignees Selection Checklist */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label className="form-label" style={{ marginBottom: 0 }}>
              Assign Teammates ({formData.assignedTo.length} selected) *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px' }}
                onClick={selectAllCandidates}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}
                onClick={clearAllCandidates}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search box within assignee picker */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search teammates by name or role..."
              className="form-input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
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
                  padding: '16px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}
              >
                No active users found.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = formData.assignedTo.includes(u._id);
                return (
                  <label
                    key={u._id}
                    onClick={() => toggleUser(u._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent',
                      border: isSelected
                        ? '1px solid var(--color-border)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <Avatar name={u.name} src={u.avatar} size="xs" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                          {u.post || u.email}
                        </div>
                      </div>
                    </div>

                    {u.role === 'admin' && (
                      <Badge variant="primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        ADMIN
                      </Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ minWidth: '150px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>Saving Task...</span>
              </>
            ) : (
              <>
                <CheckSquare size={16} />
                <span>{isEdit ? 'Save Changes' : 'Assign Work Task'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
