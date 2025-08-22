'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if Notifications exists and migrate data if needed
    try {
      const [results] = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Notifications'
        );`
      );
      
      if (results[0].exists) {
        // Migrate data if Notifications exists
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

        // Drop the old table
        await queryInterface.dropTable('Notifications');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.resolve();
  }
}; 