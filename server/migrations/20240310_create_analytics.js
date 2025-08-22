'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      device_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      browser: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      platform: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      language: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      screen_width: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      screen_height: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_pwa: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      is_mobile: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('analytics', ['createdAt']);
    await queryInterface.addIndex('analytics', ['device_type']);
    await queryInterface.addIndex('analytics', ['browser']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analytics');
  }
}; 