'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('error_reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      subcategory: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      steps: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      userRole: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        }
      },
      mentorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Mentor',
          key: 'id'
        }
      },
      userEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      deviceInfo: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('new', 'in-progress', 'resolved'),
        defaultValue: 'new'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('error_reports', ['category']);
    await queryInterface.addIndex('error_reports', ['userRole']);
    await queryInterface.addIndex('error_reports', ['status']);
    await queryInterface.addIndex('error_reports', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('error_reports');
  }
}; 