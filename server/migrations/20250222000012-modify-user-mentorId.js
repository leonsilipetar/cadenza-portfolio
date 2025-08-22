'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First drop the existing mentorId column if it exists
    await queryInterface.removeColumn('User', 'mentorId');
    
    // Then add it back as an array
    await queryInterface.addColumn('User', 'mentorId', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      defaultValue: [],
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // First remove the array column
    await queryInterface.removeColumn('User', 'mentorId');
    
    // Then add back the original integer column
    await queryInterface.addColumn('User', 'mentorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Mentor',
        key: 'id'
      }
    });
  }
}; 