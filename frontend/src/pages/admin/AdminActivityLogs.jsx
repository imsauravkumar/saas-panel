import React, { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  Shield,
  Clock,
  User,
} from 'lucide-react';
import api from '../../services/api';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = targetTypeFilter ? `/activity-logs?targetType=${targetTypeFilter}` : '/activity-logs';
      const { data } = await api.get(url);
      if (data.success) {
        setLogs(data.logs);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Workspace Audit Trail & Logs</h1>
          <p>Complete compliance and activity log of all operations performed in the workspace.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            className="form-select"
            style={{ width: '180px', height: '36px' }}
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="user">User Events</option>
            <option value="group">Channel Events</option>
            <option value="task">Task Events</option>
            <option value="meeting">Meeting Events</option>
            <option value="announcement">Announcement Events</option>
            <option value="workspace">Workspace Events</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action Key</th>
              <th>Event Category</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  No audit entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar name={log.actorId?.name || 'System'} src={log.actorId?.avatar} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.actorId?.name || 'System Actor'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{log.actorId?.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', backgroundColor: 'var(--color-surface-alt)', padding: '3px 6px', borderRadius: '4px' }}>
                      {log.action}
                    </code>
                  </td>

                  <td>
                    <Badge variant="neutral">{log.targetType.toUpperCase()}</Badge>
                  </td>

                  <td style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminActivityLogs;
