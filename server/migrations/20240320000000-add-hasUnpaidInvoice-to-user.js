'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('User', 'hasUnpaidInvoice', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Update existing users based on their invoice status
    await queryInterface.sequelize.query(`
      UPDATE "User" u
      SET "hasUnpaidInvoice" = EXISTS (
        SELECT 1 
        FROM "Invoice" i 
        WHERE i."studentId" = u.id 
        AND i.status = 'pending' 
        AND i.active = true
      )
      WHERE u."isStudent" = true;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('User', 'hasUnpaidInvoice');
  }
}; 