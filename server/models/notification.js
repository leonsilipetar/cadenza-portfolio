// models/notification.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Notification.belongsTo(models.Mentor, {
        foreignKey: 'mentorId',
        as: 'mentor'
      });
      Notification.belongsTo(models.Post, {
        foreignKey: 'postId',
        as: 'post'
      });
      Notification.belongsTo(models.Raspored, {
        foreignKey: 'rasporedId',
        as: 'raspored'
      });
      Notification.belongsTo(models.Message, {
        foreignKey: 'messageId',
        as: 'relatedMessage'
      });
    }
  }

  Notification.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rasporedId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'Notification'
  });

  return Notification;
};
