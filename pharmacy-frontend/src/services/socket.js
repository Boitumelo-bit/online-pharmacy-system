
import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;

export const initializeSocket = () => {
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }
  
  const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  console.log('Initializing socket connection to:', socketUrl);
  
  socket = io(socketUrl, {
    auth: { token: localStorage.getItem('token') },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket connected successfully');
    reconnectAttempts = 0;
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Ensure socket is initialized on app start
initializeSocket();

export default { initializeSocket, getSocket, disconnectSocket };