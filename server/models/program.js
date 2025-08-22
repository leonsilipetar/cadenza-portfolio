// models/program.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Program extends Model {
    static associate(models) {
      Program.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });

      Program.belongsToMany(models.User, {
        through: 'UserPrograms',
        as: 'students',
        foreignKey: 'programId'
      });
      Program.belongsToMany(models.Mentor, {
        through: 'MentorPrograms',
        foreignKey: 'programId',
        otherKey: 'mentorId',
        as: 'mentors'
      });
      Program.hasMany(models.Enrollment, {
        foreignKey: 'programId',
        as: 'enrollments'
      });
    }
  }

  Program.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    naziv: {
      type: DataTypes.STRING,
      allowNull: false
    },
    opis: DataTypes.TEXT,
    tipovi: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue('tipovi');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('tipovi', JSON.stringify(value));
      }
    },
    cijena: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    trajanje: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    kratakOpis: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Short description for program displayed on website'
    },
    showOnWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag to control visibility on website'
    }
  }, {
    sequelize,
    modelName: 'Program',
    tableName: 'Program',
    timestamps: true
  });

  return Program;
};
