'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First drop the existing chatId column
    await queryInterface.removeColumn('Message', 'chatId');

    // Add new chatId column with proper foreign key reference
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Chat',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the foreign key column
    await queryInterface.removeColumn('Message', 'chatId');

    // Add back the original chatId column
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
}; 