import { useState, useEffect } from 'react';
import { Clock, Activity, Search, Shield, Filter } from 'lucide-react';
import api from '../../services/api';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = targetTypeFilter
        ? `/activity-logs?targetType=${targetTypeFilter}`
        : '/activity-logs';
      const { data } = await api.get(url);
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [targetTypeFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.details?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.actorId?.name?.toLowerCase().includes(q) ||
      log.actorId?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={24} color="var(--color-primary)" />
            Audit Logs
          </h1>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px', height: '38px', fontSize: '13px' }}
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="">All Event Categories</option>
            <option value="user">User Events</option>
            <option value="group">Channel Events</option>
            <option value="task">Task Events</option>
            <option value="meeting">Meeting Events</option>
            <option value="announcement">Announcement Events</option>
            <option value="workspace">Workspace Events</option>
          </select>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content: Loading Skeleton / Empty State / Responsive Table & Mobile Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="card skeleton-shimmer"
              style={{
                height: '60px',
                borderRadius: 'var(--radius-md)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '56px 20px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-text-muted)',
            }}
          >
            <Activity size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
            No Audit Entries Found
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              maxWidth: '380px',
              margin: '0 auto',
            }}
          >
            {searchTerm || targetTypeFilter
              ? 'No recorded events match your current filter parameters.'
              : 'Audit log records will automatically appear here as team members and administrators perform actions.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action Key</th>
                <th>Category</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const logTime = new Date(log.createdAt || log.timestamp || Date.now());
                return (
                  <tr key={log._id}>
                    <td
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} color="var(--color-primary)" />
                        <span>{logTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar
                          name={log.actorId?.name || 'System'}
                          src={log.actorId?.avatar}
                          size="sm"
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>
                            {log.actorId?.name || 'System Administrator'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {log.actorId?.email || 'system@nexus.corp'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          backgroundColor: 'var(--color-surface-alt)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {log.action}
                      </code>
                    </td>

                    <td>
                      <Badge variant="neutral">{(log.targetType || 'event').toUpperCase()}</Badge>
                    </td>

                    <td style={{ fontSize: '13px', color: 'var(--color-text)', maxWidth: '380px' }}>
                      {log.details || log.action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminActivityLogs;
