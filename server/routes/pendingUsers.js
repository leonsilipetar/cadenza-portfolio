const express = require('express');
const router = express.Router();
const { PendingUser, Program, User, School } = require('../models');
const { verifyToken } = require('../controllers/user-controller');
const { Op } = require('sequelize');
const { pendingUserLimiter } = require('../middleware/rateLimiter');
const fetch = require('node-fetch'); // Using node-fetch instead of axios

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Verify reCAPTCHA token
const verifyRecaptcha = async (token) => {
  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    );
    const data = await response.json();
    return data.success && data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

// Check if email exists in Users or PendingUsers tables
const checkEmailExists = async (email) => {
  // Check Users table
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return {
      exists: true,
      message: 'Ova email adresa je već registrirana u sustavu.'
    };
  }

  // Check PendingUsers table
  const pendingUser = await PendingUser.findOne({ 
    where: { 
      email,
      status: 'pending' // Only check pending requests
    } 
  });
  if (pendingUser) {
    return {
      exists: true,
      message: 'Već postoji aktivan zahtjev za registraciju s ovom email adresom.'
    };
  }

  return { exists: false };
};

// Add new endpoint for checking email
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email je obavezan.' });
    }

    const result = await checkEmailExists(email);
    res.json(result);
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ message: 'Greška pri provjeri email adrese.' });
  }
});

// Public route for submitting registration request
router.post('/signup/pending', pendingUserLimiter, async (req, res) => {
  try {
    const {
      ime,
      prezime,
      email,
      oib,
      datumRodjenja,
      adresa,
      roditelj1,
      roditelj2,
      programId,
      pohadjaTeoriju,
      napomene,
      maloljetniClan,
      schoolId,
      recaptchaToken,
      brojMobitela,
      maiZbor,
      pohadanjeNastave
    } = req.body;

    // Check if email exists
    const emailCheck = await checkEmailExists(email);
    if (emailCheck.exists) {
      return res.status(400).json({ message: emailCheck.message });
    }

    // Verify reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ 
        message: 'reCAPTCHA verifikacija nije uspjela. Molimo pokušajte ponovno.' 
      });
    }

    // Create or update a pending user idempotently on (email) uniqueness
    const now = new Date();
    const pendingUser = await PendingUser.upsert({
      ime,
      prezime,
      email,
      oib,
      datumRodjenja,
      adresa,
      roditelj1,
      roditelj2,
      programId,
      pohadjaTeoriju,
      napomene,
      maloljetniClan,
      schoolId,
      brojMobitela,
      maiZbor,
      pohadanjeNastave,
      status: 'pending',
      updatedAt: now
    }, { returning: true });

    const created = Array.isArray(pendingUser) ? pendingUser[0] : pendingUser;

    res.status(201).json({
      message: 'Zahtjev za registraciju je uspješno poslan.',
      id: created.id
    });
  } catch (error) {
    console.error('Error creating pending user:', error);
    res.status(500).json({ message: 'Greška pri stvaranju zahtjeva za registraciju.' });
  }
});

// Admin routes for managing pending users
router.get('/admin/pending-users', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Pristup zabranjen. Potrebna admin prava.' });
    }

    const pendingUsers = await PendingUser.findAll({
      where: { 
        status: 'pending',
        schoolId: req.user.schoolId // Filter by admin's school
      },
      include: [{
        model: Program,
        as: 'program'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju zahtjeva za registraciju.' });
  }
});

router.post('/admin/pending-users/:id/approve', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Pristup zabranjen. Potrebna admin prava.' });
    }

    const pendingUser = await PendingUser.findByPk(req.params.id);

    if (!pendingUser) {
      return res.status(404).json({ message: 'Zahtjev za registraciju nije pronađen.' });
    }

    // Just update the status to approved
    await pendingUser.update({ status: 'approved' });
    res.json({ message: 'Zahtjev za registraciju je odobren.' });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Greška pri odobravanju korisnika.' });
  }
});

router.post('/admin/pending-users/:id/decline', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Pristup zabranjen. Potrebna admin prava.' });
    }

    const pendingUser = await PendingUser.findByPk(req.params.id);

    if (!pendingUser) {
      return res.status(404).json({ message: 'Zahtjev za registraciju nije pronađen.' });
    }

    await pendingUser.update({ status: 'declined' });
    res.json({ message: 'Zahtjev za registraciju je odbijen.' });
  } catch (error) {
    console.error('Error declining user:', error);
    res.status(500).json({ message: 'Greška pri odbijanju zahtjeva.' });
  }
});

// Cleanup route for removing old requests (can be called by a cron job)
router.delete('/admin/pending-users/cleanup', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Pristup zabranjen. Potrebna admin prava.' });
    }

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const result = await PendingUser.destroy({
      where: {
        createdAt: {
          [Op.lt]: twoWeeksAgo
        },
        status: 'pending'
      }
    });

    res.json({ 
      message: `Cleaned up ${result} old pending user requests`,
      count: result 
    });
  } catch (error) {
    console.error('Error cleaning up pending users:', error);
    res.status(500).json({ message: 'Greška pri čišćenju starih zahtjeva.' });
  }
});

// Public route for getting schools list (no auth required)
router.get('/schools/public', async (req, res) => {
  try {
    const schools = await School.findAll({
      attributes: ['id', 'name'],
      where: { active: true },
      order: [['name', 'ASC']]
    });
    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju škola.' });
  }
});

// Public route for getting program list by school (no auth required)
router.get('/programs/public/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    if (!schoolId) {
      return res.status(400).json({ message: 'Potrebno je odabrati školu.' });
    }

    const programs = await Program.findAll({
      where: { 
        schoolId: schoolId,
        active: true 
      },
      attributes: ['id', 'naziv', 'tipovi'],
      order: [['naziv', 'ASC']]
    });
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju programa.' });
  }
});

module.exports = router; 