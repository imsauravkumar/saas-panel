import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session
  useEffect(() => {
    const loadSession = async () => {
      const token = localStorage.getItem('nexus_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.user) {
          setUser(data.user);
          initSocket(data.user.id);
        }
      } catch (err) {
        console.warn('Session verification failed:', err.response?.data?.message || err.message);
        // Only clear the session if the token is explicitly invalid or expired (401)
        if (err.response?.status === 401) {
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_current_tab');
          localStorage.removeItem('nexus_active_group_id');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Admin Signup (Workspace Owner)
  const registerAdmin = async ({ name, email, password, workspaceName, post }) => {
    const { data } = await api.post('/auth/register-admin', {
      name,
      email,
      password,
      workspaceName,
      post,
    });

    if (data.success) {
      localStorage.removeItem('nexus_current_tab');
      localStorage.removeItem('nexus_active_group_id');
      window.location.hash = 'dashboard';
      localStorage.setItem('nexus_token', data.token);
      setUser(data.user);
      initSocket(data.user.id);
    }
    return data;
  };

  // Login (Admin or User)
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.removeItem('nexus_current_tab');
      localStorage.removeItem('nexus_active_group_id');
      window.location.hash = 'dashboard';
      localStorage.setItem('nexus_token', data.token);
      setUser(data.user);
      initSocket(data.user.id);
    }
    return data;
  };

  // Logout (clean all session state)
  const logout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_current_tab');
    localStorage.removeItem('nexus_active_group_id');
    window.location.hash = '';
    disconnectSocket();
    setUser(null);
  };

  // Update Password (first login reset or manual)
  const updatePassword = async (currentPassword, newPassword) => {
    const { data } = await api.put('/users/me/password', { currentPassword, newPassword });
    if (data.success && user) {
      setUser({ ...user, mustResetPassword: false, mustChangePassword: false });
    }
    return data;
  };

  // Update Profile
  const updateProfile = async (formData) => {
    const { data } = await api.put('/users/profile', formData);
    if (data.success && data.user) {
      setUser((prev) => ({ ...prev, ...data.user }));
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        registerAdmin,
        logout,
        updatePassword,
        updateProfile,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
