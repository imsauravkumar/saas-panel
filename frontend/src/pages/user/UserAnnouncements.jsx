import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Pin, Calendar, Search, Globe, Users } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/Badge';
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
          <h1>Company Bulletins & Notices</h1>
          <p>Official workspace broadcasts, company news, and channel-level announcements.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="search-input-box" style={{ width: '320px', maxWidth: '100%' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search bulletins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div
            style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}
          >
            Loading bulletins...
          </div>
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
              No bulletins published
            </div>
            <p style={{ fontSize: '13px', margin: '4px auto 0 auto' }}>
              Check back later for company broadcasts and channel updates.
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
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
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

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
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
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0' }}>
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

                {/* Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    marginTop: '4px',
                    gap: '8px',
                  }}
                >
                  <Avatar name={a.createdBy?.name || 'Admin'} src={a.createdBy?.avatar} size="xs" />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Published by <strong>{a.createdBy?.name || 'Administrator'}</strong>
                  </span>
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
