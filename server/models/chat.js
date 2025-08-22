// models/Chat.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    participant1Id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    participant1Type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    participant2Id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    participant2Type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessageText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unreadCount1: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    unreadCount2: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'Chat'
  });

  Chat.associate = (models) => {
    // Define associations without constraints
    Chat.belongsTo(models.User, {
      foreignKey: 'participant1Id',
      constraints: false,
      as: 'participant1User'
    });
    Chat.belongsTo(models.Mentor, {
      foreignKey: 'participant1Id',
      constraints: false,
      as: 'participant1Mentor'
    });
    Chat.belongsTo(models.User, {
      foreignKey: 'participant2Id',
      constraints: false,
      as: 'participant2User'
    });
    Chat.belongsTo(models.Mentor, {
      foreignKey: 'participant2Id',
      constraints: false,
      as: 'participant2Mentor'
    });
    Chat.hasMany(models.Message, {
      foreignKey: 'chatId',
      as: 'messages'
    });
  };

  return Chat;
};
