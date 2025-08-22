const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PendingUser extends Model {
    static associate(models) {
      // PendingUser can reference a Program
      PendingUser.belongsTo(models.Program, {
        foreignKey: 'programId',
        as: 'program'
      });

      // PendingUser belongs to a School
      PendingUser.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
    }
  }

  PendingUser.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    ime: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    prezime: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    oib: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        len: [11, 11]
      }
    },
    datumRodjenja: { 
      type: DataTypes.DATE, 
      allowNull: false 
    },
    adresa: {
      type: DataTypes.JSONB,
      allowNull: false,
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
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Program', key: 'id' }
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    pohadjaTeoriju: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false 
    },
    napomene: { 
      type: DataTypes.TEXT,
      allowNull: true 
    },
    maloljetniClan: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    brojMobitela: {
      type: DataTypes.STRING,
      allowNull: true
    },
    maiZbor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pohadanjeNastave: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'declined'),
      defaultValue: 'pending'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'PendingUser',
    tableName: 'PendingUsers',
    timestamps: true
  });

  return PendingUser;
}; 