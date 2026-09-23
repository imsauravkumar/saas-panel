import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import ConfirmDialog from '../components/ConfirmDialog';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    icon: null,
    onConfirm: null,
  });

  const confirm = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'danger',
      icon = null,
      onConfirm,
    }) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        icon,
        onConfirm,
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Toast functions
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const msgText =
      typeof message === 'string'
        ? message
        : message?.title
          ? `${message.title}${message.body ? ' — ' + message.body : ''}`
          : message?.body || message?.message || 'Notification';
    const msgType = typeof message === 'object' && message?.type ? message.type : type;
    setToasts((prev) => [...prev, { id, message: msgText, type: msgType }]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch unread count & recent notifications
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      if (!token) return;
      const { data } = await api.get('/notifications/unread-count');
      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (_err) {
      // session might be initializing
    }
  }, []);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      const token = localStorage.getItem('nexus_token');
      if (!token) return;
      setLoading(true);
      const { data } = await api.get(
        `/notifications?limit=30${unreadOnly ? '&unreadOnly=true' : ''}`
      );
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to load notifications list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single as read
  const markAsRead = useCallback(async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Socket listener for real-time notification dispatch
  // Uses interval-based attachment because socket may not be ready at mount time
  useEffect(() => {
    let attached = false;
    let socket = null;

    const handleNewNotification = (notificationDoc) => {
      setNotifications((prev) => [notificationDoc, ...prev]);
      setUnreadCount((prev) => prev + 1);
      addToast(notificationDoc.title, 'info', 5000);
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleNotificationReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };

    const attach = () => {
      socket = getSocket();
      if (socket && !attached) {
        socket.on('notification:new', handleNewNotification);
        socket.on('notification:read', handleNotificationRead);
        socket.on('notification:read_all', handleNotificationReadAll);
        attached = true;
      }
    };

    // Try immediately, then retry every 500ms until socket is available
    attach();
    const retryInterval = attached
      ? null
      : setInterval(() => {
          if (!attached) attach();
          if (attached) clearInterval(retryInterval);
        }, 500);

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      if (socket && attached) {
        socket.off('notification:new', handleNewNotification);
        socket.off('notification:read', handleNotificationRead);
        socket.off('notification:read_all', handleNotificationReadAll);
      }
    };
  }, [addToast]);

  // Initial load
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        confirm,
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}

      {/* Render In-App Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Render Toast Notifications (Always on top of modals & backdrops) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 10010,
        }}
      >
        {toasts.map((toast) => {
          let bg = 'var(--color-surface)';
          let border = 'var(--color-border)';
          let icon = <Info size={18} color="var(--color-primary)" />;

          if (toast.type === 'success') {
            border = 'var(--color-success)';
            icon = <CheckCircle2 size={18} color="var(--color-success)" />;
          } else if (toast.type === 'error') {
            border = 'var(--color-danger)';
            icon = <AlertCircle size={18} color="var(--color-danger)" />;
          } else if (toast.type === 'warning') {
            border = 'var(--color-warning)';
            icon = <AlertCircle size={18} color="var(--color-warning)" />;
          }

          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                boxShadow: 'var(--shadow-dropdown)',
                minWidth: '280px',
                maxWidth: '420px',
                color: 'var(--color-text-primary)',
                fontSize: '13.5px',
                animation: 'slideUp 200ms ease-out',
              }}
            >
              {icon}
              <div style={{ flex: 1, fontWeight: 500 }}>{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
