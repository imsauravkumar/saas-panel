import { useState } from 'react';
import { MessageSquare, Users, ExternalLink, Search, Layers, Hash } from 'lucide-react';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';

const UserGroups = ({ groups = [], onSelectGroupDashboard }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Sort by most recent activity
  const sortedGroups = [...groups].sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const filteredGroups = sortedGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={26} color="var(--color-primary)" />
            Group Management
          </h1>
        </div>

        {/* Search Bar */}
        <div className="search-input-box" style={{ flex: '1 1 200px', maxWidth: '300px' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--color-surface)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Layers size={32} color="var(--color-text-tertiary)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            No Channels Found
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              maxWidth: '400px',
              marginTop: '6px',
            }}
          >
            {searchTerm
              ? 'No channels match your search term. Try a different search.'
              : 'You have not been added to any channels yet. Your workspace administrator will assign you to team channels.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '20px',
          }}
        >
          {filteredGroups.map((group) => {
            const isLocked = group.chatPermission === 'adminOnly';
            const hasUnread = (group.unreadCount || 0) > 0;

            return (
              <div
                key={group._id}
                className="card"
                onClick={() => onSelectGroupDashboard && onSelectGroupDashboard(group._id)}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Hash size={20} />
                      )}
                      {hasUnread && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            border: '2px solid var(--color-surface)',
                          }}
                        />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3
                          style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}
                        >
                          #{group.name}
                        </h3>
                        {hasUnread && (
                          <span
                            style={{
                              background: 'var(--color-primary)',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-full)',
                              padding: '1px 6px',
                            }}
                          >
                            {group.unreadCount} new
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '2px',
                        }}
                      >
                        <Users size={13} />
                        <span>{group.memberIds?.length || 0} members</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant={isLocked ? 'warning' : 'neutral'}>
                    {isLocked ? 'Admin Only' : 'Everyone'}
                  </Badge>
                </div>

                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    flex: 1,
                    minHeight: '36px',
                    lineHeight: 1.4,
                  }}
                >
                  {group.description || 'General discussions and updates.'}
                </p>

                {/* Last Message Snippet */}
                {group.lastMessagePreview && (
                  <div
                    style={{
                      background: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {group.lastMessagePreview}
                    </span>
                    {group.lastMessageAt && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(group.lastMessageAt)}
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '-6px' }}>
                    {group.memberIds?.slice(0, 4).map((m) => (
                      <Avatar key={m._id || m} name={m.name || 'Member'} src={m.avatar} size="xs" />
                    ))}
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Open Channel <ExternalLink size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserGroups;
