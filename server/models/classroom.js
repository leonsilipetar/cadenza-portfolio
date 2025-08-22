// models/classroom.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Classroom extends Model {
    static associate(models) {
      Classroom.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
      Classroom.hasMany(models.Raspored, {
        foreignKey: 'classroomId',
        as: 'raspored'
      });
      Classroom.hasMany(models.RasporedTeorija, {
        foreignKey: 'id',
        as: 'rasporedTeorija'
      });
    }
  }

  Classroom.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'School',  // Should match the table name in the Schools model
        key: 'id'
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Classroom',
    timestamps: true
  });

  return Classroom;
};
