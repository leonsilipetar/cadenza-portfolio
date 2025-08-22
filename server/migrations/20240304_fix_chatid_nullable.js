'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First drop the column completely
    await queryInterface.removeColumn('Message', 'chatId');

    // Then add it back as nullable
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Chat',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // First drop the column
    await queryInterface.removeColumn('Message', 'chatId');

    // Then add it back as non-nullable
    await queryInterface.addColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Chat',
        key: 'id'
      }
    });
  }
}; 