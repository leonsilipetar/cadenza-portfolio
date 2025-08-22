const { Message, User, Mentor, Chat, Notification, Group, Sequelize } = require('../models');
const { Op } = Sequelize;
const asyncWrapper = require('../middleware/asyncWrapper');
const { sendPushNotification } = require('../firebase-admin');
const xss = require('xss');

// Constants for validation
const MESSAGE_MAX_LENGTH = 2000; // 2000 characters max
const MESSAGE_MIN_LENGTH = 1;    // At least 1 character

const getMessages = asyncWrapper(async (req, res) => {
  try {
    const userId = req.user.id;
    const recipientId = parseInt(req.params.recipientId, 10);
    
    if (isNaN(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    // Find the chat between these users
    const chat = await Chat.findOne({
      where: {
        [Op.or]: [
          {
            participant1Id: userId,
            participant2Id: recipientId
          },
          {
            participant1Id: recipientId,
            participant2Id: userId
          }
        ]
      }
    });

    // If no chat exists yet, return empty array
    if (!chat) {
      return res.json([]);
    }
    
    // Find messages for this chat
    const messages = await Message.findAll({
      where: {
        chatId: chat.id
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

    // Mark messages as read and update chat unread count
    if (messages.length > 0) {
      await Message.update(
        { read: true },
        {
          where: {
            chatId: chat.id,
            recipientId: userId,
            read: false
          }
        }
      );

      // Update chat unread count based on which participant is reading
      const isParticipant1 = chat.participant1Id === userId;
      await chat.update({
        unreadCount1: isParticipant1 ? 0 : chat.unreadCount1,
        unreadCount2: isParticipant1 ? chat.unreadCount2 : 0
      });
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

const sendMessage = asyncWrapper(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const { text, recipientId, type, replyToId } = req.body;

    // Validate message length
    if (!text || text.length < MESSAGE_MIN_LENGTH) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ error: `Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters` });
    }

    // Sanitize message text
    const sanitizedText = xss(text.trim());

    const senderId = req.user.id;
    const senderType = req.user.isMentor ? 'Mentor' : 'User';
    const recipientType = senderType === 'Mentor' ? 'User' : 'Mentor';

    // Validate recipientId
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Parse recipientId to ensure it's a number
    const parsedRecipientId = parseInt(recipientId, 10);
    if (isNaN(parsedRecipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    // Find or create chat between these users
    let chat = await Chat.findOne({
      where: {
        [Op.or]: [
          {
            participant1Id: senderId,
            participant2Id: parsedRecipientId
          },
          {
            participant1Id: parsedRecipientId,
            participant2Id: senderId
          }
        ]
      }
    });

    if (!chat) {
      // Create new chat if it doesn't exist
      chat = await Chat.create({
        participant1Id: senderId,
        participant1Type: senderType,
        participant2Id: parsedRecipientId,
        participant2Type: recipientType,
        lastMessageAt: new Date(),
        lastMessageText: sanitizedText,
        unreadCount1: 0,
        unreadCount2: 1
      });
      console.log('Created new chat:', chat.id);
    } else {
      // Update existing chat
      const isParticipant1 = chat.participant1Id === senderId;
      await chat.update({
        lastMessageAt: new Date(),
        lastMessageText: sanitizedText,
        unreadCount1: isParticipant1 ? chat.unreadCount1 : chat.unreadCount1 + 1,
        unreadCount2: isParticipant1 ? chat.unreadCount2 + 1 : chat.unreadCount2
      });
    }

    // Create the message
    const messageData = {
      senderId,
      senderType,
      recipientId: parsedRecipientId,
      chatId: chat.id,
      text: sanitizedText,
      type: type || 'text',
      replyToId,
      read: false
    };

    // Set senderMentorId if the sender is a mentor
    if (senderType === 'Mentor') {
      messageData.senderMentorId = senderId;
    } else {
      messageData.senderMentorId = null;
    }

    const message = await Message.create(messageData);

    // Get complete message with sender details
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

    // Notification logic
    const io = req.app.get('io');
    const { connectedUsers } = require('./chat-controller');
    const recipientSocketId = connectedUsers.get(recipientId.toString());

    if (recipientSocketId) {
      const socket = io.sockets.sockets.get(recipientSocketId);
      if (socket && socket.connected) {
        io.to(recipientSocketId).emit('newMessage', messageWithDetails);
      }
    }

    // If user is not connected via socket or socket isn't working, send push notification
    if (!recipientSocketId || !io.sockets.sockets.get(recipientSocketId)?.connected) {
      try {
        const recipient = senderType === 'Mentor'
          ? await User.findByPk(recipientId)
          : await Mentor.findByPk(recipientId);

        if (recipient?.fcmToken) {
          const senderName = messageWithDetails.senderMentor ? 
            `${messageWithDetails.senderMentor.ime} ${messageWithDetails.senderMentor.prezime}` : 
            `${messageWithDetails.sender.ime} ${messageWithDetails.sender.prezime}`;

          await sendPushNotification({
            token: recipient.fcmToken,
            title: `${senderName}`,
            body: `${sanitizedText}`,
            data: {
              type: 'message',
              chatId: chat.id.toString()
            }
          });
        }
      } catch (error) {
        console.error('Push notification error:', error);
      }
    }

    return res.status(201).json(messageWithDetails);
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      message: 'Error sending message',
      error: error.message 
    });
  }
});

const sendGroupMessage = asyncWrapper(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const { text, groupId, type, replyToId } = req.body;
    const senderId = req.user.id;
    const senderType = req.user.isMentor ? 'Mentor' : 'User';

    // Validate groupId
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Parse groupId to ensure it's a number
    const parsedGroupId = parseInt(groupId, 10);
    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is a member of the group
    const group = await Group.findOne({
      where: {
        id: parsedGroupId,
        [Op.or]: [
          { '$members.id$': senderId },
          { '$mentorMembers.id$': senderId },
          { adminId: senderId }
        ]
      },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'ime', 'prezime', 'fcmToken'],
        },
        {
          model: Mentor,
          as: 'mentorMembers',
          attributes: ['id', 'ime', 'prezime', 'fcmToken'],
        },
        {
          model: Mentor,
          as: 'admin',
          attributes: ['id', 'ime', 'prezime', 'fcmToken']
        }
      ]
    });

    if (!group) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create the message with the correct sender type
    const messageData = {
      text,
      type: type || 'text',
      replyToId,
      read: false,
      groupId: parsedGroupId,
      chatId: null,
      senderType,
      senderId: senderId,
      senderMentorId: senderType === 'Mentor' ? senderId : null,
      recipientId: null
    };
    
    const message = await Message.create(messageData);

    // Get complete message with sender details
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

    // Get all group members for notifications (excluding sender)
    const allMembers = [
      ...group.members.map(member => ({ ...member.toJSON(), type: 'User' })),
      ...group.mentorMembers.map(member => ({ ...member.toJSON(), type: 'Mentor' })),
      ...(group.admin ? [{ ...group.admin.toJSON(), type: 'Mentor' }] : [])
    ].filter(member => member.id !== senderId);

    // Get sender's name for notifications
    const senderName = senderType === 'Mentor' 
      ? `${messageWithDetails.senderMentor.ime} ${messageWithDetails.senderMentor.prezime}`
      : `${messageWithDetails.sender.ime} ${messageWithDetails.sender.prezime}`;

    // Update group's last activity and increment unread count for all members except sender
    await group.update({
      lastMessageAt: new Date(),
      lastMessageText: text,
      lastMessageSender: senderName
    });

    // Update unread counts for all members except sender
    await Promise.all(allMembers.map(async (member) => {
      const unreadCountField = member.type === 'User' ? 'unreadCountUser' : 'unreadCountMentor';
      await Group.increment(unreadCountField, {
        by: 1,
        where: { id: group.id }
      });
    }));

    // Socket notifications
    const io = req.app.get('io');
    const { connectedUsers } = require('./chat-controller');

    // Send socket notifications to connected users
    allMembers.forEach(member => {
      const socketId = connectedUsers.get(member.id.toString());
      if (socketId) {
        io.to(socketId).emit('newGroupMessage', {
          ...messageWithDetails.toJSON(),
          groupName: group.name
        });
      }
    });

    // Send push notifications to offline members
    await Promise.all(allMembers.map(async (member) => {
      if (member.fcmToken) {
        try {
          await sendPushNotification({
            token: member.fcmToken,
            title: `${group.name}`,
            body: `${senderName}: ${text}`,
            data: {
              type: 'group_message',
              groupId: parsedGroupId.toString(),
              messageId: message.id.toString()
            }
          });
        } catch (error) {
          console.error(`Push notification error for member ${member.id}:`, error);
        }
      }
    }));

    return res.status(201).json(messageWithDetails);
  } catch (error) {
    console.error('Error sending group message:', error);
    return res.status(500).json({ 
      message: 'Error sending group message',
      error: error.message 
    });
  }
});

