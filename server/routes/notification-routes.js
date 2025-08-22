const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/user-controller');
const { defaultLimiter } = require('../middleware/rateLimiter');
const {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead
} = require('../controllers/notification-controller');
const { Notification, User, Mentor, Post, Raspored, Message, sequelize } = require('../models');
const { Op } = require('sequelize');

// Notification-related routes
router.use(verifyToken);

// Get all notifications for the current user
router.get('/', defaultLimiter, getNotifications);

// Mark notification as read
router.put('/:notificationId/read', defaultLimiter, markAsRead);

// Delete notification
router.delete('/:notificationId', defaultLimiter, deleteNotification);

// Mark all notifications as read
router.put('/read-all', defaultLimiter, markAllAsRead);

// Test endpoint - only available in development
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', verifyToken, async (req, res) => {
    try {
      const user = await User.findOne({ where: { isAdmin: true } });
      if (!user) {
        return res.status(404).json({ message: 'No admin user found' });
      }

      const notification = await Notification.create({
        userId: user.id,
        senderId: user.id,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'test',
        read: false
      });

      res.json({ message: 'Test notification created', notification });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({ message: 'Error creating test notification' });
    }
  });
}

module.exports = router;