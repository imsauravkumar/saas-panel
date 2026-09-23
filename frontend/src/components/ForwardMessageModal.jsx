import React, { useState } from 'react';
import { Search, Send, Hash, User, Check, Forward } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ForwardMessageModal = ({ isOpen, onClose, message, groups = [], users = [], currentUserId }) => {
  const { addToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargets, setSelectedTargets] = useState([]); // [{ type: 'group' | 'direct', id: '...' }]
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !message) return null;

  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u._id !== currentUserId &&
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleTarget = (type, id) => {
    setSelectedTargets((prev) => {
      const exists = prev.some((t) => t.type === type && t.id === id);
      if (exists) {
        return prev.filter((t) => !(t.type === type && t.id === id));
      } else {
        return [...prev, { type, id }];
      }
    });
  };

  const isSelected = (type, id) => selectedTargets.some((t) => t.type === type && t.id === id);

  const handleForward = async () => {
    if (selectedTargets.length === 0) return;

    setIsSending(true);
    try {
      await Promise.all(
        selectedTargets.map((target) =>
          api.post(`/messages/${message._id}/forward`, {
            targetType: target.type,
            targetId: target.id,
          })
        )
      );

      addToast(`Message forwarded to ${selectedTargets.length} ${selectedTargets.length === 1 ? 'chat' : 'chats'}`, 'success');
      onClose();
    } catch (err) {
      console.error('[Forward Error]:', err);
      addToast(err.response?.data?.message || 'Failed to forward message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forward Message"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Message Snippet Preview */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--color-primary)',
            fontSize: '12.5px',
            color: 'var(--color-text-secondary)',
            maxHeight: '65px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Forward size={12} /> Forwarding Message:
          </div>
          <div>{message.content || (message.type === 'photo' ? '📷 Photo' : message.type === 'video' ? '🎥 Video' : message.type === 'audio' ? '🎤 Voice Note' : '📄 Document')}</div>
        </div>

        {/* Search */}
        <div className="search-input-box" style={{ width: '100%' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search channels or teammates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px 6px 30px' }}
          />
        </div>

        {/* Target List Tabs / Section */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px' }}>
          {/* Groups Section */}
          {filteredGroups.length > 0 && (
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Channels
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredGroups.map((g) => {
                  const active = isSelected('group', g._id);
                  return (
                    <div
                      key={g._id}
                      onClick={() => toggleTarget('group', g._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                          <Hash size={14} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          #{g.name}
                        </span>
                      </div>
                      <input type="checkbox" checked={active} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Teammates Section */}
          {filteredUsers.length > 0 && (
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Teammates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredUsers.map((u) => {
                  const active = isSelected('direct', u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleTarget('direct', u._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={u.name} src={u.avatar} size="xs" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{u.post || u.email}</div>
                        </div>
                      </div>
                      <input type="checkbox" checked={active} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <strong>{selectedTargets.length}</strong> selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedTargets.length === 0 || isSending}
              className="btn btn-primary btn-sm"
              onClick={handleForward}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Send size={13} /> {isSending ? 'Forwarding...' : 'Forward'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ForwardMessageModal;
