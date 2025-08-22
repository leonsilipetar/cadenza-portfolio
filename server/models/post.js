// models/post.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      Post.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });

      Post.belongsTo(models.Mentor, {
        foreignKey: 'mentorId',
        as: 'author'
      });
    }
  }

  Post.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Mentor',
        key: 'id'
      }
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    visibility: {
      type: DataTypes.STRING,
      defaultValue: 'public',
      allowNull: false,
      validate: {
        isIn: [['public', 'mentor', 'admin']]
      }
    },
    showAllSchools: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'news',
      allowNull: true,
      validate: {
        isIn: [['news', 'announcement', 'event']]
      }
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    modelName: 'Post',
    tableName: 'Post',
    timestamps: true
  });

  return Post;
};
