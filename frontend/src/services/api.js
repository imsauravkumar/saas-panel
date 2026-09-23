import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout to prevent hung requests
});

// Interceptor to attach Auth Token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle expired tokens or unauthenticated errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and reload to show login
      const currentToken = localStorage.getItem('nexus_token');
      if (currentToken) {
        localStorage.removeItem('nexus_token');
        // Reload forces AuthContext to re-evaluate and show the login page
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
