'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pdfData: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Document',
        key: 'id'
      }
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    creatorName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sharedToIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // Google Drive integration fields
    driveFileId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Google Drive file ID if the document is stored in Drive'
    },
    driveUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Direct URL to the file in Google Drive'
    },
    driveIntegrated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this document is stored in Google Drive'
    },
    driveThumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Thumbnail URL for Google Drive preview'
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'School',
        key: 'id'
      },
      comment: 'School that owns this document'
    }
  }, {
    tableName: 'Document'
  });

  Document.associate = function(models) {
    // Allow both Mentors and Users as creators
    Document.belongsTo(models.Mentor, {
      foreignKey: 'creatorId',
      as: 'mentorCreator',
      constraints: false
    });

    Document.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'userCreator',
      constraints: false
    });

    // Allow both Mentors and Users as shared users
    Document.belongsToMany(models.Mentor, {
      through: 'DocumentShares',
      foreignKey: 'documentId',
      otherKey: 'userId',
      as: 'sharedWithMentors',
      constraints: false
    });

    Document.belongsToMany(models.User, {
      through: 'DocumentShares',
      foreignKey: 'documentId',
      otherKey: 'userId',
      as: 'sharedWithUsers',
      constraints: false
    });
    
    // Add association to School
    Document.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
  };

  return Document;
}; 