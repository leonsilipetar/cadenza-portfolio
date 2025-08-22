'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First set all existing values to null to avoid cast errors
    await queryInterface.sequelize.query(`
      UPDATE "User" SET "programType" = NULL;
    `);

    // Then change the column type
    await queryInterface.sequelize.query(`
      ALTER TABLE "User" 
      ALTER COLUMN "programType" TYPE JSONB 
      USING CASE 
        WHEN "programType" IS NULL THEN NULL 
        ELSE "programType"::jsonb 
      END;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Convert back to STRING
    await queryInterface.sequelize.query(`
      ALTER TABLE "User" 
      ALTER COLUMN "programType" TYPE VARCHAR 
      USING "programType"::text;
    `);
  }
}; 