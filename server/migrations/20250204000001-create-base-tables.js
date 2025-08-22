'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. School (no dependencies)
    await queryInterface.createTable('School', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: true },
      street: { type: Sequelize.STRING, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Classroom (depends on School)
    await queryInterface.createTable('Classroom', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER },
      schoolId: {
        type: Sequelize.INTEGER,
        references: { model: 'School', key: 'id' }
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 3. Program (depends on School)
    await queryInterface.createTable('Program', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      naziv: { type: Sequelize.STRING },
      opis: { type: Sequelize.TEXT },
      cijena: { type: Sequelize.DECIMAL(10, 2) },
      trajanje: { type: Sequelize.INTEGER },
      tipovi: { type: Sequelize.JSONB },
      schoolId: {
        type: Sequelize.INTEGER,
        references: { model: 'School', key: 'id' }
      },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Program');
    await queryInterface.dropTable('Classroom');
    await queryInterface.dropTable('School');
  }
};