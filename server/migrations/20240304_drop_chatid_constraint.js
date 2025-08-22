'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the not-null constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "Message" 
      ALTER COLUMN "chatId" DROP NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the not-null constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "Message" 
      ALTER COLUMN "chatId" SET NOT NULL;
    `);
  }
}; 