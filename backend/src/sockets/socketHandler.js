const prisma = require('../config/prisma');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // User joins their personal room for notifications
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`📱 User ${userId} joined their notification room`);
    });

    // Admin joins admin room
    socket.on('join-admin', () => {
      socket.join('admin_room');
      const roomSize = io.sockets.adapter.rooms.get('admin_room')?.size || 0;
      console.log(`👑 Admin joined admin room - Total in room: ${roomSize}`);
    });

    // Pharmacist joins pharmacist room
    socket.on('join-pharmacist', () => {
      socket.join('pharmacist_room');
      const roomSize = io.sockets.adapter.rooms.get('pharmacist_room')?.size || 0;
      console.log(`💊 Pharmacist joined pharmacist room - Total in room: ${roomSize}`);
    });

    // Delivery staff joins delivery room
    socket.on('join-delivery', () => {
      socket.join('delivery_room');
      const roomSize = io.sockets.adapter.rooms.get('delivery_room')?.size || 0;
      console.log(`🚚 Delivery staff joined delivery room - Total in room: ${roomSize}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
};

// Helper functions for sending notifications
const sendNotification = (io, userId, title, message, type = 'SYSTEM', data = {}) => {
  if (!userId) return;
  const notification = {
    id: Date.now(),
    title,
    message,
    type,
    data,
    timestamp: new Date().toISOString(),
    read: false,
  };
  io.to(`user_${userId}`).emit('new-notification', notification);
  console.log(`📧 Notification sent to user ${userId}: ${title}`);
  return notification;
};

const sendOrderUpdate = (io, userId, order) => {
  if (!userId) return;
  io.to(`user_${userId}`).emit('order-updated', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    message: `Your order ${order.orderNumber} status changed to ${order.status}`,
    timestamp: new Date(),
  });
  
  sendNotification(io, userId, 'Order Update', `Your order ${order.orderNumber} is now ${order.status}`, 'ORDER', { orderId: order.id });
};

const sendNewOrderAlert = (io, order, customerName, total) => {
  const alertData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customerName,
    total: total,
    timestamp: new Date(),
  };
  
  io.to('admin_room').emit('new-order', alertData);
  io.to('pharmacist_room').emit('new-order', alertData);
  console.log(`📦 New order alert sent to admin and pharmacist rooms: Order #${order.orderNumber}`);
};

const sendLowStockAlert = (io, medicineName, stock) => {
  const alertData = {
    medicineName,
    stock,
    timestamp: new Date(),
  };
  
  io.to('admin_room').emit('low-stock-alert', alertData);
  io.to('pharmacist_room').emit('low-stock-alert', alertData);
  console.log(`⚠️ Low stock alert sent: ${medicineName} (${stock} left)`);
};

const sendExpiryAlert = (io, count) => {
  const alertData = {
    count,
    timestamp: new Date(),
  };
  
  io.to('admin_room').emit('expiry-alert', alertData);
  io.to('pharmacist_room').emit('expiry-alert', alertData);
  console.log(`📅 Expiry alert sent: ${count} medicines expiring soon`);
};

const sendDeliveryAssignment = (io, orderId, orderNumber, deliveryStaffId, customerId) => {
  // Notify delivery staff
  io.to(`user_${deliveryStaffId}`).emit('delivery_assigned', {
    orderId,
    orderNumber,
    message: `You have been assigned to deliver order #${orderNumber}`,
    timestamp: new Date(),
  });
  
  // Notify customer
  sendNotification(io, customerId, 'Delivery Assigned', `Your order #${orderNumber} has been assigned to a delivery staff`, 'DELIVERY', { orderId });
  
  console.log(`🚚 Delivery assignment notification sent for order #${orderNumber}`);
};

module.exports = {
  socketHandler,
  sendNotification,
  sendOrderUpdate,
  sendNewOrderAlert,
  sendLowStockAlert,
  sendExpiryAlert,
  sendDeliveryAssignment,
};