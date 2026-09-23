import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Calendar,
  Trash2,
  Edit2,
  Search,
  Globe,
  Users,
  AlertCircle,
  Eye,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import CreateAnnouncementModal from '../../components/CreateAnnouncementModal';

const AdminAnnouncements = ({ groups = [] }) => {
  const { addToast, confirm } = useNotification();
  const { socket } = useSocket();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedGroupId) params.groupId = selectedGroupId;

      const queryStr = new URLSearchParams(params).toString();
      const { data } = await api.get(`/announcements${queryStr ? '?' + queryStr : ''}`);
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, addToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleNew = () => fetchAnnouncements();
    const handleUpdated = () => fetchAnnouncements();
    const handleDeleted = ({ announcementId }) => {
      setAnnouncements((prev) => prev.filter((a) => a._id !== announcementId));
    };

    socket.on('new_announcement', handleNew);
    socket.on('announcement:new', handleNew);
    socket.on('announcement:updated', handleUpdated);
    socket.on('announcement:deleted', handleDeleted);

    return () => {
      socket.off('new_announcement', handleNew);
      socket.off('announcement:new', handleNew);
      socket.off('announcement:updated', handleUpdated);
      socket.off('announcement:deleted', handleDeleted);
    };
  }, [socket, fetchAnnouncements]);

  const handleSave = async (formData) => {
    if (editingAnnouncement) {
      const { data } = await api.put(`/announcements/${editingAnnouncement._id}`, formData);
      if (data.success) {
        addToast('Announcement updated successfully!', 'success');
        setEditingAnnouncement(null);
        fetchAnnouncements();
      }
    } else {
      const { data } = await api.post('/announcements', formData);
      if (data.success) {
        addToast('Announcement broadcasted to workspace!', 'success');
        fetchAnnouncements();
      }
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const { data } = await api.patch(`/announcements/${id}/pin`);
      if (data.success) {
        addToast(data.message, 'info', 1500);
        fetchAnnouncements();
      }
    } catch (err) {
      addToast('Failed to toggle pin', 'error');
    }
  };

  const handleDelete = (id, title) => {
    confirm({
      title: 'Delete Announcement',
      message: `Are you sure you want to delete announcement "${title}"?`,
      confirmText: 'Delete Announcement',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/announcements/${id}`);
          if (data.success) {
            addToast('Announcement deleted', 'success');
            fetchAnnouncements();
          }
        } catch (err) {
          addToast('Failed to delete announcement', 'error');
        }
      },
    });
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Company Bulletins & Announcements</h1>
          <p>
            Publish company-wide broadcasts or channel-specific notices with pinned priorities and instant notification fan-out.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingAnnouncement(null);
            setIsCreateOpen(true);
          }}
        >
          <Plus size={16} /> Publish Announcement
        </button>
      </div>

      {/* Search & Channel Filter */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search bulletins and updates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="form-select filter-select"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">All Announcements</option>
          {groups.map((g) => (
            <option key={g._id} value={g._id}>
              #{g.name} Only
            </option>
          ))}
        </select>
      </div>

      {/* Announcements Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
            Loading bulletins...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--color-text-muted)' }}>
            <Megaphone size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-primary)' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              No announcements published yet
            </div>
            <p style={{ fontSize: '13px', margin: '4px auto 16px auto', maxWidth: '360px' }}>
              Broadcast company-wide news, milestones, or channel notices to keep your workspace aligned.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingAnnouncement(null);
                setIsCreateOpen(true);
              }}
            >
              <Plus size={14} /> Publish First Announcement
            </button>
          </div>
        ) : (
          filteredAnnouncements.map((a) => {
            const isPinned = a.pinned || a.isPinned;
            const isCompany = a.scope === 'company' || a.target === 'company-wide';
            const isUrgent = a.priority === 'urgent';

            return (
              <div
                key={a._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderLeft: isPinned
                    ? '4px solid var(--color-warning)'
                    : isUrgent
                    ? '4px solid var(--color-danger)'
                    : '4px solid var(--color-primary)',
                  backgroundColor: isPinned ? 'rgba(245, 158, 11, 0.03)' : 'var(--color-surface)',
                }}
              >
                {/* Meta Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPinned && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-warning-soft)',
                          color: 'var(--color-warning)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Pin size={11} /> PINNED
                      </span>
                    )}

                    {isCompany ? (
                      <Badge variant="primary" icon={Globe}>
                        COMPANY-WIDE
                      </Badge>
                    ) : (
                      <Badge variant="neutral" icon={Users}>
                        #{a.groupId?.name || 'Channel'}
                      </Badge>
                    )}

                    {isUrgent && <Badge variant="danger">URGENT</Badge>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <Calendar size={13} />
                    <span>{new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Title & Body */}
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>
                    {a.title}
                  </h3>
                  <div
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {a.body}
                  </div>
                </div>

                {/* Footer with Author and Admin Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar name={a.createdBy?.name || 'Admin'} src={a.createdBy?.avatar} size="xs" />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Published by <strong>{a.createdBy?.name || 'Workspace Administrator'}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        color: isPinned ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                      }}
                      onClick={() => handleTogglePin(a._id)}
                      title={isPinned ? 'Unpin from top' : 'Pin to top'}
                    >
                      <Pin size={13} /> {isPinned ? 'Unpin' : 'Pin'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{ width: '32px', height: '32px' }}
                      onClick={() => {
                        setEditingAnnouncement(a);
                        setIsCreateOpen(true);
                      }}
                      title="Edit Announcement"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}
                      onClick={() => handleDelete(a._id, a.title)}
                      title="Delete Announcement"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <CreateAnnouncementModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingAnnouncement(null);
          }}
          onSubmit={handleSave}
          initialData={editingAnnouncement}
          groups={groups}
        />
      )}
    </div>
  );
};

export default AdminAnnouncements;
