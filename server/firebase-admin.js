const admin = require('firebase-admin');
const { Message } = require('./models');

// For development, use environment variables
let credential;

// Try to use the base64 encoded service account if available
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      'base64'
    ).toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(serviceAccount);
    console.log('Using Firebase service account from base64 environment variable');
  } catch (error) {
    console.error('Error parsing Firebase service account from base64:', error);
  }
}
// Fall back to individual environment variables if base64 fails
else if (process.env.FIREBASE_PRIVATE_KEY) {
  credential = admin.credential.cert({
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
  });
  console.log('Using Firebase service account from individual environment variables');
} else {
  // For development, use a mock credential
  console.warn('Firebase credentials not found in environment variables. Using application default credentials.');
  credential = admin.credential.applicationDefault();
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Add this debug function
const debugPushNotification = async (token, title, body, data) => {
  console.log('Debug Push Notification:', {
    token: token?.substring(0, 10) + '...',  // Only log part of token for security
    title,
    body,
    data,
    isAdminInitialized: !!admin.apps.length
  });
};
// 1. Funkcija koja vraća broj nepročitanih poruka
const getUnreadMessagesCount = async (userId) => {
  try {
    const count = await Message.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });
    return count;
  } catch (error) {
    console.error('Error counting unread messages:', error);
    return 0;
  }
};

const sendPushNotification = async ({ token, title, body, data, userId }) => {
  try {
    if (!token || token === 'null' || token === 'undefined') {
      console.log('Invalid FCM token:', token);
      return;
    }

    console.log('Sending notification with data:', { title, body, data });

    let unreadMessages = 0;
    if (userId) {
      unreadMessages = await getUnreadMessagesCount(userId);
    }

    const message = {
      token,
      notification: {
        title: title || "Nova poruka",
        body: body || "Nova poruka primljena"
      },
      data: {
        type: data?.type || 'message',
        ...data
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: 'https://cadenza.com.hr/logo192.png'
        },
        fcm_options: {
          link: 'https://cadenza.com.hr/chat'
        }
      },
      android: {
        priority: "high",
        notification: {
          clickAction: 'https://cadenza.com.hr/chat'
        }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        fcm_options: {
          image: 'https://cadenza.com.hr/logo192.png'
        }
      }
    };
    

    console.log('Full message payload:', JSON.stringify(message, null, 2));

    try {
      const response = await admin.messaging().send(message);
      console.log('Message sent successfully:', response);
      return response;
    } catch (error) {
      // Handle specific FCM errors
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log('Token is invalid, removing from database...');
        // Remove invalid token from both User and Mentor tables
        await Promise.all([
          require('./models').User.update(
            { fcmToken: null },
            { where: { fcmToken: token } }
          ),
          require('./models').Mentor.update(
            { fcmToken: null },
            { where: { fcmToken: token } }
          )
        ]);
        console.log('Invalid token removed from database');
      } else {
        console.error('FCM Error:', error.code, error.message);
      }
      // Don't throw the error, just log it
      return null;
    }
  } catch (error) {
    console.error('General error in sendPushNotification:', error.message);
    // Don't throw the error, just log it
    return null;
  }
};

// Add a function to validate FCM tokens
const validateFCMToken = async (token) => {
  try {
    // Try to send a silent notification to validate the token
    await admin.messaging().send({
      token,
      data: { type: 'validation' }
    });
    return true;
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is invalid, remove it from database
      await Promise.all([
        require('./models').User.update(
          { fcmToken: null },
          { where: { fcmToken: token } }
        ),
        require('./models').Mentor.update(
          { fcmToken: null },
          { where: { fcmToken: token } }
        )
      ]);
      return false;
    }
    // For other errors, assume token might still be valid
    console.error('Error validating token:', error);
    return true;
  }
};

// Add a periodic token validation (e.g., once a day)
const validateAllTokens = async () => {
  try {
    const [users, mentors] = await Promise.all([
      require('./models').User.findAll({
        where: {
          fcmToken: {
            [require('sequelize').Op.not]: null
          }
        }
      }),
      require('./models').Mentor.findAll({
        where: {
          fcmToken: {
            [require('sequelize').Op.not]: null
          }
        }
      })
    ]);

    // Validate all tokens
    for (const user of users) {
      if (user.fcmToken) {
        await validateFCMToken(user.fcmToken);
      }
    }

    for (const mentor of mentors) {
      if (mentor.fcmToken) {
        await validateFCMToken(mentor.fcmToken);
      }
    }
  } catch (error) {
    console.error('Error validating tokens:', error);
  }
};

// Run token validation once a day
setInterval(validateAllTokens, 24 * 60 * 60 * 1000);

module.exports = {
  admin,
  sendPushNotification,
  debugPushNotification
};