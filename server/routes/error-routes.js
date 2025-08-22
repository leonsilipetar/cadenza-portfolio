const express = require('express');
const router = express.Router();
const errorController = require('../controllers/error-controller');
const { verifyToken} = require('../controllers/user-controller');

// Submit error report
router.post('/report',  verifyToken, errorController.sendErrorReport);

// Get error report statistics (admin only)
router.get('/stats', verifyToken, errorController.getErrorReportStats);

module.exports = router; 