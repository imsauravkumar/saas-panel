import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (userData) => {
  const token = localStorage.getItem('nexus_token'); // Fixed: was 'token', must match api.js key
  const userId = typeof userData === 'object' ? userData?.id || userData?._id : userData;
  const workspaceId = typeof userData === 'object' ? userData?.workspaceId : null;

  if (!socket) {
    socket = io('/', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      if (userId) {
        socket.emit('register_user', { userId, workspaceId });
      }
    });
  } else if (userId && socket.connected) {
    socket.emit('register_user', { userId, workspaceId });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
