// models/school.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class School extends Model {
    static associate(models) {
      School.hasMany(models.User, {
        foreignKey: 'schoolId',
        as: 'users'
      });

      School.hasMany(models.Mentor, {
        foreignKey: 'schoolId',
        as: 'mentors'
      });
      
      // Add documents association
      School.hasMany(models.Document, {
        foreignKey: 'schoolId',
        as: 'documents'
      });

      School.hasMany(models.Enrollment, {
        foreignKey: 'schoolId',
        as: 'enrollments'
      });
    }
  }

  School.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Google Drive integration fields
    driveEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether Google Drive integration is enabled for this school'
    },
    driveSettings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Google Drive integration settings like folder IDs and access tokens'
    },
    driveRootFolderId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Root folder ID for this school in Google Drive'
    },
    driveCredentials: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Encrypted OAuth credentials for Google Drive'
    },
    // New fields for website integration
    radnoVrijeme: {
      type: DataTypes.JSONB,
      defaultValue: {
        ponedjeljak: { od: '09:00', do: '20:00' },
        utorak: { od: '09:00', do: '20:00' },
        srijeda: { od: '09:00', do: '20:00' },
        cetvrtak: { od: '09:00', do: '20:00' },
        petak: { od: '09:00', do: '20:00' },
        subota: { od: '09:00', do: '13:00' },
        nedjelja: { od: null, do: null }
      },
      comment: 'Working hours of the school'
    },
    kontaktInfo: {
      type: DataTypes.JSONB,
      defaultValue: {
        telefon: null,
        email: null,
        facebook: null,
        instagram: null,
        youtube: null
      },
      comment: 'Contact information for the school'
    },
    webOpis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the school for the website'
    },
    webEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the school has a website enabled'
    },
    webSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logo: null,
        favicon: null,
        heroImage: null
      },
      comment: 'Website configuration settings'
    }
  }, {
    sequelize,
    modelName: 'School',
    tableName: 'School',
    timestamps: true
  });

  return School;
};
