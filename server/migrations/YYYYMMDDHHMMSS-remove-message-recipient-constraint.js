'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the foreign key constraint
    await queryInterface.removeConstraint('Message', 'Message_recipientId_fkey');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the foreign key constraint if needed
    await queryInterface.addConstraint('Message', {
      fields: ['recipientId'],
      type: 'foreign key',
      name: 'Message_recipientId_fkey',
      references: {
        table: 'User',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
}; 