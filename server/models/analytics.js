'use strict';

module.exports = (sequelize, DataTypes) => {
  const Analytics = sequelize.define('Analytics', {
    device_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    browser: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    screen_width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    screen_height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_pwa: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    is_mobile: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    page_load_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time in milliseconds from navigation start to load event'
    },
    time_to_interactive: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time in milliseconds until page becomes interactive'
    },
    api_response_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Average API response time in milliseconds'
    },
    memory_usage: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'JS heap size in MB'
    },
    session_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Session duration in seconds'
    },
    pages_per_session: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    bounce_rate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Percentage of single-page sessions'
    },
    active_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time in seconds user was actively engaging with the page'
    },
    feature_used: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Name of the feature being used'
    },
    interaction_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Number of times feature was used in session'
    }
  }, {
    tableName: 'analytics',
    timestamps: true,
    indexes: [
      {
        fields: ['createdAt']
      },
      {
        fields: ['device_type']
      },
      {
        fields: ['browser']
      },
      {
        fields: ['feature_used']
      },
      {
        fields: ['session_duration']
      }
    ]
  });

  return Analytics;
}; 