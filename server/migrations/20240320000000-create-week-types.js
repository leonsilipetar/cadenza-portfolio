'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the ENUM type for week type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_week_type AS ENUM ('A', 'B');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('week_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      type: {
        type: Sequelize.ENUM('A', 'B'),
        allowNull: false
      },
      date: {
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
    await queryInterface.addIndex('week_types', ['schoolId']);
    await queryInterface.addIndex('week_types', ['date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('week_types');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_week_type;');
  }
}; 