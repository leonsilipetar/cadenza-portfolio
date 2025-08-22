'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Fix Message chatId type
    await queryInterface.removeColumn('Message', 'chatId');
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      references: { model: 'Chat', key: 'id' },
      allowNull: false
    });

    // Create MentorPrograms junction table
    await queryInterface.createTable('MentorPrograms', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      mentorId: {
        type: Sequelize.INTEGER,
        references: { model: 'Mentor', key: 'id' },
        onDelete: 'CASCADE'
      },
      programId: {
        type: Sequelize.INTEGER,
        references: { model: 'Program', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Create UserPrograms junction table
    await queryInterface.createTable('UserPrograms', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
      },
      programId: {
        type: Sequelize.INTEGER,
        references: { model: 'Program', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Add relations to User
      //all added
    // Add relations to Mentor

    // Add relations to Message
    // Add relations to Notification
    // Add relations to InvoiceSettings
    // Add relations to Invoice

    // Add relations to Group

    // Add relations to Post
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UserPrograms');
    await queryInterface.dropTable('MentorPrograms');

    // Revert Message chatId
    await queryInterface.removeColumn('Message', 'chatId');
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Remove Post relations
      //await queryInterface.removeColumn('Post', 'schoolId');

    // Remove Group relations

    // Remove Invoice relations

    // Remove InvoiceSettings relations

    // Remove Notification relations

    // Remove Message relations

    // Remove Mentor relations

    // Remove User relations
  }
};