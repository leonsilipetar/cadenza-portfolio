const express = require('express');
const router = express.Router();
const { User, Mentor } = require('../models');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { updatePassword } = require('../controllers/user-controller');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secureOptions: 'TLSv1_2',
});

// Store verification codes (in production, use Redis or similar)
const verificationCodes = new Map();

// Request password reset
router.post('/request', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists in either users or mentors table
    const user = await User.findOne({ where: { email } });
    const mentor = await Mentor.findOne({ where: { email } });

    if (!user && !mentor) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    verificationCodes.set(email, {
      code: verificationCode,
      timestamp: Date.now(),
      userId: user ? user.id : mentor.id,
      userType: user ? 'student' : 'mentor'
    });

    // Send email with verification code
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Cadenza - Resetiranje lozinke',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
          <div style="text-align: center;">
            <img src="https://cadenza.com.hr/logo512.png" alt="MAI - Cadenza Logo" style="max-width: 150px;" />
            <h1 style="color: rgb(252, 163, 17); font-size: 24px;">Resetiranje lozinke</h1>
          </div>
          <p>Poštovani,</p>
          <p>Zatražili ste resetiranje lozinke za vaš Cadenza račun.</p>
          <div style="border: 1px solid #ddd; padding: 10px; background-color: #fff8e6; margin-bottom: 20px;">
            <p><strong>Vaš verifikacijski kod je:</strong> ${verificationCode}</p>
            <p>Kod vrijedi 15 minuta.</p>
          </div>
          <p>Ako niste zatražili resetiranje lozinke, zanemarite ovaj email.</p>
          <p>S poštovanjem,<br />MAI - Cadenza</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify code and reset password
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  try {
    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Check if code is expired (15 minutes)
    if (Date.now() - storedData.timestamp > 15 * 60 * 1000) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    // Use the existing updatePassword function
    const result = await updatePassword({
      body: {
        userId: storedData.userId,
        userType: storedData.userType,
        email: email
      }
    }, res);

    // Clean up the verification code
    verificationCodes.delete(email);

    return result;
  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 