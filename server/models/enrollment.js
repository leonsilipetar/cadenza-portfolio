// models/enrollment.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    static associate(models) {
      Enrollment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Enrollment.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
      Enrollment.belongsTo(models.Program, {
        foreignKey: 'programId',
        as: 'program',
        allowNull: true
      });
      Enrollment.belongsTo(models.Mentor, {
        foreignKey: 'mentorId',
        as: 'mentor',
        allowNull: true
      });
    }
  }

  Enrollment.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'id' }
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'School', key: 'id' }
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Program', key: 'id' }
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Mentor', key: 'id' }
    },
    schoolYear: {
      type: DataTypes.STRING,
      allowNull: false
    },
    agreementAccepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    agreementAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    agreementTextSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Enrollment',
    tableName: 'Enrollment',
    timestamps: true
  });

  return Enrollment;
}; 