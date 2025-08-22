'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, migrate data from Notifications to Notification if needed
    await queryInterface.sequelize.query(`
      INSERT INTO "Notification" (
        "userId", "mentorId", "type", "title", "message", 
        "read", "messageId", "isPublic", "createdAt", "updatedAt"
      )
      SELECT 
        "userId", "mentorId", "type", "title", "message",
        "read", "messageId", "isPublic", "createdAt", "updatedAt"
      FROM "Notifications"
      ON CONFLICT DO NOTHING;
    `);

    // Then drop the duplicate table
    await queryInterface.dropTable('Notifications');
  },

  down: async (queryInterface, Sequelize) => {
    // We don't want to recreate the duplicate table
    return Promise.resolve();
  }
}; 