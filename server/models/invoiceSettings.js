// models/InvoiceSettings.js
'use strict';
const { Model } = require('sequelize');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = (sequelize, DataTypes) => {
  class InvoiceSettings extends Model {
    static associate(models) {
      InvoiceSettings.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
    }
  }

  InvoiceSettings.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    nazivObrta: {
      type: DataTypes.STRING,
      allowNull: false
    },
    oib: {
      type: DataTypes.STRING(11),
      allowNull: false
    },
    iban: {
      type: DataTypes.STRING(34),
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brojRacuna: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dodatneInformacije: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'InvoiceSettings',
    tableName: 'invoice_settings',
    timestamps: true
  });

  return InvoiceSettings;
};
