'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Generate a random password
    const passwordLength = 8;
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPassword = Array.from(
      { length: passwordLength }, 
      () => characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Hash the password
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    // Create demo admin user
    await queryInterface.bulkInsert('Users', [{
      korisnickoIme: 'DemoAdmin',
      email: 'leonosobni@gmail.com',
      password: hashedPassword,
      ime: 'Demo',
      prezime: 'Admin',
      isMentor: true,
      isStudent: false,
      isAdmin: true,
      oib: '00000000000',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Log the random password - MAKE SURE TO SAVE THIS!
    console.log('----------------------------------------');
    console.log('DEMO ADMIN PASSWORD:', randomPassword);
    console.log('----------------------------------------');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      email: 'leonosobni@gmail.com'
    });
  }
}; 