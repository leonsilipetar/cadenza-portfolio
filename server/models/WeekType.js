'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WeekType extends Model {
    static associate(models) {
      WeekType.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
    }
  }

  WeekType.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('A', 'B'),
      allowNull: false
    },
    date: {
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
    }
  }, {
    sequelize,
    modelName: 'WeekType',
    tableName: 'week_types',
    timestamps: true
  });

  return WeekType;
}; 