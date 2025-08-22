const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/user-controller');
const {
  getInvoiceSettings,
  updateInvoiceSettings,
  validateInvoiceSettings
} = require('../controllers/invoiceSettingsController');

// Add logging to debug route matching
router.use('/invoice-settings', (req, res, next) => {
  console.log('Invoice settings route hit:', req.method, req.path);
  next();
});

// Get invoice settings
router.get('/invoice-settings', verifyToken, getInvoiceSettings);

router.post('/invoice-settings', verifyToken, async (req, res) => {
  try {
    console.log('Received data:', req.body); // Add this to debug
    await updateInvoiceSettings(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({
      message: 'Error in route handler',
      error: error.message
    });
  }
});

// Update existing invoice settings
router.put('/invoice-settings/:id', verifyToken, async (req, res) => {
  try {
    console.log('Received data:', req.body); // Add this to debug
    await updateInvoiceSettings(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({
      message: 'Error in route handler',
      error: error.message
    });
  }
});

module.exports = router;