// models/mentor.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Mentor extends Model {
    static associate(models) {
      // Mentor belongs to a School
      Mentor.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });

      // Change to belongsToMany for multiple programs
      Mentor.belongsToMany(models.Program, {
        through: 'MentorPrograms',
        foreignKey: 'mentorId',
        otherKey: 'programId',
        as: 'programs'
      });

      // Mentor has many Posts
      Mentor.hasMany(models.Post, {
        foreignKey: 'mentorId',
        as: 'posts'
      });

      // Documents created by mentor
      Mentor.hasMany(models.Document, {
        foreignKey: 'creatorId',
        as: 'documents'
      });

      // Documents shared with mentor
      Mentor.belongsToMany(models.Document, {
        through: 'DocumentShares',
        foreignKey: 'userId',
        otherKey: 'documentId',
        as: 'sharedDocuments'
      });

      Mentor.hasMany(models.Enrollment, {
        foreignKey: 'mentorId',
        as: 'enrollments'
      });
    }
  }

  Mentor.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      autoIncrementIdentity: true
    },
    korisnickoIme: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ime: {
      type: DataTypes.STRING,
      allowNull: true
    },
    prezime: {
      type: DataTypes.STRING,
      allowNull: true
    },
    oib: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    brojMobitela: {
      type: DataTypes.STRING,
      allowNull: true
    },
    datumRodjenja: {
      type: DataTypes.DATE,
      allowNull: true
    },
    adresa: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        ulica: null,
        kucniBroj: null,
        mjesto: null
      }
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isMentor: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isStudent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    napomene: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: []
    },
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    studentId: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: []
    },
    schoolId: {
      type: DataTypes.INTEGER,
      references: { model: 'School', key: 'id' }
    },
    programId: {
      type: DataTypes.INTEGER,
      references: { model: 'Program', key: 'id' },
      allowNull: true
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
    // New fields for website integration
    kratakOpis: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Short description for mentor displayed on website'
    },
    opis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Full description/content with rich text for mentor profile on website'
    },
    showOnWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag to control visibility on website'
    }
  }, {
    sequelize,
    modelName: 'Mentor',
    tableName: 'Mentor',
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeCreate: async (mentor) => {
        const lastId = await Mentor.max('id') || 999999;
        if (!mentor.id) {
          mentor.id = Math.max(lastId + 1, 1000000);
        }
      }
    }
  });

  return Mentor;
};
