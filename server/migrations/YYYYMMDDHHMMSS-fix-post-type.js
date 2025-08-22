'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First drop the enum if it exists
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Post_type" CASCADE;');
    
    // Change type column to be simple STRING
    await queryInterface.changeColumn('Post', 'type', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'news'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Post', 'type', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
}; 