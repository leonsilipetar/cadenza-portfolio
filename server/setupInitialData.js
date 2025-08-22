const { sequelize, School, User } = require('./models');
const bcrypt = require('bcrypt');

const setupInitialData = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Clean existing data with CASCADE
    await sequelize.query('DROP TABLE IF EXISTS "Notification" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "User" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "School" CASCADE;');
    
    // Recreate tables
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "School" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        street VARCHAR(255),
        location VARCHAR(255),
        active BOOLEAN DEFAULT true,
        "driveEnabled" BOOLEAN DEFAULT false,
        "driveSettings" JSONB DEFAULT '{}',
        "driveRootFolderId" VARCHAR(255),
        "driveCredentials" JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deletedAt" TIMESTAMP WITH TIME ZONE
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        "korisnickoIme" VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        ime VARCHAR(255),
        prezime VARCHAR(255),
        "isAdmin" BOOLEAN DEFAULT false,
        "isMentor" BOOLEAN DEFAULT false,
        "isStudent" BOOLEAN DEFAULT false,
        oib VARCHAR(255),
        "brojMobitela" VARCHAR(255),
        adresa JSONB,
        roditelj1 JSONB,
        roditelj2 JSONB,
        "pohadjaTeoriju" BOOLEAN DEFAULT false,
        napomene JSONB DEFAULT '[]',
        "maloljetniClan" BOOLEAN DEFAULT false,
        "schoolId" INTEGER REFERENCES "School"(id),
        "fcmToken" VARCHAR(255),
        racuni JSONB DEFAULT '[]',
        "programType" VARCHAR(255),
        "reminderPreferences" JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deletedAt" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create schools
    const schoolVK = await School.create({
      name: 'Music Art Incubator Vinkovci',
      street: 'Duga ulica',
      location: 'Vinkovci',
      active: true,
      driveEnabled: false,
      driveSettings: {},
      driveRootFolderId: null,
      driveCredentials: null
    });

    const schoolVLP = await School.create({
      name: 'Music Art Incubator Valpovo',
      street: 'Glavna ulica',
      location: 'Valpovo',
      active: true,
      driveEnabled: false,
      driveSettings: {},
      driveRootFolderId: null,
      driveCredentials: null
    });

    // Create mentor
    const mentor = await User.create({
      korisnickoIme: 'mentor.test',
      email: 'mentor.test@test.com',
      password: await bcrypt.hash('test123', 12),
      ime: 'Mentor',
      prezime: 'Test',
      oib: '11111111111',
      brojMobitela: '0991234567',
      isAdmin: false,
      isMentor: true,
      isStudent: false,
      schoolId: schoolVK.id,
      fcmToken: null,
      adresa: { ulica: 'Test ulica', kucniBroj: '1', mjesto: 'Vinkovci' },
      roditelj1: { ime: null, prezime: null, brojMobitela: null },
      roditelj2: { ime: null, prezime: null, brojMobitela: null },
      pohadjaTeoriju: false,
      napomene: [],
      maloljetniClan: false,
      racuni: [],
      programType: null,
      reminderPreferences: {
        reminderTime: '14:00',
        classReminders: false,
        practiceReminders: false
      }
    });

    console.log('Initial data created successfully');
    console.log('Created Schools:', {
      VK: { id: schoolVK.id, name: schoolVK.name },
      VLP: { id: schoolVLP.id, name: schoolVLP.name }
    });
    console.log('Created Mentor:', {
      id: mentor.id,
      email: mentor.email
    });

  } catch (error) {
    console.error('Error creating initial data:', error);
  } finally {
    await sequelize.close();
  }
};

setupInitialData(); 