'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Message', 'recipientId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Message', 'recipientId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: null
    });
  }
}; 