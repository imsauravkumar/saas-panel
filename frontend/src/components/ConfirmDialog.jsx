import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, LogOut, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'primary' | 'logout'
  icon = null,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      confirmBtnRef.current?.focus();
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = type === 'danger' || type === 'logout';
  const isWarning = type === 'warning';

  const renderIcon = () => {
    if (icon) return icon;
    if (type === 'logout') return <LogOut size={22} />;
    if (isDanger) return <Trash2 size={22} />;
    if (isWarning) return <AlertTriangle size={22} />;
    return <Info size={22} />;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        animation: 'fadeIn 120ms ease-out',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-dropdown)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'slideUp 150ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isDanger
                ? 'var(--color-danger-soft)'
                : isWarning
                ? 'var(--color-warning-soft)'
                : 'var(--color-primary-soft)',
              color: isDanger
                ? 'var(--color-danger)'
                : isWarning
                ? 'var(--color-warning)'
                : 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {renderIcon()}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-icon"
            style={{ width: '28px', height: '28px', color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 16px' }}
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${isDanger ? 'btn-danger-solid' : isWarning ? 'btn-warning' : 'btn-primary'} btn-sm`}
            style={{
              padding: '8px 18px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: isDanger ? 'var(--color-danger)' : undefined,
              borderColor: isDanger ? 'var(--color-danger)' : undefined,
            }}
            onClick={() => {
              if (onConfirm) onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
