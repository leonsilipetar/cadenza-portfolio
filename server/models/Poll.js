'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Poll extends Model {
    static associate(models) {
      Poll.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
      Poll.belongsTo(models.Mentor, {
        foreignKey: 'creatorId',
        as: 'creator'
      });
    }
  }

  Poll.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('teorija', 'voznja'),
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Mentor',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'ended', 'cancelled'),
      defaultValue: 'active'
    },
    responses: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    recipientIds: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Poll',
    tableName: 'polls',
    timestamps: true
  });

  return Poll;
}; 