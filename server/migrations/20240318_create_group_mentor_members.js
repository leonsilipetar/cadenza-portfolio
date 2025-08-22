'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('GroupMentorMembers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Group',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mentorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Mentor',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add a unique constraint to prevent duplicate entries
    await queryInterface.addConstraint('GroupMentorMembers', {
      fields: ['groupId', 'mentorId'],
      type: 'unique',
      name: 'unique_group_mentor'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('GroupMentorMembers');
  }
}; 