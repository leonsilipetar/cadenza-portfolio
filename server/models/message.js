// models/message.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    senderType: {
      type: DataTypes.STRING,  // 'User' or 'Mentor'
      allowNull: false
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: null  // Remove any automatic foreign key constraint
    },
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'text'
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    replyToId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'Message'
  });

  Message.associate = (models) => {
    // Define associations without constraints
    Message.belongsTo(models.User, {
      foreignKey: 'senderId',
      constraints: false,
      as: 'sender'
    });
    Message.belongsTo(models.Mentor, {
      foreignKey: 'senderId',
      constraints: false,
      as: 'senderMentor'
    });
    Message.belongsTo(models.User, {
      foreignKey: 'recipientId',
      constraints: false,
      as: 'recipient'
    });
    Message.belongsTo(models.Mentor, {
      foreignKey: 'recipientId',
      constraints: false,
      as: 'recipientMentor'
    });
    Message.belongsTo(models.Group, {
      foreignKey: 'groupId',
      as: 'group'
    });
    Message.belongsTo(Message, {
      foreignKey: 'replyToId',
      as: 'replyTo'
    });
  };

  return Message;
};