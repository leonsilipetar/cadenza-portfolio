import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCulVokylkRYHA6wXnQkcEbO9b0pgON00w",
  authDomain: "cadenza-d5776.firebaseapp.com",
  projectId: "cadenza-d5776",
  storageBucket: "cadenza-d5776.appspot.com",
  messagingSenderId: "975125523948",
  appId: "1:975125523948:web:86c084bdc5e3d7ae30a4c9",
  measurementId: "G-DZT5CQ2WL3"
};

const app = initializeApp(firebaseConfig);

// Initialize messaging
let messagingInstance = null;

// Initialize messaging and export it
const initializeMessaging = async () => {
  try {
    const isMessagingSupported = await isSupported();
    if (isMessagingSupported && 'Notification' in window) {
      messagingInstance = getMessaging(app);
      return true;
    }
    console.log('Firebase messaging is not supported in this browser');
    return false;
  } catch (error) {
    console.error('Error checking messaging support:', error);
    return false;
  }
};

// Initialize messaging immediately
initializeMessaging();

// Export the messaging instance
export const messaging = messagingInstance;

// Export messaging instance getter
export const getMessagingInstance = () => messagingInstance;

// Add debounce helper
let tokenUpdateTimeout = null;
let lastTokenUpdate = null;
const TOKEN_UPDATE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Monitor token changes
const monitorToken = async () => {
  if (!messagingInstance) return;

  // Check if we're within cooldown period
  if (lastTokenUpdate && Date.now() - lastTokenUpdate < TOKEN_UPDATE_COOLDOWN) {
    console.log('Token update skipped - within cooldown period');
    return;
  }

  try {
    // Clear any pending update
    if (tokenUpdateTimeout) {
      clearTimeout(tokenUpdateTimeout);
    }

    // Debounce the token update
    tokenUpdateTimeout = setTimeout(async () => {
      const currentToken = await getToken(messagingInstance, {
        vapidKey: "BB3Wbtcy5tB6mujuv50L9AVzlhE7kgq6pACMtQ-UZjWeY9MCMPHaFqpiCf6Iz5Tkk35YsLfOPTg4tGprkZRAGsU"
      });

      if (currentToken) {
        // Send to server
        await fetch('/api/users/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: currentToken })
        });
        lastTokenUpdate = Date.now();
      }
    }, 2000); // 2 second debounce
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
};

// Get FCM Token
export const getFCMToken = async () => {
  try {
    // Check if messaging is supported first
    const isSupported = await initializeMessaging();
    if (!isSupported) {
      console.log('Messaging not supported on this device/browser');
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported');
      return null;
    }

  const currentToken = await getToken(messagingInstance, {
      vapidKey: "BB3Wbtcy5tB6mujuv50L9AVzlhE7kgq6pACMtQ-UZjWeY9MCMPHaFqpiCf6Iz5Tkk35YsLfOPTg4tGprkZRAGsU",
    // Use the existing main SW registration for messaging integration
    serviceWorkerRegistration: await navigator.serviceWorker.ready
    });

    if (currentToken) {
      console.log('FCM Token obtained');
      // Setup token monitoring
      setInterval(monitorToken, 60 * 60 * 1000); // Check token every hour
      return currentToken;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }
  return Notification.requestPermission();
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messagingInstance) {
      resolve(null);
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });