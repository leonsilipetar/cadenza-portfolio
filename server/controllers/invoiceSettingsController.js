const { body, validationResult } = require('express-validator');
const { InvoiceSettings, User, Mentor } = require('../models');
const { Op } = require('sequelize');

// Validation rules for invoice settings
const validateInvoiceSettings = [
  body('nazivObrta').notEmpty().withMessage('Naziv obrta is required'),
  body('oib').isLength({ min: 11, max: 11 }).withMessage('OIB must be 11 digits'),
  body('iban').isLength({ min: 21, max: 34 }).withMessage('IBAN must be between 21 and 34 characters'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('postalCode').notEmpty().withMessage('Postal code is required'),
  body('brojRacuna').optional(),
  body('dodatneInformacije').optional().isString(),
];

// Get invoice settings for the school
const getInvoiceSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    let schoolId;

    if (req.user.isMentor) {
      const mentor = await Mentor.findByPk(userId);
      schoolId = mentor?.schoolId;
    } else {
      const user = await User.findByPk(userId);
      schoolId = user?.schoolId;
    }

    if (!schoolId) {
      return res.status(400).json({
        message: 'User is not associated with any school'
      });
    }

    const settings = await InvoiceSettings.findOne({
      where: { schoolId: schoolId }
    });

    res.status(200).json(settings || {});
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    res.status(500).json({ 
      message: 'Error fetching invoice settings',
      error: error.message 
    });
  }
};

// Update invoice settings
const updateInvoiceSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    let schoolId;

    // Validate required fields manually
    const requiredFields = {
      nazivObrta: 'Naziv obrta is required',
      oib: 'OIB must be 11 digits',
      iban: 'IBAN must be between 21 and 34 characters',
      address: 'Address is required',
      city: 'City is required',
      postalCode: 'Postal code is required'
    };

    const errors = [];
    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!req.body[field]) {
        errors.push({
          type: 'field',
          msg: message,
          path: field,
          location: 'body'
        });
      }
    });

    // Additional validation for OIB and IBAN
    if (req.body.oib && req.body.oib.length !== 11) {
      errors.push({
        type: 'field',
        msg: 'OIB must be 11 digits',
        path: 'oib',
        location: 'body'
      });
    }

    if (req.body.iban && (req.body.iban.length < 21 || req.body.iban.length > 34)) {
      errors.push({
        type: 'field',
        msg: 'IBAN must be between 21 and 34 characters',
        path: 'iban',
        location: 'body'
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }

    if (req.user.isMentor) {
      const mentor = await Mentor.findByPk(userId);
      schoolId = mentor?.schoolId;
    } else {
      const user = await User.findByPk(userId);
      schoolId = user?.schoolId;
    }

    if (!schoolId) {
      return res.status(400).json({
        message: 'User is not associated with any school'
      });
    }

    // Create or update settings
    const [settings, created] = await InvoiceSettings.upsert({
      ...req.body,
      schoolId,
      active: true
    }, {
      returning: true,
      where: { schoolId }
    });

    res.status(created ? 201 : 200).json({
      message: `Invoice settings ${created ? 'created' : 'updated'} successfully`,
      settings
    });
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({ 
      message: 'Error updating invoice settings',
      error: error.message 
    });
  }
};

module.exports = {
  getInvoiceSettings,
  updateInvoiceSettings,
  validateInvoiceSettings,
};
