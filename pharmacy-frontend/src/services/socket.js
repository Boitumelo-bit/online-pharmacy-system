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
    
    // Join user room after connection
    const token = localStorage.getItem('token');
    if (token) {
      // Try to get user info from localStorage
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          const userId = parsed.state?.user?.id;
          if (userId) {
            joinUserRoom(userId);
          }
        } catch (e) {
          console.error('Error parsing auth-storage:', e);
        }
      }
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  return socket;
};

// Join user's personal notification room
export const joinUserRoom = (userId) => {
  if (socket && socket.connected) {
    socket.emit('join-user-room', userId);
    console.log(`📱 Joined user room: user_${userId}`);
  } else {
    console.log('Socket not connected, will join on connection');
  }
};

// Join admin room
export const joinAdminRoom = () => {
  if (socket && socket.connected) {
    socket.emit('join-admin');
    console.log('👑 Joined admin room');
  }
};

// Join pharmacist room
export const joinPharmacistRoom = () => {
  if (socket && socket.connected) {
    socket.emit('join-pharmacist');
    console.log('💊 Joined pharmacist room');
  }
};

// Join delivery staff room
export const joinDeliveryRoom = () => {
  if (socket && socket.connected) {
    socket.emit('join-delivery');
    console.log('🚚 Joined delivery room');
  }
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

export default { initializeSocket, getSocket, disconnectSocket, joinUserRoom, joinAdminRoom, joinPharmacistRoom, joinDeliveryRoom };