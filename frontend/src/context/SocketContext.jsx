import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, initSocket } from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  // Reactive socket reference — updated when socket connects
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      setSocketReady(false);
      socketRef.current = null;
      return;
    }

    const socket = initSocket(user);
    socketRef.current = socket;

    const handleConnect = () => {
      setSocketReady(true);
      socketRef.current = getSocket();
    };

    const handleDisconnect = () => {
      setSocketReady(false);
    };

    const handleOnlineUsers = (usersList) => {
      setOnlineUsers(Array.isArray(usersList) ? usersList : []);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('online_users_updated', handleOnlineUsers);
    socket.on('users:online', handleOnlineUsers);

    // If already connected, mark ready and fetch online users
    if (socket.connected) {
      setSocketReady(true);
      socket.emit('get_online_users');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('online_users_updated', handleOnlineUsers);
      socket.off('users:online', handleOnlineUsers);
    };
  }, [user]);

  const joinGroupRoom = (groupId) => {
    const socket = getSocket();
    if (socket && groupId) {
      socket.emit('join_group', groupId);
      setActiveGroup(groupId);
    }
  };

  const leaveGroupRoom = (groupId) => {
    const socket = getSocket();
    if (socket && groupId) {
      socket.emit('leave_group', groupId);
      if (activeGroup === groupId) setActiveGroup(null);
    }
  };

  const emitTyping = (groupId, isTyping) => {
    const socket = getSocket();
    if (socket && groupId && user) {
      if (isTyping) {
        socket.emit('typing_start', { groupId, userName: user.name, userId: user.id });
      } else {
        socket.emit('typing_stop', { groupId, userId: user.id });
      }
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        socketReady,
        onlineUsers,
        joinGroupRoom,
        leaveGroupRoom,
        emitTyping,
        activeGroup,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
