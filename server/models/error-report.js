'use strict';

module.exports = (sequelize, DataTypes) => {
  const ErrorReport = sequelize.define('ErrorReport', {
    category: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    steps: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userRole: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('new', 'in-progress', 'resolved'),
      defaultValue: 'new'
    }
  }, {
    tableName: 'error_reports',
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['userRole']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ErrorReport.associate = (models) => {
    ErrorReport.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'student'
    });
    ErrorReport.belongsTo(models.Mentor, {
      foreignKey: 'mentorId',
      as: 'mentor'
    });
  };

  return ErrorReport;
}; 