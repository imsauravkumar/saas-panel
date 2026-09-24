import { useState } from 'react';
import { Users, ExternalLink, Search, Layers, Hash } from 'lucide-react';
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
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Channels</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
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
              background: 'var(--color-surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Layers size={32} color="var(--color-primary)" style={{ opacity: 0.7 }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            No Channels Found
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              maxWidth: '400px',
              marginTop: '6px',
              lineHeight: 1.5,
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '16px',
          }}
        >
          {filteredGroups.map((group) => {
            const isLocked = group.chatPermission === 'adminOnly';
            const hasUnread = (group.unreadCount || 0) > 0;

            return (
              <div
                key={group._id}
                className="group-card"
                onClick={() => onSelectGroupDashboard && onSelectGroupDashboard(group._id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Header */}
                <div className="group-card-header">
                  <div className="group-card-info">
                    <div className="group-avatar-box">
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                        />
                      ) : (
                        <Hash size={20} />
                      )}
                      {hasUnread && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            border: '2px solid var(--color-surface)',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 className="group-card-title">
                          #{group.name}
                        </h3>
                        {hasUnread && (
                          <span className="task-priority-chip high">
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
                          marginTop: '3px',
                        }}
                      >
                        <Users size={13} />
                        <span>{group.memberIds?.length || 0} members</span>
                      </div>
                    </div>
                  </div>

                  <span className={`task-priority-chip ${isLocked ? 'high' : 'low'}`}>
                    <span className="task-priority-dot" style={{ background: isLocked ? '#F59E0B' : '#10B981' }} />
                    {isLocked ? 'Admin Only' : 'Everyone'}
                  </span>
                </div>

                {/* Description */}
                <p className="group-card-desc">
                  {group.description || 'General discussions and team updates.'}
                </p>

                {/* Last Message Snippet */}
                {group.lastMessagePreview && (
                  <div className="group-message-preview">
                    <span>{group.lastMessagePreview}</span>
                    {group.lastMessageAt && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(group.lastMessageAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer with Member Preview Avatars */}
                <div className="group-card-footer">
                  <div className="task-card-avatars">
                    {group.memberIds?.slice(0, 4).map((m, i) => (
                      <div
                        key={m._id || m || i}
                        className="task-card-avatar-item"
                        title={m.name || 'Member'}
                      >
                        <Avatar
                          name={m.name || 'Member'}
                          src={m.avatar}
                          size="xs"
                        />
                      </div>
                    ))}
                    {(group.memberIds?.length || 0) > 4 && (
                      <div
                        className="task-card-avatar-item"
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: 'var(--color-surface-alt)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        +{group.memberIds.length - 4}
                      </div>
                    )}
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
                    Open Channel <ExternalLink size={12} />
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
