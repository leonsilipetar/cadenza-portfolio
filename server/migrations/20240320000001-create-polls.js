'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the ENUM type for poll status
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_poll_status AS ENUM ('active', 'ended', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Then create the ENUM type for poll type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_poll_type AS ENUM ('teorija', 'voznja');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('polls', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      question: {
        type: Sequelize.STRING,
        allowNull: false
      },
      options: {
        type: Sequelize.JSON,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('teorija', 'voznja'),
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'School',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      creatorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Mentor',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('active', 'ended', 'cancelled'),
        defaultValue: 'active'
      },
      responses: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      recipientIds: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('polls', ['schoolId']);
    await queryInterface.addIndex('polls', ['creatorId']);
    await queryInterface.addIndex('polls', ['status']);
    await queryInterface.addIndex('polls', ['endDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('polls');
    
    // Drop the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_poll_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_poll_type;');
  }
}; 