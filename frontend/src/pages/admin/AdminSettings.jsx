import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Shield,
  Save,
  Key,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const AdminSettings = () => {
  const { user, setUser } = useAuth();
  const { addToast } = useNotification();

  const [workspaceName, setWorkspaceName] = useState(user?.workspaceName || 'Nexus Technologies Inc.');
  const [defaultChatPermission, setDefaultChatPermission] = useState('everyone');
  const [allowUserGroupCreation, setAllowUserGroupCreation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/workspace/settings', {
        name: workspaceName,
        settings: {
          defaultChatPermission,
          allowUserGroupCreation,
        },
      });

      if (data.success) {
        addToast('Workspace settings saved!', 'success');
        setUser((prev) => ({ ...prev, workspaceName }));
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Workspace Settings</h1>
          <p>Configure company brand identity, system defaults, and global access rules.</p>
        </div>
      </div>

      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--color-primary)" /> General Workspace Information
          </h3>

          <form onSubmit={handleSaveWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Company / Workspace Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Default New Channel Chat Permission</label>
              <select
                className="form-select"
                value={defaultChatPermission}
                onChange={(e) => setDefaultChatPermission(e.target.value)}
              >
                <option value="everyone">Everyone can post (Open Collaboration)</option>
                <option value="adminOnly">Admin-only posting (Broadcast mode)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowUserGroupCreation}
                onChange={(e) => setAllowUserGroupCreation(e.target.checked)}
              />
              <span>Allow standard team members to create their own public channels</span>
            </label>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
              <Save size={15} /> Save Workspace Settings
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
