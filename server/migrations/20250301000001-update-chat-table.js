'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Chat');
    
    // Only rename if old columns exist and new ones don't
    if (tableInfo.user1Id && !tableInfo.participant1Id) {
      // First, rename existing columns to avoid conflicts
      await queryInterface.renameColumn('Chat', 'user1Id', 'old_user1Id');
      await queryInterface.renameColumn('Chat', 'user2Id', 'old_user2Id');

      // Add new columns
      await queryInterface.addColumn('Chat', 'participant1Id', {
        type: Sequelize.INTEGER,
        allowNull: true // temporarily allow null
      });
      await queryInterface.addColumn('Chat', 'participant1Type', {
        type: Sequelize.STRING,
        allowNull: true // temporarily allow null
      });
      await queryInterface.addColumn('Chat', 'participant2Id', {
        type: Sequelize.INTEGER,
        allowNull: true // temporarily allow null
      });
      await queryInterface.addColumn('Chat', 'participant2Type', {
        type: Sequelize.STRING,
        allowNull: true // temporarily allow null
      });

      // Copy data from old columns to new ones
      await queryInterface.sequelize.query(`
        UPDATE "Chat"
        SET 
          "participant1Id" = "old_user1Id",
          "participant2Id" = "old_user2Id",
          "participant1Type" = CASE 
            WHEN "old_user1Id" < 2000000 THEN 'Mentor'
            ELSE 'User'
          END,
          "participant2Type" = CASE 
            WHEN "old_user2Id" < 2000000 THEN 'Mentor'
            ELSE 'User'
          END
      `);

      // Make new columns non-nullable
      await queryInterface.changeColumn('Chat', 'participant1Id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
      await queryInterface.changeColumn('Chat', 'participant1Type', {
        type: Sequelize.STRING,
        allowNull: false
      });
      await queryInterface.changeColumn('Chat', 'participant2Id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
      await queryInterface.changeColumn('Chat', 'participant2Type', {
        type: Sequelize.STRING,
        allowNull: false
      });

      // Remove old columns
      await queryInterface.removeColumn('Chat', 'old_user1Id');
      await queryInterface.removeColumn('Chat', 'old_user2Id');
    }

    // Add these columns if they don't exist
    if (!tableInfo.lastMessageText) {
      await queryInterface.addColumn('Chat', 'lastMessageText', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    
    if (!tableInfo.unreadCount1) {
      await queryInterface.addColumn('Chat', 'unreadCount1', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }
    
    if (!tableInfo.unreadCount2) {
      await queryInterface.addColumn('Chat', 'unreadCount2', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Chat');
    
    // Only proceed with reverting if the new columns exist
    if (tableInfo.participant1Id) {
      // Add back old columns
      await queryInterface.addColumn('Chat', 'user1Id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
      await queryInterface.addColumn('Chat', 'user2Id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });

      // Copy data back
      await queryInterface.sequelize.query(`
        UPDATE "Chat"
        SET 
          "user1Id" = "participant1Id",
          "user2Id" = "participant2Id"
      `);

      // Make old columns non-nullable
      await queryInterface.changeColumn('Chat', 'user1Id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
      await queryInterface.changeColumn('Chat', 'user2Id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });

      // Remove new columns
      await queryInterface.removeColumn('Chat', 'participant1Id');
      await queryInterface.removeColumn('Chat', 'participant1Type');
      await queryInterface.removeColumn('Chat', 'participant2Id');
      await queryInterface.removeColumn('Chat', 'participant2Type');
      await queryInterface.removeColumn('Chat', 'lastMessageText');
      await queryInterface.removeColumn('Chat', 'unreadCount1');
      await queryInterface.removeColumn('Chat', 'unreadCount2');
    }
  }
}; 