'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First remove the old mentorId column from User
    await queryInterface.sequelize.query(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_mentorId_fkey";
    `);
    await queryInterface.removeColumn('User', 'mentorId');

    // Create UserMentors junction table for many-to-many relationship
    await queryInterface.createTable('UserMentors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
      },
      mentorId: {
        type: Sequelize.INTEGER,
        references: { model: 'Mentor', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Remove the old studentId array from Mentor since we have the junction table now
    await queryInterface.removeColumn('Mentor', 'studentId');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the junction table
    await queryInterface.dropTable('UserMentors');
    
    // Add back mentorId to User
    await queryInterface.addColumn('User', 'mentorId', {
      type: Sequelize.INTEGER,
      references: { model: 'Mentor', key: 'id' },
      allowNull: true
    });

    // Add back studentId array to Mentor
    await queryInterface.addColumn('Mentor', 'studentId', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      defaultValue: []
    });
  }
}; 