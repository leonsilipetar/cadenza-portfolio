'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop existing sequences if they exist
    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS "User_id_seq" CASCADE;
      DROP SEQUENCE IF EXISTS "Mentor_id_seq" CASCADE;
    `);

    // Create new sequences
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE "User_id_seq"
      START WITH 2000000
      INCREMENT BY 1
      NO MINVALUE
      NO MAXVALUE
      CACHE 1;

      CREATE SEQUENCE "Mentor_id_seq"
      START WITH 1000000
      INCREMENT BY 1
      NO MINVALUE
      NO MAXVALUE
      CACHE 1;

      ALTER TABLE "User" ALTER COLUMN id SET DEFAULT nextval('"User_id_seq"');
      ALTER TABLE "Mentor" ALTER COLUMN id SET DEFAULT nextval('"Mentor_id_seq"');
      
      ALTER SEQUENCE "User_id_seq" OWNED BY "User".id;
      ALTER SEQUENCE "Mentor_id_seq" OWNED BY "Mentor".id;
    `);

    // Set the current values
    await queryInterface.sequelize.query(`
      SELECT setval('"User_id_seq"', COALESCE((SELECT MAX(id) FROM "User"), 2000000), true);
      SELECT setval('"Mentor_id_seq"', COALESCE((SELECT MAX(id) FROM "Mentor"), 1000000), true);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS "User_id_seq" CASCADE;
      DROP SEQUENCE IF EXISTS "Mentor_id_seq" CASCADE;
    `);
  }
}; 