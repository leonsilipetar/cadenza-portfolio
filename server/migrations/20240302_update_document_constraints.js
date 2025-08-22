'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, remove the existing foreign key constraint
    await queryInterface.removeConstraint('Document', 'Document_creatorId_fkey');

    // No need to add new constraints since we want it to be flexible
    // The application layer will handle the validation
  },

  down: async (queryInterface, Sequelize) => {
    // Restore the original foreign key constraint
    await queryInterface.addConstraint('Document', {
      fields: ['creatorId'],
      type: 'foreign key',
      name: 'Document_creatorId_fkey',
      references: {
        table: 'Mentor',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
}; 