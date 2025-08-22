// models/user.js
'use strict';
const { Model } = require('sequelize');
const { Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User belongs to a School
      User.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });

      // User can have many programs
      User.belongsToMany(models.Program, {
        through: 'UserPrograms',
        as: 'programs',
        foreignKey: 'userId'
      });

      // User has one Raspored
      User.belongsTo(models.Raspored, {
        foreignKey: 'rasporedId',
        as: 'raspored'
      });

      // User has one RasporedTeorija
      User.belongsTo(models.RasporedTeorija, {
        foreignKey: 'rasporedTeorijaId',
        as: 'rasporedTeorija'
      });

      // User belongs to Program
      User.belongsTo(models.Program, {
        foreignKey: 'programId',
        as: 'program'
      });

      User.hasMany(models.Invoice, {
        foreignKey: 'studentId',
        as: 'invoices'
      });

      User.hasMany(models.Enrollment, {
        foreignKey: 'userId',
        as: 'enrollments'
      });
    }
  }
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      autoIncrementIdentity: true
    },
    korisnickoIme: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    ime: { type: DataTypes.STRING, allowNull: true },
    prezime: { type: DataTypes.STRING, allowNull: true },
    isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
    isMentor: { type: DataTypes.BOOLEAN, defaultValue: false },
    isStudent: { type: DataTypes.BOOLEAN, defaultValue: true },
    oib: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    brojMobitela: { type: DataTypes.STRING, allowNull: true },
    datumRodjenja: { type: DataTypes.DATE, allowNull: true },
    adresa: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        ulica: null,
        kucniBroj: null,
        mjesto: null
      }
    },
    roditelj1: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        ime: null,
        prezime: null,
        brojMobitela: null
      }
    },
    roditelj2: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        ime: null,
        prezime: null,
        brojMobitela: null
      }
    },
    pohadjaTeoriju: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    napomene: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    maloljetniClan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'School' }
    },
    rasporedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Raspored', key: 'id' }
    },
    mentorId: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
      allowNull: true
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Program', key: 'id' }
    },
    rasporedTeorijaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'RasporedTeorija', key: 'id' }
    },
    racuni: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [] },
    programType: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reminderPreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        practiceReminders: true,
        classReminders: true,
        reminderTime: '14:00' // Default reminder time
      }
    },
    profilePicture: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      validate: {
        sizeLimit(value) {
          if (value && value.data && Buffer.from(value.data).length > 2 * 1024 * 1024) {
            throw new Error('Profile picture must be less than 2MB');
          }
        }
      }
    },
    hasUnpaidInvoice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'User',
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeCreate: async (user) => {
        const lastId = await User.max('id') || 1999999;
        if (user.isStudent && !user.id) {
          user.id = Math.max(lastId + 1, 2000000);
        }
      }
    }
  });

  return User;
};
