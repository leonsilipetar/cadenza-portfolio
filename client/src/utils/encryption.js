import CryptoJS from 'crypto-js';

// Generate a random encryption key for a chat
export const generateChatKey = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

// Encrypt a message before sending
export const encryptMessage = (message, chatKey) => {
  if (!chatKey) {
    console.error('No encryption key provided');
    return message;
  }
  
  try {
    return CryptoJS.AES.encrypt(message, chatKey).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return message;
  }
};

// Decrypt a received message
export const decryptMessage = (encryptedMessage, chatKey) => {
  if (!chatKey || !encryptedMessage) {
    return encryptedMessage;
  }
  
  try {
    // Check if message is actually encrypted
    if (!encryptedMessage.startsWith('U2F') && !encryptedMessage.startsWith('AES')) {
      return encryptedMessage;
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, chatKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption results in empty string, return original
    if (!decrypted) {
      return encryptedMessage;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original message if decryption fails
    return encryptedMessage;
  }
};

// Store chat keys securely in localStorage
export const storeChatKey = (chatId, key) => {
  const existingKeys = JSON.parse(localStorage.getItem('chatKeys') || '{}');
  existingKeys[chatId] = key;
  localStorage.setItem('chatKeys', JSON.stringify(existingKeys));
};

// Retrieve a chat key
export const getChatKey = (chatId) => {
  const keys = JSON.parse(localStorage.getItem('chatKeys') || '{}');
  return keys[chatId];
}; 