const express = require('express');
const { verifyToken } = require('../controllers/user-controller');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const {
    createGroup,
    getGroups,
    getGroupMessages,
    addGroupMembers,
    removeGroupMembers,
    deleteGroup
} = require('../controllers/group-controller');

// Message validation constants
const MESSAGE_MAX_LENGTH = 2000;
const MESSAGE_MIN_LENGTH = 1;

// Create a limiter for message sending
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    error: 'Too many messages sent. Please wait a minute before sending more messages.'
  },
  keyGenerator: (req) => req.user.id // Rate limit by user ID
});

// Message validation middleware
const validateMessage = (req, res, next) => {
  const { text } = req.body;
  
  if (!text || text.trim().length < MESSAGE_MIN_LENGTH) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  
  if (text.length > MESSAGE_MAX_LENGTH) {
    return res.status(400).json({ error: `Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters` });
  }

  // Sanitize the message text
  req.body.text = xss(text.trim());
  next();
};

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Group routes
router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/members', addGroupMembers);
router.delete('/:groupId/members', removeGroupMembers);
router.delete('/:groupId', deleteGroup);

module.exports = router; 