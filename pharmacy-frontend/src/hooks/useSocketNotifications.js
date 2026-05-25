import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

export const useSocketNotifications = () => {
  const { user } = useAuthStore();
  const hasJoinedRoom = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    
    // Function to join rooms
    const joinRooms = () => {
      if (hasJoinedRoom.current) return;
      
      console.log('🔌 Joining rooms for role:', user.role);
      
      // Join user room
      socket.emit('join-user-room', user.id);
      
      // Join role-specific rooms
      if (user.role === 'ADMIN') {
        socket.emit('join-admin');
        console.log('👑 Admin joined admin room');
      } else if (user.role === 'PHARMACIST') {
        socket.emit('join-pharmacist');
        console.log('💊 Pharmacist joined pharmacist room');
      } else if (user.role === 'DELIVERY_STAFF') {
        socket.emit('join-delivery');
        console.log('🚚 Delivery staff joined delivery room');
      }
      
      hasJoinedRoom.current = true;
    };

    // Join rooms immediately if socket is connected
    if (socket.connected) {
      joinRooms();
    }
    
    // Also join when socket connects
    socket.on('connect', () => {
      console.log('🔌 Socket reconnected, rejoining rooms...');
      hasJoinedRoom.current = false;
      joinRooms();
    });

    const handleNewNotification = (notification) => {
      console.log('📬 New notification received:', notification);
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
      
      if (notification.type === 'ORDER') {
        toast.success(notification.title, { duration: 5000 });
      } else if (notification.type === 'DELIVERY') {
        toast.success(notification.title, { duration: 5000 });
      } else if (notification.type === 'ALERT') {
        toast.error(notification.title, { duration: 6000 });
      }
    };

    const handleNewOrder = (data) => {
      console.log('🚨🚨🚨 NEW ORDER RECEIVED! 🚨🚨🚨');
      console.log('📦 Full order data:', data);
      
      const notification = {
        id: Date.now(),
        title: 'New Order Received',
        message: `Order #${data.orderNumber} from ${data.customerName} for M${data.total}`,
        type: 'ORDER',
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
      toast.success(`📦 New Order #${data.orderNumber} from ${data.customerName}`, {
        duration: 8000,
        position: 'top-right',
      });
    };

    const handleOrderStatusUpdate = (data) => {
      console.log('📋 Order status update received:', data);
      const notification = {
        id: Date.now(),
        title: 'Order Status Update',
        message: `Order #${data.orderNumber} status changed to ${data.newStatus}`,
        type: 'ORDER',
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    };

    const handleDeliveryAssigned = (data) => {
      console.log('🚚 Delivery assignment received:', data);
      const notification = {
        id: Date.now(),
        title: 'Delivery Assignment',
        message: `You have been assigned to deliver order #${data.orderNumber}`,
        type: 'DELIVERY',
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
      if (user.role === 'DELIVERY_STAFF') {
        toast.success(`🚚 New delivery: Order #${data.orderNumber} assigned to you`);
      }
    };

    const handleLowStockAlert = (data) => {
      console.log('⚠️ Low stock alert received:', data);
      const notification = {
        id: Date.now(),
        title: 'Low Stock Alert',
        message: `${data.medicineName} is running low. Current stock: ${data.stock}`,
        type: 'ALERT',
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
      toast.warning(`⚠️ Low Stock: ${data.medicineName} (${data.stock} left)`);
    };

    const handleExpiryAlert = (data) => {
      console.log('📅 Expiry alert received:', data);
      const notification = {
        id: Date.now(),
        title: 'Expiry Alert',
        message: `${data.count} medicines are expiring within 30 days`,
        type: 'ALERT',
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
      toast.warning(`📅 ${data.count} medicines expiring within 30 days`);
    };

    // Register event listeners
    socket.on('new-notification', handleNewNotification);
    socket.on('new-order', handleNewOrder);
    socket.on('order_status_updated', handleOrderStatusUpdate);
    socket.on('delivery_assigned', handleDeliveryAssigned);
    socket.on('low-stock-alert', handleLowStockAlert);
    socket.on('expiry-alert', handleExpiryAlert);

    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('new-order', handleNewOrder);
      socket.off('order_status_updated', handleOrderStatusUpdate);
      socket.off('delivery_assigned', handleDeliveryAssigned);
      socket.off('low-stock-alert', handleLowStockAlert);
      socket.off('expiry-alert', handleExpiryAlert);
    };
  }, [user?.id, user?.role]);
};