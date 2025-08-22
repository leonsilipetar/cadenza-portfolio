const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../controllers/user-controller');
const { Message, User, Mentor, Sequelize, Chat } = require('../models');
const { Op } = Sequelize;
const { chatLimiter } = require('../middleware/rateLimiter');

// Create a limiter for message sending
// Limit each user to 30 messages per minute
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    error: 'Too many messages sent. Please wait a minute before sending more messages.'
  },
  keyGenerator: (req) => req.user.id // Rate limit by user ID
});

// Get messages between current user and recipient
router.get('/messages/:recipientId', verifyToken, chatLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipientId = parseInt(req.params.recipientId, 10);
    
    if (isNaN(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    
    // Find messages between these two users WITHOUT using chatId
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            senderId: userId,
            recipientId: recipientId
          },
          {
            senderId: recipientId,
            recipientId: userId
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Mentor,
          as: 'senderMentor',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'text', 'senderId', 'senderType'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'ime', 'prezime'],
              required: false
            },
            {
              model: Mentor,
              as: 'senderMentor',
              attributes: ['id', 'ime', 'prezime'],
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Send a message
router.post('/messages', verifyToken, chatLimiter, messageLimiter, async (req, res) => {
  try {
    const { text, recipientId, type, replyToId } = req.body;
    const senderId = req.user.id;
    const senderType = req.user.isMentor ? 'Mentor' : 'User';
    
    // Validate recipientId
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    
    // Parse recipientId to ensure it's a number
    const parsedRecipientId = parseInt(recipientId, 10);
    if (isNaN(parsedRecipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    
    let chatId = null;
    
    // Try to find an existing chat
    try {
      // Find or create a chat between these users
      let chat = await Chat.findOne({
        where: {
          [Op.or]: [
            {
              user1Id: senderId,
              user2Id: parsedRecipientId
            },
            {
              user1Id: parsedRecipientId,
              user2Id: senderId
            }
          ]
        }
      });
      
      if (!chat) {
        chat = await Chat.create({
          user1Id: senderId,
          user2Id: parsedRecipientId,
          lastMessageAt: new Date()
        });
      } else {
        // Update last message time
        chat.lastMessageAt = new Date();
        await chat.save();
      }
      
      chatId = chat.id;
    } catch (chatError) {
      console.error('Error with chat:', chatError);
      // If there's an error with the Chat model, use existing chatId from database
      // Find existing messages between these users to get the chatId
      const existingMessage = await Message.findOne({
        where: {
          [Op.or]: [
            {
              senderId: senderId,
              recipientId: parsedRecipientId
            },
            {
              senderId: parsedRecipientId,
              recipientId: senderId
            }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (existingMessage) {
        chatId = existingMessage.chatId;
      } else {
        // If no existing messages, use a default chatId based on the users
        // This is a fallback and might not be ideal
        const [smallerId, largerId] = [senderId, parsedRecipientId].sort((a, b) => a - b);
        chatId = smallerId < 2000000 ? 1 : 2; // Use existing chatIds from your database
      }
    }
    
    // Create the message with chatId
    const message = await Message.create({
      senderId,
      senderType,
      recipientId: parsedRecipientId,
      chatId,
      text,
      type: type || 'text',
      replyToId,
      read: false
    });
    
    // Include sender and recipient info in response
    const messageWithDetails = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Mentor,
          as: 'senderMentor',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'text', 'senderId', 'senderType'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'ime', 'prezime'],
              required: false
            },
            {
              model: Mentor,
              as: 'senderMentor',
              attributes: ['id', 'ime', 'prezime'],
              required: false
            }
          ]
        }
      ]
    });
    
    res.status(201).json(messageWithDetails);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// Delete a message
router.delete('/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only allow deletion if user is the sender
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.destroy();
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Mark message as read
router.put('/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only recipient can mark as read
    if (message.recipientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.read = true;
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Error marking message as read' });
  }
});

// Apply rate limiting to group message route
router.post('/messages/group', verifyToken, messageLimiter, async (req, res) => {
  // ... rest of the existing code ...
});

// Get unread messages count
router.get('/unread', verifyToken, chatLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    const count = await Message.count({
      where: {
        recipientId: userId,
        read: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ 
      error: 'Error getting unread message count',
      count: 0 
    });
  }
});

// Mark all messages as read
router.put('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await Message.update(
      { read: true },
      {
        where: {
          recipientId: userId,
          read: false
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ 
      error: 'Error marking messages as read',
      success: false 
    });
  }
});

// Get chats
router.get('/chats', verifyToken, chatLimiter, async (req, res) => {
  // ... existing code ...
});

module.exports = router;