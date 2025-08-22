'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PendingUsers', 'brojMobitela', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('PendingUsers', 'maiZbor', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('PendingUsers', 'pohadanjeNastave', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PendingUsers', 'brojMobitela');
    await queryInterface.removeColumn('PendingUsers', 'maiZbor');
    await queryInterface.removeColumn('PendingUsers', 'pohadanjeNastave');
  }
}; 