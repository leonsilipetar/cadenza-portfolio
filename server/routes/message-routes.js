const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  sendGroupMessage,
  deleteMessage,
  markMessagesAsRead,
  markGroupMessagesAsRead
} = require('../controllers/message-controller');

// All routes should use verifyToken middleware
router.use(verifyToken);

// Individual chat messages
router.get('/:recipientId', getMessages);
router.post('/', sendMessage);
router.delete('/:messageId', deleteMessage);
router.post('/mark-read', markMessagesAsRead);

// Group chat messages
router.post('/group', sendGroupMessage);

// Mark group messages as read
router.post('/group/mark-read', markGroupMessagesAsRead);

module.exports = router; 