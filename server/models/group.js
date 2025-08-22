// models/group.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.belongsTo(models.School, {
        foreignKey: 'schoolId',
        as: 'school'
      });
      
      Group.belongsToMany(models.User, {
        through: 'GroupUserMembers',
        foreignKey: 'groupId',
        otherKey: 'userId',
        as: 'members'
      });

      Group.belongsToMany(models.Mentor, {
        through: 'GroupMentorMembers',
        foreignKey: 'groupId',
        otherKey: 'mentorId',
        as: 'mentorMembers'
      });

      Group.belongsTo(models.Mentor, {
        foreignKey: 'adminId',
        as: 'admin'
      });

      Group.hasMany(models.Message, {
        foreignKey: 'groupId',
        as: 'messages'
      });
    }
  }

  Group.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'School',
        key: 'id'
      }
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Mentor',
        key: 'id'
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessageText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastMessageSender: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unreadCountUser: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    unreadCountMentor: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Group',
    tableName: 'Group',
    timestamps: true
  });

  return Group;
};
