'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PendingUsers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      ime: {
        type: Sequelize.STRING,
        allowNull: false
      },
      prezime: {
        type: Sequelize.STRING,
        allowNull: false
      },
      oib: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      datumRodjenja: {
        type: Sequelize.DATE,
        allowNull: false
      },
      adresa: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          ulica: null,
          kucniBroj: null,
          mjesto: null
        }
      },
      roditelj1: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          ime: null,
          prezime: null,
          brojMobitela: null
        }
      },
      roditelj2: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          ime: null,
          prezime: null,
          brojMobitela: null
        }
      },
      programId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Program',
          key: 'id'
        }
      },
      pohadjaTeoriju: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      napomene: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      maloljetniClan: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'declined'),
        defaultValue: 'pending'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('PendingUsers', ['email']);
    await queryInterface.addIndex('PendingUsers', ['oib']);
    await queryInterface.addIndex('PendingUsers', ['status']);
    await queryInterface.addIndex('PendingUsers', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PendingUsers');
  }
}; 