const cron = require('node-cron');
const { PendingUser } = require('../models');
const { Op } = require('sequelize');

// Function to delete old pending requests
const cleanupPendingUsers = async () => {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const result = await PendingUser.destroy({
      where: {
        createdAt: {
          [Op.lt]: twoWeeksAgo
        },
        status: 'pending'
      }
    });

    console.log(`Cleaned up ${result} old pending user requests`);
  } catch (error) {
    console.error('Error cleaning up pending users:', error);
  }
};

// Schedule the cleanup to run every day at midnight
const schedulePendingUsersCleanup = () => {
  cron.schedule('0 0 * * *', cleanupPendingUsers);
  console.log('Scheduled pending users cleanup job');
};

module.exports = {
  schedulePendingUsersCleanup,
  cleanupPendingUsers // Exported for testing purposes
}; 