'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Enrollment', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'School', key: 'id' },
        onDelete: 'CASCADE'
      },
      programId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Program', key: 'id' },
        onDelete: 'SET NULL'
      },
      mentorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Mentor', key: 'id' },
        onDelete: 'SET NULL'
      },
      schoolYear: { type: Sequelize.STRING, allowNull: false },
      agreementAccepted: { type: Sequelize.BOOLEAN, defaultValue: false },
      agreementAcceptedAt: { type: Sequelize.DATE, allowNull: true },
      agreementTextSnapshot: { type: Sequelize.TEXT, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Enrollment');
  }
}; 