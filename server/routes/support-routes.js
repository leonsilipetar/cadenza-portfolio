const express = require('express');
const router = express.Router();
const { sendSupportEmail } = require('../controllers/support-controller');
const { verifyToken } = require('../controllers/user-controller');

// Route for sending support emails
router.post('/', verifyToken, sendSupportEmail);

module.exports = router; 