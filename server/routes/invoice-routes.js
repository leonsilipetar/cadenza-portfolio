const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Invoice, User, Program, School } = require('../models');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
}).fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'file', maxCount: 1 } // Add this to handle both field names
]);
const invoiceController = require('../controllers/invoice-controller');

// Add this route BEFORE any routes with :id parameter
router.get('/my', verifyToken, async (req, res) => {
  try {
    // Verify that the user is a student
    if (!req.user.isStudent) {
      return res.status(403).json({
        message: 'Only students can access their invoices through this endpoint'
      });
    }

    const invoices = await Invoice.findAll({
      where: {
        studentId: req.user.id,
        active: true
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'ime', 'prezime']
        },
        {
          model: Program,
          attributes: ['id', 'naziv']
        },
        {
          model: School,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching student invoices:', error);
    res.status(500).json({
      error: 'Error fetching invoices',
      details: error.message
    });
  }
});

// Get student's invoices
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    const invoices = await Invoice.findAll({
      where: { studentId: studentId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'ime', 'prezime']
        },
        {
          model: Program,
          attributes: ['id', 'naziv']
        },
        {
          model: School,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching student invoices:', error);
    res.status(500).json({ 
      message: 'Error fetching invoices',
      error: error.message 
    });
  }
});

// Upload PDF invoice
router.post('/upload-pdf', verifyToken, upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { studentId, month, year } = req.body;
    
    // Create invoice record
    const invoice = await Invoice.create({
      studentId,
      month,
      year,
      pdfData: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedBy: req.user.id
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error uploading invoice:', error);
    res.status(500).json({ 
      message: 'Error uploading invoice',
      error: error.message 
    });
  }
});

// Create new invoice
router.post('/invoices', verifyToken, async (req, res) => {
  try {
    console.log('Received invoice request');
    const {
      studentId,
      programId,
      schoolId,
      month,
      year,
      amount,
      invoiceNumber,
      dueDate,
      pdfData,
      pdfContentType,
      pdfOriginalName,
      mentorId
    } = req.body;

    console.log('Creating invoice with data:', {
      studentId,
      programId,
      schoolId,
      month,
      year,
      amount,
      invoiceNumber,
      hasPdfData: !!pdfData
    });

    const invoice = await Invoice.create({
      studentId,
      programId,
      schoolId,
      month,
      year,
      amount,
      invoiceNumber,
      dueDate,
      pdfData,
      pdfContentType,
      pdfOriginalName,
      mentorId,
      status: 'pending',
      active: true
    });

    // Fetch related data
    const fullInvoice = await Invoice.findOne({
      where: { id: invoice.id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'ime', 'prezime']
        },
        {
          model: Program,
          attributes: ['id', 'naziv']
        },
        {
          model: School,
          attributes: ['id', 'name']
        }
      ]
    });

    console.log('Invoice created successfully');
    res.status(201).json(fullInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Error creating invoice', details: error.message });
  }
});

router.post('/invoices/generate', upload, async (req, res) => {
  try {
    const { studentId, schoolId, mentorId, amount, month, year, isUpload } = req.body;
    
    if (isUpload === 'true') {
      // Get the file from either field name
      const uploadedFile = req.files?.pdfFile?.[0] || req.files?.file?.[0];
      
      if (!uploadedFile) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Create invoice record with uploaded PDF
      const invoice = await Invoice.create({
        studentId,
        schoolId,
        mentorId,
        amount: amount || 0,
        month,
        year,
        pdfData: uploadedFile.buffer,
        pdfContentType: uploadedFile.mimetype,
        pdfOriginalName: uploadedFile.originalname,
        status: 'pending'
      });

      res.json(invoice);
    } else {
      // Handle generated PDF (existing logic)
      // ... your current PDF generation code ...
    }
  } catch (error) {
    console.error('Error handling invoice:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

// Add bulk generation route with file upload support
router.post('/generate-bulk', verifyToken, upload, async (req, res) => {
  try {
    // Verify user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Only administrators can perform bulk operations'
      });
    }

    // Call the controller with the uploaded file
    await invoiceController.generateBulkInvoices(req, res);
  } catch (error) {
    console.error('Error in bulk invoice route:', error);
    res.status(500).json({
      error: 'Error processing bulk invoice request',
      details: error.message
    });
  }
});

router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router; 