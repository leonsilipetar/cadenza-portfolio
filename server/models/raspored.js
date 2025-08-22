'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Raspored extends Model {
    static associate(models) {
      // Foreign key association for student
      Raspored.belongsTo(models.User, {
        foreignKey: 'ucenikId',
        as: 'ucenik'
      });

      // Add school association
      Raspored.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });

      // Add classroom association
      Raspored.belongsTo(models.Classroom, {
        foreignKey: 'classroomId',
        as: 'classroom'
      });
    }
  }

  Raspored.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    classroomId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Classroom',
        key: 'id'
      }
    },
    ucenikId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    pon: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    uto: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    sri: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    cet: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    pet: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    sub: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Raspored',
    tableName: 'Raspored',
    timestamps: true
  });

  return Raspored;
};
