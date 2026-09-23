import { useState, useEffect } from 'react';
import { Layers, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = ({ onBackToLanding, initialLoginMode = true }) => {
  const { login, registerAdmin } = useAuth();
  const { addToast } = useNotification();

  const [isLoginMode, setIsLoginMode] = useState(initialLoginMode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLoginMode(initialLoginMode);
  }, [initialLoginMode]);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [post, setPost] = useState('');

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});
  // Form-level alert error message
  const [formError, setFormError] = useState('');

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) setFormError('');
  };

  const handleModeSwitch = (mode) => {
    setIsLoginMode(mode);
    setFieldErrors({});
    setFormError('');
  };

  const validateForm = () => {
    const errors = {};

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Work email is required.';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Please enter a valid work email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!isLoginMode) {
      if (!name.trim()) {
        errors.name = 'Full name is required.';
      }
      if (!workspaceName.trim()) {
        errors.workspaceName = 'Company or workspace name is required.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-network client-side field validation
    const isValid = validateForm();
    if (!isValid) return;

    setLoading(true);

    try {
      if (isLoginMode) {
        await login(email.trim(), password);
        addToast('Welcome back to SAAS Nexus!', 'success');
      } else {
        await registerAdmin({
          name: name.trim(),
          email: email.trim(),
          password,
          workspaceName: workspaceName.trim(),
          post: post.trim() || 'Workspace Administrator',
        });
        addToast('Workspace initialized and Admin account created!', 'success');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Authentication failed. Please check your inputs and try again.';
      setFormError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setFormError('');
    setIsLoginMode(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
        padding: '24px',
        position: 'relative',
      }}
    >
      {/* Back to Landing Page Link */}
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="btn btn-ghost"
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            color: '#94A3B8',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Product Overview</span>
        </button>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Layers size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            SAAS <span style={{ color: 'var(--color-primary)' }}>Nexus</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '340px' }}>
            {isLoginMode
              ? 'Enter your credentials to access your company workspace.'
              : 'Create the first Administrator account and initialize your workspace.'}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => handleModeSwitch(true)}
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
            onClick={() => handleModeSwitch(false)}
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

        {/* Inline Form Error Alert */}
        {formError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {!isLoginMode && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  autoComplete="name"
                  disabled={loading}
                  className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
                  style={fieldErrors.name ? { borderColor: '#EF4444' } : {}}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('name');
                  }}
                />
                {fieldErrors.name && (
                  <span
                    style={{
                      color: '#EF4444',
                      fontSize: '11.5px',
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Company / Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  autoComplete="organization"
                  disabled={loading}
                  className={`form-input ${fieldErrors.workspaceName ? 'input-error' : ''}`}
                  style={fieldErrors.workspaceName ? { borderColor: '#EF4444' } : {}}
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    clearFieldError('workspaceName');
                  }}
                />
                {fieldErrors.workspaceName && (
                  <span
                    style={{
                      color: '#EF4444',
                      fontSize: '11.5px',
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    {fieldErrors.workspaceName}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role Title / Post (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chief Technology Officer"
                  autoComplete="organization-title"
                  disabled={loading}
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
              placeholder="name@company.corp"
              autoComplete="email"
              disabled={loading}
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              style={fieldErrors.email ? { borderColor: '#EF4444' } : {}}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
            />
            {fieldErrors.email && (
              <span
                style={{
                  color: '#EF4444',
                  fontSize: '11.5px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              disabled={loading}
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              style={fieldErrors.password ? { borderColor: '#EF4444' } : {}}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
            />
            {fieldErrors.password && (
              <span
                style={{
                  color: '#EF4444',
                  fontSize: '11.5px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="spin-icon"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <span>{isLoginMode ? 'Signing In...' : 'Initializing Workspace...'}</span>
              </>
            ) : (
              <>
                <span>{isLoginMode ? 'Sign In to Workspace' : 'Initialize Workspace & Admin'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Logins Pill Bar */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            DEMO ONE-CLICK TEST LOGINS
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => fillDemoAccount('admin@nexus.corp', 'Admin@12345')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, minWidth: '130px', fontSize: '12px' }}
            >
              🛡️ Admin Demo
            </button>
            <button
              type="button"
              disabled={loading}
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
