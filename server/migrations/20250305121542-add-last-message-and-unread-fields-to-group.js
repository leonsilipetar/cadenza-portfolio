'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Group', 'lastMessageAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Group', 'lastMessageText', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Group', 'lastMessageSender', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Group', 'unreadCountUser', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('Group', 'unreadCountMentor', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Group', 'lastMessageAt');
    await queryInterface.removeColumn('Group', 'lastMessageText');
    await queryInterface.removeColumn('Group', 'lastMessageSender');
    await queryInterface.removeColumn('Group', 'unreadCountUser');
    await queryInterface.removeColumn('Group', 'unreadCountMentor');
  }
};
