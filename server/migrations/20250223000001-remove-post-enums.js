'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First change the columns to simple strings
    await queryInterface.sequelize.query(`
      ALTER TABLE "Post" 
      ALTER COLUMN "type" TYPE VARCHAR(255),
      ALTER COLUMN "visibility" TYPE VARCHAR(255);
    `);

    // Then drop the enum types
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Post_type" CASCADE;
      DROP TYPE IF EXISTS "enum_Post_visibility" CASCADE;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Create the enum types
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Post_type" AS ENUM ('news', 'announcement', 'event');
      CREATE TYPE "enum_Post_visibility" AS ENUM ('public', 'mentor', 'admin');
    `);

    // Convert columns back to enums
    await queryInterface.sequelize.query(`
      ALTER TABLE "Post" 
      ALTER COLUMN "type" TYPE "enum_Post_type" USING type::enum_Post_type,
      ALTER COLUMN "visibility" TYPE "enum_Post_visibility" USING visibility::enum_Post_visibility;
    `);
  }
}; 