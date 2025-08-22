const { sequelize, User, School } = require('./models');
const bcrypt = require('bcrypt');

const createTestData = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Get school IDs
    const schoolVK = await School.findOne({ where: { location: 'Vinkovci' } });
    const schoolVLP = await School.findOne({ where: { location: 'Valpovo' } });
    
    // Get mentor ID
    const mentor = await User.findOne({ where: { korisnickoIme: 'mentor.test' } });

    if (!schoolVK || !schoolVLP || !mentor) {
      console.error('Required schools or mentor not found. Please run setupInitialData.js first.');
      return;
    }

    // Create users
    const userVK = await User.create({
      korisnickoIme: 'user.test.vk',
      email: 'user.vinkovci@test.com',
      password: await bcrypt.hash('test123', 12),
      ime: 'User',
      prezime: 'Test VK',
      oib: '33333333333',
      brojMobitela: '0997654321',
      isAdmin: false,
      isMentor: false,
      isStudent: true,
      schoolId: schoolVK.id,
      fcmToken: null,
      mentorId: mentor.id,
      programId: null,
      programType: null,
      adresa: { ulica: null, kucniBroj: null, mjesto: null },
      roditelj1: { ime: null, prezime: null, brojMobitela: null },
      roditelj2: { ime: null, prezime: null, brojMobitela: null },
      pohadjaTeoriju: false,
      napomene: [],
      maloljetniClan: false,
      racuni: [],
      reminderPreferences: {
        reminderTime: '14:00',
        classReminders: false,
        practiceReminders: false
      }
    });

    const userVLP = await User.create({
      korisnickoIme: 'user.test.vlp',
      email: 'user.valpovo@test.com',
      password: await bcrypt.hash('test123', 12),
      ime: 'User',
      prezime: 'Test VLP',
      oib: '44444444444',
      brojMobitela: '0997654322',
      isAdmin: false,
      isMentor: false,
      isStudent: true,
      schoolId: schoolVLP.id,
      fcmToken: null,
      mentorId: mentor.id,
      programId: null,
      programType: null,
      adresa: { ulica: null, kucniBroj: null, mjesto: null },
      roditelj1: { ime: null, prezime: null, brojMobitela: null },
      roditelj2: { ime: null, prezime: null, brojMobitela: null },
      pohadjaTeoriju: false,
      napomene: [],
      maloljetniClan: false,
      racuni: [],
      reminderPreferences: {
        reminderTime: '14:00',
        classReminders: false,
        practiceReminders: false
      }
    });

    console.log('Test users created successfully');
    console.log('Created Users:', {
      VK: { id: userVK.id, email: userVK.email },
      VLP: { id: userVLP.id, email: userVLP.email }
    });
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await sequelize.close();
  }
};

createTestData();