const bcrypt = require('bcrypt');

const generateHashedPassword = async (plainPassword) => {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    
    // Log both the plain and hashed passwords
    console.log('Plain Password:', plainPassword);
    console.log('Hashed Password:', hashedPassword);
  } catch (error) {
    console.error('Error hashing password:', error);
  }
};

// Replace 'yourPlainTextPassword' with the desired password
const plainPassword = 'be503XRF'; // Set your desired password here
generateHashedPassword(plainPassword); 