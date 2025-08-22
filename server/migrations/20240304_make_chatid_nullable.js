'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Chat',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Message', 'chatId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Chat',
        key: 'id'
      }
    });
  }
}; 