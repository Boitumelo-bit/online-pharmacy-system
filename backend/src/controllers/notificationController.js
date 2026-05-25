const prisma = require('../config/prisma');

// Get all notifications for the current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
};

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { title, message, type, data } = req.body;
    const userId = req.user.id;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'SYSTEM',
        data: data || {},
        isRead: false
      }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('new-notification', notification);
    }
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Error marking all as read' });
  }
};

// Delete all notifications for the user
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await prisma.notification.deleteMany({
      where: { userId }
    });
    
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Error clearing notifications' });
  }
};

// Delete a single notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await prisma.notification.deleteMany({
      where: { id, userId }
    });
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
};

// Get unread count for the current user
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Error getting unread count' });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  deleteNotification,
  getUnreadCount
};