'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First remove the foreign key constraint
    await queryInterface.removeConstraint('Message', 'Message_recipientId_fkey');
    
    // Add recipientType column
    await queryInterface.addColumn('Message', 'recipientType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'User'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove recipientType column
    await queryInterface.removeColumn('Message', 'recipientType');
    
    // Add back the foreign key constraint
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