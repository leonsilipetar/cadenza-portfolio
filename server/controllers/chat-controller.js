const { Message, User, Chat, Mentor, Sequelize } = require('../models');
const { Op } = Sequelize;
const admin = require('../firebase-admin');

// Connected users store
const connectedUsers = new Map();

const addConnectedUser = (userId, socketId) => {
  connectedUsers.set(userId.toString(), socketId);
  console.log(`User ${userId} connected with socket ${socketId}`);
  console.log('Connected users:', Array.from(connectedUsers.entries()));
};

const removeConnectedUser = (userId) => {
  connectedUsers.delete(userId.toString());
  console.log(`User ${userId} disconnected`);
  console.log('Connected users:', Array.from(connectedUsers.entries()));
};

const getMessages = async (req, res) => {
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
};

const saveMessage = async (req, res) => {
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

    // Create the message without chatId
    const message = await Message.create({
      senderId,
      senderType,
      recipientId: parsedRecipientId,
      text,
      replyToId,
      type: type || 'text',
      read: false
    });

    // Fetch the complete message with all associations
    const completeMessage = await Message.findByPk(message.id, {
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
          attributes: ['id', 'ime', 'prezime']
        }
      ]
    });

    res.json(completeMessage);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Error saving message' });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.isMentor ? 'Mentor' : 'User';

    // Find all chats where user is either participant1 or participant2
    const chats = await Chat.findAll({
      where: {
        [Op.or]: [
          {
            participant1Id: userId,
            participant1Type: userType
          },
          {
            participant2Id: userId,
            participant2Type: userType
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'participant1User',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Mentor,
          as: 'participant1Mentor',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: User,
          as: 'participant2User',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        },
        {
          model: Mentor,
          as: 'participant2Mentor',
          attributes: ['id', 'ime', 'prezime'],
          required: false
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // Format chats to show correct participant info
    const formattedChats = chats.map(chat => {
      const chatData = chat.toJSON();
      const isParticipant1 = chatData.participant1Id === userId;

      // Get the other participant's info
      const otherParticipant = isParticipant1 
        ? (chatData.participant2Type === 'Mentor' ? chatData.participant2Mentor : chatData.participant2User)
        : (chatData.participant1Type === 'Mentor' ? chatData.participant1Mentor : chatData.participant1User);

      return {
        id: chatData.id,
        participant: otherParticipant,
        lastMessageAt: chatData.lastMessageAt,
        lastMessageText: chatData.lastMessageText,
        unreadCount: isParticipant1 ? chatData.unreadCount1 : chatData.unreadCount2
      };
    }).filter(chat => chat.participant !== null); // Filter out chats where participant info is missing

    res.json(formattedChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
};

const sendPushNotification = async (recipientId, message) => {
  try {
    const recipient = await User.findByPk(recipientId);
    if (!recipient || !recipient.fcmToken) return;

    const senderName = message.senderMentor ? 
      `${message.senderMentor.ime} ${message.senderMentor.prezime}` : 
      `${message.sender.ime} ${message.sender.prezime}`;

    const notification = {
      title: 'Nova poruka',
      body: `${senderName}: ${message.text}`,
      data: {
        type: 'message',
        messageId: message.id.toString(),
        chatId: message.chatId.toString()
      }
    };

    console.log('Sending notification:', notification);
    
    await admin.messaging().send({
      token: recipient.fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Export the user tracking functions
module.exports = {
  getMessages,
  saveMessage,
  getChats,
  addConnectedUser,
  removeConnectedUser,
  connectedUsers
};
