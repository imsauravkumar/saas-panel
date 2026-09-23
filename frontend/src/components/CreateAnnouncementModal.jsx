import { useState, useEffect } from 'react';
import { Megaphone, Pin, Users, Globe, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';

const CreateAnnouncementModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  groups = [],
}) => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    scope: 'company',
    groupId: '',
    pinned: false,
    priority: 'normal',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        body: initialData.body || '',
        scope: initialData.scope || (initialData.target === 'group' ? 'group' : 'company'),
        groupId: initialData.groupId?._id || initialData.groupId || '',
        pinned: initialData.pinned ?? initialData.isPinned ?? false,
        priority: initialData.priority || 'normal',
      });
    } else {
      setFormData({
        title: '',
        body: '',
        scope: 'company',
        groupId: groups[0]?._id || '',
        pinned: false,
        priority: 'normal',
      });
    }
    setError('');
  }, [initialData, groups, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Announcement title is required.');
      return;
    }
    if (!formData.body.trim()) {
      setError('Announcement content is required.');
      return;
    }
    if (formData.scope === 'group' && !formData.groupId) {
      setError('Please select a target channel.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!initialData?._id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Announcement' : 'Publish Workspace Announcement'}
      maxWidth="580px"
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
          <label className="form-label">Announcement Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Q4 Company All-Hands & Product Roadmap Launch"
            className="form-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {/* Scope Selection */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Audience Scope *</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <label
              onClick={() => setFormData({ ...formData, scope: 'company' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor:
                  formData.scope === 'company'
                    ? 'var(--color-primary-soft)'
                    : 'var(--color-surface-alt)',
                border: `1px solid ${formData.scope === 'company' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                cursor: 'pointer',
              }}
            >
              <Globe size={18} color="var(--color-primary)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Company-wide</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  All workspace users
                </div>
              </div>
            </label>

            <label
              onClick={() => setFormData({ ...formData, scope: 'group' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor:
                  formData.scope === 'group'
                    ? 'var(--color-primary-soft)'
                    : 'var(--color-surface-alt)',
                border: `1px solid ${formData.scope === 'group' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                cursor: 'pointer',
              }}
            >
              <Users size={18} color="var(--color-accent)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Specific Channel</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Channel members only
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* If Group Scope, show dropdown */}
        {formData.scope === 'group' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Target Channel *</label>
            <select
              className="form-select"
              required
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            >
              <option value="">Select Channel</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  #{g.name} ({g.memberIds?.length || 0} members)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Body Textarea */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Announcement Content *</label>
          <textarea
            required
            placeholder="Write your company announcement, instructions, or updates..."
            className="form-textarea"
            rows={5}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          />
        </div>

        {/* Pin Toggle & Priority */}
        <div className="responsive-form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Urgency Priority</label>
            <select
              className="form-select"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="normal">Standard Announcement</option>
              <option value="urgent">🔴 Urgent / Critical</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Pin to Top of Feed</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                height: '42px',
              }}
            >
              <input
                type="checkbox"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Pin size={14} color="var(--color-warning)" /> Pin Announcement
              </span>
            </label>
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
            style={{ minWidth: '160px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Megaphone size={16} />
                <span>{isEdit ? 'Save Changes' : 'Publish Announcement'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAnnouncementModal;
