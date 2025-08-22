'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('analytics', 'session_duration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Session duration in seconds'
    });

    await queryInterface.addColumn('analytics', 'pages_per_session', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1
    });

    await queryInterface.addColumn('analytics', 'bounce_rate', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Percentage of single-page sessions'
    });

    await queryInterface.addColumn('analytics', 'active_time', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Time in seconds user was actively engaging with the page'
    });

    await queryInterface.addColumn('analytics', 'feature_used', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Name of the feature being used'
    });

    await queryInterface.addColumn('analytics', 'interaction_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Number of times feature was used in session'
    });

    await queryInterface.addColumn('analytics', 'page_load_time', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Time in milliseconds from navigation start to load event'
    });

    await queryInterface.addColumn('analytics', 'time_to_interactive', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Time in milliseconds until page becomes interactive'
    });

    await queryInterface.addColumn('analytics', 'api_response_time', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Average API response time in milliseconds'
    });

    await queryInterface.addColumn('analytics', 'memory_usage', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'JS heap size in MB'
    });

    // Add index for feature_used and session_duration
    await queryInterface.addIndex('analytics', ['feature_used']);
    await queryInterface.addIndex('analytics', ['session_duration']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('analytics', 'session_duration');
    await queryInterface.removeColumn('analytics', 'pages_per_session');
    await queryInterface.removeColumn('analytics', 'bounce_rate');
    await queryInterface.removeColumn('analytics', 'active_time');
    await queryInterface.removeColumn('analytics', 'feature_used');
    await queryInterface.removeColumn('analytics', 'interaction_count');
    await queryInterface.removeColumn('analytics', 'page_load_time');
    await queryInterface.removeColumn('analytics', 'time_to_interactive');
    await queryInterface.removeColumn('analytics', 'api_response_time');
    await queryInterface.removeColumn('analytics', 'memory_usage');
  }
}; 