const getGroupMessages = asyncWrapper(async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.groupId, 10);
    
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if user is a member of the group
    const group = await Group.findOne({
      where: {
        id: groupId,
        [Op.or]: [
          { '$members.id$': userId },
          { '$mentorMembers.id$': userId },
          { adminId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'ime', 'prezime']
        },
        {
          model: Mentor,
          as: 'mentorMembers',
          attributes: ['id', 'ime', 'prezime']
        },
        {
          model: Mentor,
          as: 'admin',
          attributes: ['id', 'ime', 'prezime']
        }
      ]
    });

    if (!group) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find messages for this group
    const messages = await Message.findAll({
      where: {
        groupId: groupId
      },
      include: [
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

    // Process messages to manually append sender information
    const processedMessages = await Promise.all(messages.map(async (message) => {
      const messageJson = message.toJSON();
      
      if (messageJson.senderType === 'User') {
        const userSender = await User.findByPk(messageJson.senderId, {
          attributes: ['id', 'ime', 'prezime']
        });
        messageJson.sender = userSender;
        messageJson.senderMentor = null;
      } else if (messageJson.senderType === 'Mentor') {
        const mentorSender = await Mentor.findByPk(messageJson.senderId, {
          attributes: ['id', 'ime', 'prezime']
        });
        messageJson.senderMentor = mentorSender;
        messageJson.sender = null;
      }

      return messageJson;
    }));

    // Mark messages as read for the current user
    if (messages.length > 0) {
      await Message.update(
        { read: true },
        {
          where: {
            groupId: groupId,
            read: false
          }
        }
      );
    }
    
    res.json(processedMessages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Error fetching group messages' });
  }
});

const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;

    // Find the chat first
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Update all unread messages in this chat where the current user is the recipient
    const result = await Message.update(
      { read: true },
      {
        where: {
          chatId: chatId,
          recipientId: userId,
          read: false
        }
      }
    );

    // Update the unread count in the chat based on which participant is marking as read
    const isParticipant1 = chat.participant1Id === userId;
    await chat.update({
      unreadCount1: isParticipant1 ? 0 : chat.unreadCount1,
      unreadCount2: isParticipant1 ? chat.unreadCount2 : 0
    });

    console.log('Messages marked as read:', {
      chatId,
      userId,
      isParticipant1,
      updatedCount: result[0]
    });

    res.json({ 
      success: true,
      updatedCount: result[0]
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark messages as read',
      details: error.message 
    });
  }
};

