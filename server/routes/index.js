const express = require('express');
const router = express.Router();

// Import route modules
const errorRoutes = require('./error-routes');
const websiteRoutes = require('./website-routes');
const passwordResetRoutes = require('./passwordReset');
const userController = require('../controllers/user-controller');
const mentorController = require('../controllers/mentor-controller');

// Use route modules
router.use('/error', errorRoutes);
router.use('/website', websiteRoutes);
router.use('/reset-password', passwordResetRoutes);

// Add email check routes
router.get('/users/check-email/:email', userController.checkEmail);
router.get('/mentors/check-email/:email', mentorController.checkEmail);

module.exports = router; 