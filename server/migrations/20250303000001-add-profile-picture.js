'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add profilePicture to User table
    await queryInterface.addColumn('User', 'profilePicture', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Stores profile picture data with size limit of 2MB'
    });

    // Add profilePicture to Mentor table
    await queryInterface.addColumn('Mentor', 'profilePicture', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Stores profile picture data with size limit of 2MB'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove profilePicture from User table
    await queryInterface.removeColumn('User', 'profilePicture');

    // Remove profilePicture from Mentor table
    await queryInterface.removeColumn('Mentor', 'profilePicture');
  }
}; 