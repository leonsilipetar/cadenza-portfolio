const cron = require('node-cron');
const { cleanupOldNotifications } = require('../controllers/notification-controller');

// Schedule cleanup to run every Sunday at midnight
const scheduleNotificationCleanup = () => {
  cron.schedule('0 0 * * 0', async () => {
    console.log('Starting notification cleanup...');
    try {
      const deletedCount = await cleanupOldNotifications();
      console.log(`Successfully cleaned up ${deletedCount} old notifications`);
    } catch (error) {
      console.error('Error during notification cleanup:', error);
    }
  });
};

module.exports = scheduleNotificationCleanup; 