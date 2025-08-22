const { sequelize, User } = require('./models'); // Adjust the path as necessary

const createUser = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const newUser = await User.create({
      korisnickoIme: 'Leon Šilipetar',
      password: '$2a$12$.ixOPC5Srfo/h6iIzuy7seP1DPJ6hGnoPjU8EwkPKSLtKeEyEYVwe', // Use a hashed password
      email: 'leon.silipetar@gmail.com',
      ime: 'Leon',
      prezime: 'Šilipetar',
      isAdmin: true,
      isMentor: false,
      isStudent: true,
      oib: '83755350045',
      brojMobitela: '0994081856',
      datumRodjenja: null, // Set to null or a valid date
      adresa: { ulica: null, kucniBroj: null, mjesto: null },
      pohadjaTeoriju: false,
      napomene: [],
      maloljetniClan: false,
      schoolId: 1, // Set to a valid school ID
      programId: [],
    });

    console.log('New user created:', newUser.toJSON());
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
};

createUser();