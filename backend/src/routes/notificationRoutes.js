const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(verifyToken);

// Get unread count (must be BEFORE /:id route)
router.get('/unread-count', getUnreadCount);

// Get all notifications for current user
router.get('/', getNotifications);

// Create a new notification
router.post('/', createNotification);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete all notifications
router.delete('/all', deleteAllNotifications);

// Single notification routes (must be LAST)
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;