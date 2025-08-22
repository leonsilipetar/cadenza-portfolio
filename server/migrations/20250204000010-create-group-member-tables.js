'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create GroupUserMembers table
    await queryInterface.createTable('GroupUserMembers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: { model: 'Group', key: 'id' },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Create GroupMentorMembers table
    await queryInterface.createTable('GroupMentorMembers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: { model: 'Group', key: 'id' },
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

    // Add indexes for better performance
    await queryInterface.addIndex('GroupUserMembers', ['groupId']);
    await queryInterface.addIndex('GroupUserMembers', ['userId']);
    await queryInterface.addIndex('GroupMentorMembers', ['groupId']);
    await queryInterface.addIndex('GroupMentorMembers', ['mentorId']);

    // Drop the old GroupMembers table if it exists
    const tables = await queryInterface.sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_name = \'GroupMembers\'',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      await queryInterface.dropTable('GroupMembers');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the new tables
    await queryInterface.dropTable('GroupUserMembers');
    await queryInterface.dropTable('GroupMentorMembers');

    // Recreate the old GroupMembers table
    await queryInterface.createTable('GroupMembers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: { model: 'Group', key: 'id' },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: true
      },
      mentorId: {
        type: Sequelize.INTEGER,
        references: { model: 'Mentor', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Add indexes for the old table
    await queryInterface.addIndex('GroupMembers', ['groupId']);
    await queryInterface.addIndex('GroupMembers', ['userId']);
    await queryInterface.addIndex('GroupMembers', ['mentorId']);
  }
}; 