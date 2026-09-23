import React, { useState } from 'react';
import { Layers, ShieldCheck, ArrowRight, UserCheck, Lock, Mail, Building, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const AuthPage = () => {
  const { login, registerAdmin } = useAuth();
  const { addToast } = useNotification();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [post, setPost] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
        addToast('Welcome back to SAAS Nexus!', 'success');
      } else {
        await registerAdmin({
          name,
          email,
          password,
          workspaceName,
          post: post || 'Workspace Administrator',
        });
        addToast('Workspace initialized and Admin account created!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Authentication failed. Please check inputs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoginMode(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
          }}>
            <Layers size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            SAAS <span style={{ color: 'var(--color-primary)' }}>Nexus</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '320px' }}>
            {isLoginMode
              ? 'Enter your credentials to access your company workspace.'
              : 'Create the first Administrator account and initialize your workspace.'}
          </p>
        </div>

        {/* Mode Toggle Switch ("Existing Account?" diamond flow) */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--color-border)',
        }}>
          <button
            type="button"
            onClick={() => setIsLoginMode(true)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: isLoginMode ? 'var(--color-surface)' : 'transparent',
              color: isLoginMode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow: isLoginMode ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            Sign In (Existing Account)
          </button>
          <button
            type="button"
            onClick={() => setIsLoginMode(false)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: !isLoginMode ? 'var(--color-surface)' : 'transparent',
              color: !isLoginMode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow: !isLoginMode ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            Create Workspace (Admin)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLoginMode && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Company / Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  autoComplete="organization"
                  className="form-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role Title / Post</label>
                <input
                  type="text"
                  placeholder="e.g. Chief Technology Officer"
                  autoComplete="organization-title"
                  className="form-input"
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Work Email</label>
            <input
              type="email"
              required
              placeholder="name@company.corp"
              autoComplete="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : isLoginMode ? 'Sign In to Workspace' : 'Initialize Workspace & Admin'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Fast Logins Pill Bar */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', textAlign: 'center', fontWeight: 600 }}>
            DEMO ONE-CLICK TEST LOGINS
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@nexus.corp', 'Admin@12345')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, minWidth: '130px', fontSize: '12px' }}
            >
              🛡️ Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('sarah@nexus.corp', 'User@12345')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, minWidth: '130px', fontSize: '12px' }}
            >
              👩‍💻 User Demo (Sarah)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
