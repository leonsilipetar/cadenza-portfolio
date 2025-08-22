'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Mentor table
    await queryInterface.createTable('Mentor', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      korisnickoIme: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      ime: { type: Sequelize.STRING, allowNull: true },
      prezime: { type: Sequelize.STRING, allowNull: true },
      oib: { type: Sequelize.STRING, unique: true, allowNull: true },
      brojMobitela: { type: Sequelize.STRING, allowNull: true },
      datumRodjenja: { type: Sequelize.DATE, allowNull: true },
      adresa: { type: Sequelize.JSONB, allowNull: true },
      isAdmin: { type: Sequelize.BOOLEAN, defaultValue: false },
      isMentor: { type: Sequelize.BOOLEAN, defaultValue: true },
      isStudent: { type: Sequelize.BOOLEAN, defaultValue: false },
      napomene: { type: Sequelize.ARRAY(Sequelize.TEXT), defaultValue: [] },
      fcmToken: { type: Sequelize.STRING, allowNull: true },
      studentId: { type: Sequelize.ARRAY(Sequelize.INTEGER), defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Set Mentor sequence
    await queryInterface.sequelize.query(`ALTER SEQUENCE "Mentor_id_seq" RESTART WITH 1000000;`);

    // 2. Create User table
    await queryInterface.createTable('User', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      korisnickoIme: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      ime: { type: Sequelize.STRING, allowNull: true },
      prezime: { type: Sequelize.STRING, allowNull: true },
      isAdmin: { type: Sequelize.BOOLEAN, defaultValue: false },
      isMentor: { type: Sequelize.BOOLEAN, defaultValue: false },
      isStudent: { type: Sequelize.BOOLEAN, defaultValue: true },
      oib: { type: Sequelize.STRING, unique: true, allowNull: true },
      brojMobitela: { type: Sequelize.STRING, allowNull: true },
      datumRodjenja: { type: Sequelize.DATE, allowNull: true },
      adresa: { type: Sequelize.JSONB, allowNull: true },
      roditelj1: { type: Sequelize.JSONB, allowNull: true },
      roditelj2: { type: Sequelize.JSONB, allowNull: true },
      pohadjaTeoriju: { type: Sequelize.BOOLEAN, defaultValue: false },
      napomene: { type: Sequelize.ARRAY(Sequelize.TEXT), defaultValue: [] },
      maloljetniClan: { type: Sequelize.BOOLEAN, defaultValue: false },
      fcmToken: { type: Sequelize.STRING, allowNull: true },
      racuni: { type: Sequelize.ARRAY(Sequelize.INTEGER), defaultValue: [] },
      programType: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Create the sequence manually if needed
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_id_seq') THEN
          CREATE SEQUENCE user_id_seq
          START WITH 2000000
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

          ALTER TABLE "User" ALTER COLUMN id SET DEFAULT nextval('user_id_seq');
          ALTER SEQUENCE user_id_seq OWNED BY "User".id;
        END IF;
      END $$;
    `);

    // Set the sequence to start after existing records
    await queryInterface.sequelize.query(`
      SELECT setval('user_id_seq', COALESCE((SELECT MAX(id) FROM "User"), 2000000), true);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('User');
    await queryInterface.dropTable('Mentor');
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS user_id_seq');
  }
};