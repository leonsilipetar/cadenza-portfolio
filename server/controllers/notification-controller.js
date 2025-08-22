const { Notification, User, Mentor, Post, Raspored, Message, sequelize } = require('../models');
const admin = require('firebase-admin');
const asyncWrapper = require('../middleware/asyncWrapper');
const { Op } = require('sequelize');

// Get notifications for the authenticated user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notifications for user:', userId);

    // Determine if the user is a mentor or regular user
    const isMentor = req.user.isMentor;

    // Build where clause to get both public notifications and user-specific ones
    const whereClause = {
      [Op.or]: [
        { isPublic: true },
        isMentor ? { mentorId: userId } : { userId }
      ]
    };

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [{
        model: isMentor ? User : Mentor,
        as: isMentor ? 'user' : 'mentor',
        attributes: ['id', 'ime', 'prezime']
      }]
    });

    console.log('Found notifications:', notifications.length);
    res.json(notifications);
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send notification to specific users
const sendNotification = async (req, res) => {
  try {
    const { userIds, title, message, type, senderId, senderType } = req.body;

    // Get FCM tokens for all target users
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'fcmToken']
    });

    const tokens = users.map(user => user.fcmToken).filter(token => token);

    // Prepare notification payload
    const notification = {
      title,
      body: message
    };

    // Send FCM notifications if there are valid tokens
    if (tokens.length > 0) {
      try {
        await admin.messaging().sendMulticast({
          tokens,
          notification,
          data: {
            type,
            senderId: senderId.toString()
          }
        });
      } catch (fcmError) {
        console.error('FCM Error:', fcmError);
        // Continue execution even if FCM fails
      }
    }

    // Create notification records in database
    await Promise.all(userIds.map(userId =>
      Notification.create({
        userId,
        senderId,
        senderType,
        title,
        message,
        type,
        read: false
      })
    ));

    res.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ message: 'Error sending notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }

    // First find the notification
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        [Op.or]: [
          { userId: userId },
          { mentorId: userId },
          { isPublic: true }
        ]
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    // Use direct SQL update to avoid validation
    await Notification.update(
      { read: true },
      {
        where: { id: notificationId },
        individualHooks: false, // Disable validation hooks
        validate: false // Disable validation
      }
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      message: 'Error marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    // First find the notification
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        [isMentor ? 'mentorId' : 'userId']: userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Delete the notification
    await notification.destroy();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      message: 'Error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create notification and send push notification
const createNotification = async (data) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId: data.userId || null,
      mentorId: data.mentorId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      postId: data.postId || null,
      rasporedId: data.rasporedId || null,
      messageId: data.messageId || null,
      documentId: data.documentId || null,
      invoiceId: data.invoiceId || null,
      isPublic: data.isPublic || false,
      senderId: data.senderId || null,
      senderType: data.senderType || null,
      read: false
    });

    // Send push notification
    await sendPushNotification({
      userId: data.userId,
      mentorId: data.mentorId,
      isPublic: data.isPublic,
      title: data.title,
      message: data.message,
      type: data.type,
      data: {
        type: data.type,
        postId: data.postId?.toString(),
        rasporedId: data.rasporedId?.toString(),
        messageId: data.messageId?.toString(),
        documentId: data.documentId?.toString(),
        invoiceId: data.invoiceId?.toString()
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Send push notification
const sendPushNotification = async (data) => {
  try {
    let tokens = [];
    
    if (data.isPublic) {
      // For public notifications, get tokens based on metadata if available
      const whereClause = {};
      
      if (data.metadata) {
        switch (data.metadata.visibility) {
          case 'admin':
            whereClause.isAdmin = true;
            break;
          case 'mentor':
            whereClause.isMentor = true;
            break;
          // public case doesn't need additional conditions
        }

        // Add school filtering if applicable
        if (!data.metadata.showAllSchools && data.metadata.schoolId) {
          whereClause.schoolId = data.metadata.schoolId;
        }
      }

      // Get user tokens based on conditions
      const users = await User.findAll({
        where: {
          ...whereClause,
          fcmToken: { [Op.ne]: null }
        },
        attributes: ['fcmToken']
      });

      // Get mentor tokens if needed
      if (!data.metadata || data.metadata.visibility !== 'admin') {
        const mentorWhereClause = {
          fcmToken: { [Op.ne]: null }
        };
        if (!data.metadata?.showAllSchools && data.metadata?.schoolId) {
          mentorWhereClause.schoolId = data.metadata.schoolId;
        }
        const mentors = await Mentor.findAll({
          where: mentorWhereClause,
          attributes: ['fcmToken']
        });
        tokens.push(...mentors.map(mentor => mentor.fcmToken));
      }

      tokens.push(...users.map(user => user.fcmToken));
      tokens = tokens.filter(token => token); // Remove any null/undefined tokens
    } else {
      // Handle individual notifications as before
      if (data.userId) {
        const user = await User.findByPk(data.userId);
        if (user?.fcmToken) tokens.push(user.fcmToken);
      } else if (data.mentorId) {
        const mentor = await Mentor.findByPk(data.mentorId);
        if (mentor?.fcmToken) tokens.push(mentor.fcmToken);
      }
    }

    // If we have tokens, send the notification to each token
    if (tokens.length > 0) {
      const successfulTokens = [];
      const failedTokens = [];

      for (const token of tokens) {
        try {
          const message = {
            token, // Single token instead of tokens array
            notification: {
              title: data.title,
              body: data.message
            },
            data: {
              type: data.type || '',
              postId: data.postId ? data.postId.toString() : '',
              rasporedId: data.rasporedId ? data.rasporedId.toString() : '',
              messageId: data.messageId ? data.messageId.toString() : '',
              url: getNotificationUrl(data)
            }
          };

          await admin.messaging().send(message);
          successfulTokens.push(token);
        } catch (error) {
          console.error(`Error sending to token ${token}:`, error);
          failedTokens.push(token);
          
          // If token is invalid, remove it from database
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            await removeInvalidTokens([token]);
          }
        }
      }

      console.log(`Successfully sent notifications: ${successfulTokens.length}/${tokens.length}`);
      if (failedTokens.length > 0) {
        console.log('Failed tokens:', failedTokens);
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Helper to determine notification URL
const getNotificationUrl = (data) => {
  switch (data.type) {
    case 'post':
      return `/posts/${data.postId}`;
    case 'raspored':
      return `/raspored/${data.rasporedId}`;
    case 'message':
      return '/chat';
    default:
      return '/';
  }
};

// Remove invalid FCM tokens
const removeInvalidTokens = async (tokens) => {
  try {
    await User.update(
      { fcmToken: null },
      { where: { fcmToken: { [Op.in]: tokens } } }
    );

    await Mentor.update(
      { fcmToken: null },
      { where: { fcmToken: { [Op.in]: tokens } } }
    );
  } catch (error) {
    console.error('Error removing invalid tokens:', error);
  }
};

// Create notification for new message - ONLY push notification, no DB storage
const createMessageNotification = async (message, sender) => {
  try {
    const recipient = message.senderType === 'Mentor'
      ? await User.findByPk(message.recipientId)
      : await Mentor.findByPk(message.recipientId);

    if (!recipient || !recipient.fcmToken) {
      return;
    }

    const senderName = sender.isMentor 
      ? `${message.senderMentor.ime} ${message.senderMentor.prezime}`
      : `${message.sender.ime} ${message.sender.prezime}`;

    await sendPushNotification({
      token: recipient.fcmToken,
      title: 'Nova poruka',
      message: `${senderName}: ${message.text}`,
      data: {
        messageId: message.id.toString(),
        type: 'message',
        chatId: message.chatId?.toString()
      }
    });
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

// Create notification for posts - BOTH DB and push notification
const createPostNotification = async (post, sender) => {
  try {
    // Determine recipients based on post visibility
    let whereClause = {};
    
    switch (post.visibility) {
      case 'admin':
        whereClause = { isAdmin: true };
        break;
      case 'mentor':
        whereClause = { isMentor: true };
        break;
      case 'public':
        // No where clause needed for public posts
        break;
      default:
        console.log('Unknown visibility type:', post.visibility);
        return;
    }

    // If post is school-specific and not marked as showAllSchools
    if (!post.showAllSchools && post.schoolId) {
      whereClause.schoolId = post.schoolId;
    }

    // Create notification with proper targeting
    await createNotification({
      type: 'post',
      title: 'Nova objava',
      message: `${sender.ime} ${sender.prezime} je objavio/la novu objavu: ${post.title}`,
      postId: post.id,
      senderId: sender.id,
      senderType: sender.isMentor ? 'Mentor' : 'User',
      isPublic: post.visibility === 'public',
      // Add metadata for filtering
      metadata: {
        visibility: post.visibility,
        schoolId: post.schoolId,
        showAllSchools: post.showAllSchools
      }
    });
  } catch (error) {
    console.error('Error creating post notification:', error);
  }
};

// Create notification for schedule updates
const createRasporedNotification = async (raspored, sender, recipients) => {
  try {

    // Determine if this is a teorija update based on the raspored object structure
    const isTeorija = !raspored.ucenikId;
    const updateType = isTeorija ? 'teoriju' : 'raspored';

    // If recipients is provided, send individual notifications
    if (recipients && recipients.length > 0) {
      for (const recipient of recipients) {
        await createNotification({
          userId: recipient.id,
          type: 'schedule',
          title: 'Ažuriran raspored',
          message: `${senderName} je ažurirao/la ${updateType}`,
          rasporedId: raspored.id,
          senderId: sender.id,
          senderType: sender.isMentor ? 'Mentor' : 'User',
          isPublic: false
        });
      }
    } else {
      // Otherwise, create a public notification
      await createNotification({
        type: 'schedule',
        title: 'Ažuriran raspored',
        message: `${senderName} je ažurirao/la ${updateType}`,
        rasporedId: raspored.id,
        senderId: sender.id,
        senderType: sender.isMentor ? 'Mentor' : 'User',
        isPublic: true
      });
    }
  } catch (error) {
    console.error('Error creating raspored notification:', error);
  }
};

// Create notification for new invoices
const createInvoiceNotification = async (invoice, sender, recipient) => {
  try {

    await createNotification({
      userId: recipient.id,
      type: 'invoice',
      title: 'Novi račun',
      message: `Novi račun`,
      invoiceId: invoice.id,
      senderId: sender.id,
      senderType: sender.isMentor ? 'Mentor' : 'User',
      isPublic: false
    });
  } catch (error) {
    console.error('Error creating invoice notification:', error);
  }
};

// Create notification for shared documents
const createDocumentShareNotification = async (document, sender, recipients) => {
  try {

    for (const recipient of recipients) {
      await createNotification({
        userId: recipient.id,
        type: 'document',
        title: 'Podijeljen dokument',
        message: `${senderName} je podijelio/la dokument: ${document.name}`,
        documentId: document.id,
        senderId: sender.id,
        senderType: sender.isMentor ? 'Mentor' : 'User',
        isPublic: false
      });
    }
  } catch (error) {
    console.error('Error creating document share notification:', error);
  }
};

const createBulkNotifications = asyncWrapper(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const { title, message, type, link, userIds } = req.body;

  try {
    let recipients;
    if (userIds && userIds.length > 0) {
      // Create notifications for specific users
      recipients = await User.findAll({
        where: {
          id: userIds
        }
      });
    } else {
      // Create notifications for all users
      recipients = await User.findAll();
    }

    const notifications = await Promise.all(
      recipients.map(recipient =>
        Notification.create({
          title,
          message,
          type,
          link,
          userId: recipient.id,
          senderId: req.user.id,
          read: false
        })
      )
    );

    return res.status(201).json({ notifications });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return res.status(500).json({ message: 'Error creating notifications' });
  }
});

// Get notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        userId
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    // Build where clause to update both public notifications and user-specific ones
    const whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            // Public notifications
            { 
              [Op.and]: [
                { isPublic: true },
                { read: false }
              ]
            },
            // User-specific notifications
            isMentor ? 
              { mentorId: userId } : 
              { userId: userId }
          ]
        },
        { read: false }
      ]
    };

    const result = await Notification.update(
      { read: true },
      {
        where: whereClause,
        individualHooks: false // Disable validation hooks for performance
      }
    );

    // Log the number of updated records
    console.log(`Updated ${result[0]} notifications`);

    res.json({ 
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result[0]
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cleanup old read notifications
const cleanupOldNotifications = async () => {
  try {
    // Calculate date 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const result = await Notification.destroy({
      where: {
        read: true,
        createdAt: {
          [Op.lt]: twoWeeksAgo
        }
      }
    });

    console.log(`Cleaned up ${result} old read notifications`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    throw error;
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification,
  createBulkNotifications,
  createPostNotification,
  createRasporedNotification,
  createInvoiceNotification,
  createDocumentShareNotification,
  getUserNotifications,
  markAllAsRead,
  cleanupOldNotifications
};
