'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RasporedTeorija extends Model {
    static associate(models) {
      RasporedTeorija.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
    }
  }

  RasporedTeorija.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pon: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('pon');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    uto: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('uto');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    sri: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('sri');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    cet: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('cet');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    pet: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('pet');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    sub: {
      type: DataTypes.JSONB,
      defaultValue: [],
      get() {
        const value = this.getDataValue('sub');
        return value ? value.map(slot => ({
          ...slot,
          duration: slot.duration || 45
        })) : [];
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'RasporedTeorija',
    tableName: 'RasporedTeorija',
    timestamps: true
  });

  RasporedTeorija.associate = function(models) {
    RasporedTeorija.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
  };

  return RasporedTeorija;
};