'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('MentorPrograms', {
      mentorId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Mentor',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      programId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'Program',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('MentorPrograms');
  }
}; 