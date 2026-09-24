import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Pin, Calendar, Search, Globe } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../../components/Avatar';

const UserAnnouncements = () => {
  const { addToast } = useNotification();
  const { socket } = useSocket();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/announcements');
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (_err) {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
          <h1>Announcements</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`skel-ann-${idx}`} className="announcement-card" style={{ gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-shimmer" style={{ width: '110px', height: '20px', borderRadius: '4px' }} />
                <div className="skeleton-shimmer" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-shimmer" style={{ width: '45%', height: '18px', borderRadius: '4px' }} />
                <div className="skeleton-shimmer" style={{ width: '90%', height: '14px', borderRadius: '4px' }} />
                <div className="skeleton-shimmer" style={{ width: '75%', height: '14px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <div className="skeleton-shimmer" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                <div className="skeleton-shimmer" style={{ width: '130px', height: '12px', borderRadius: '4px' }} />
              </div>
            </div>
          ))
        ) : filteredAnnouncements.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--color-text-muted)' }}
          >
            <Megaphone
              size={36}
              style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-primary)' }}
            />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              No announcements published
            </div>
            <p style={{ fontSize: '13px', margin: '4px auto 0 auto' }}>
              Check back later for company broadcasts and channel announcements.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((a) => {
            const isPinned = a.pinned || a.isPinned;
            const isCompany = a.scope === 'company' || a.target === 'company-wide';
            const isUrgent = a.priority === 'urgent';

            return (
              <div
                key={a._id}
                className={`announcement-card ${isPinned ? 'is-pinned' : ''} ${isUrgent ? 'is-urgent' : ''}`}
              >
                {/* Meta Top Bar */}
                <div className="announcement-card-header">
                  <div className="announcement-card-header-left">
                    {isPinned && (
                      <span className="announcement-chip pinned">
                        <span className="task-priority-dot" style={{ background: '#D97706' }} />
                        <Pin size={11} /> PINNED
                      </span>
                    )}

                    {isCompany ? (
                      <span className="announcement-chip company">
                        <Globe size={11} /> Company-wide
                      </span>
                    ) : (
                      <span className="task-group-pill">
                        #{a.groupId?.name || 'Channel'}
                      </span>
                    )}

                    {isUrgent && (
                      <span className="announcement-chip urgent">
                        <span className="task-priority-dot" style={{ background: '#DC2626' }} /> Urgent
                      </span>
                    )}
                  </div>

                  <div className="announcement-card-header-right">
                    <Calendar size={13} />
                    <span>
                      {new Date(a.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Title & Content */}
                <div>
                  <h3 className="announcement-title">
                    {a.title}
                  </h3>
                  <div className="announcement-body">
                    {a.body}
                  </div>
                </div>

                {/* Footer */}
                <div className="announcement-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar name={a.createdBy?.name || 'Admin'} src={a.createdBy?.avatar} size="xs" />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Published by <strong>{a.createdBy?.name || 'Administrator'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserAnnouncements;