const markGroupMessagesAsRead = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Find the group first
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update all unread messages in this group where the current user is not the sender
    const result = await Message.update(
      { read: true },
      {
        where: {
          groupId: groupId,
          [Op.and]: [
            {
              [Op.or]: [
                { senderId: { [Op.ne]: userId } },
                { senderId: null }
              ]
            },
            {
              [Op.or]: [
                { senderMentorId: { [Op.ne]: userId } },
                { senderMentorId: null }
              ]
            }
          ],
          read: false
        }
      }
    );

    // Reset the appropriate unread count based on user type
    const updateData = isMentor 
      ? { unreadCountMentor: 0 }
      : { unreadCountUser: 0 };
    
    await group.update(updateData);

    console.log('Group messages marked as read:', {
      groupId,
      userId,
      isMentor,
      updatedCount: result[0]
    });

    res.json({ 
      success: true,
      updatedCount: result[0]
    });

  } catch (error) {
    console.error('Error marking group messages as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark group messages as read',
      details: error.message 
    });
  }
};

const deleteMessage = asyncWrapper(async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Find the message
    const message = await Message.findByPk(messageId, {
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
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is the sender of the message
    if (message.senderId !== userId && message.senderMentorId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete the message
    await message.destroy();

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
});

module.exports = {
  getMessages,
  sendMessage,
  sendGroupMessage,
  markMessagesAsRead,
  markGroupMessagesAsRead,
  getGroupMessages,
  deleteMessage
};