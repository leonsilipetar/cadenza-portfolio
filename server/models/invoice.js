'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      // Invoice belongs to a User
      Invoice.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student'
      });

      // Invoice belongs to a School
      Invoice.belongsTo(models.School, {
        foreignKey: 'schoolId'
      });

      // Invoice belongs to a Program
      Invoice.belongsTo(models.Program, {
        foreignKey: 'programId'
      });
    }
  }

  Invoice.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: DataTypes.DECIMAL(10, 2),
    invoiceNumber: DataTypes.STRING,
    dueDate: DataTypes.DATE,
    pdfData: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue('pdfData');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('pdfData', value ? JSON.stringify(value) : null);
      }
    },
    pdfContentType: DataTypes.STRING,
    pdfOriginalName: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
      defaultValue: 'pending'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'Invoice',
    timestamps: true
  });

  return Invoice;
};
