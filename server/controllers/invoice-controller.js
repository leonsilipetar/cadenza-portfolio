const { Invoice, User, Mentor, Program, School, InvoiceSettings } = require('../models'); // Import Sequelize models
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { Op } = require('sequelize');
const { createInvoiceNotification } = require('./notification-controller');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { splitPdfIntoPages, extractOibFromPdf } = require('../utils/pdfUtils');

// Add a new invoice and link it to students
const addInvoice = async (req, res) => {
  try {
    const { studentIds, ...invoiceData } = req.body;

    // Create and save the invoice
    const newInvoice = await Invoice.create({ ...invoiceData, studentIds });

    // Update student documents with the new invoice ID
    await User.update(
      { racuni: sequelize.fn('array_append', sequelize.col('racuni'), newInvoice.id) },
      { where: { id: { [sequelize.Op.in]: studentIds } } }
    );

    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).send('Error adding invoice');
  }
};

// Get invoices for a specific user
const getUserInvoices = async (req, res) => {
  const { userId } = req.params;
  try {
    const invoices = await Invoice.findAll({
      where: { studentId: userId },
      include: [
        { model: Program, attributes: ['naziv'] },
        { model: School, attributes: ['naziv'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

// Generate an invoice for a student, mentor, and program
const generateInvoice = async (req, res) => {
  try {
    const { studentId, programId, programType } = req.body;

    // Fetch program with types
    const program = await Program.findByPk(programId);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Find the selected program type and its price
    const selectedType = program.tipovi.find(t => t.tip === programType);
    if (!selectedType) {
      return res.status(400).json({ error: 'Invalid program type' });
    }


    // Create invoice with the correct price
    const invoice = await Invoice.create({
      studentId,
      programId,
      programType,
      amount: selectedType.cijena,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      // ... other invoice fields
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Error generating invoice' });
  }
};

// Download the invoice PDF
const downloadInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Assuming the PDF data is stored in the 'pdfData' column as a BLOB
    const pdfData = invoice.pdfData;
    if (!pdfData) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
    res.send(pdfData);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Error downloading invoice' });
  }
};

// Upload a PDF invoice
const uploadPdfInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Request body:', req.body); // Log the request body
    const { studentId, month, year } = req.body;

    // Get the student to get their schoolId
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Creating invoice with data:', { // Log the data we're using to create invoice
      studentId,
      month,
      year,
      schoolId: student.schoolId,
      mentorId: req.user.id,
      fileInfo: {
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        size: req.file.size
      }
    });

    // Create invoice record
    const invoice = await Invoice.create({
      studentId: parseInt(studentId),
      month: parseInt(month),
      year: parseInt(year),
      schoolId: student.schoolId,
      mentorId: req.user.id,
      pdfData: req.file.buffer,
      pdfContentType: req.file.mimetype,
      pdfOriginalName: req.file.originalname,
      active: true,
      status: 'pending'
    });

    // Fetch the created invoice with associations
    const populatedInvoice = await Invoice.findByPk(invoice.id, {
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

    // Create notification for the student
    await createInvoiceNotification(populatedInvoice, req.user, student);

    res.status(201).json(populatedInvoice);
  } catch (error) {
    console.error('Detailed error:', error); // Log the full error
    res.status(500).json({
      message: 'Error uploading invoice',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update this function
const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 50, schoolId } = req.query;

    // Add schoolId to the where clause
    const where = schoolId ? { schoolId: parseInt(schoolId) } : {};

    const offset = (page - 1) * limit;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
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
          attributes: ['id', 'naziv']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      invoices,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// Generate invoices in bulk for all active students
const generateBulkInvoices = async (req, res) => {
  try {
    // Check if this is a PDF upload or bulk generation
    if (req.file) {
      // PDF upload method
    const uploadedFile = req.file;

    // Get all active students for OIB matching
    const activeStudents = await User.findAll({
      where: {
        isStudent: true,
        deletedAt: null,
        schoolId: req.user.schoolId
      },
      attributes: ['id', 'ime', 'prezime', 'schoolId', 'oib', 'email']
    });

    const results = [];
    const currentDate = new Date();
    const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

    // Split PDF into pages
    const pdfPages = await splitPdfIntoPages(uploadedFile.buffer);

    for (const page of pdfPages) {
      try {
        // Extract OIB from the PDF page
        const extractedOib = await extractOibFromPdf(page);

        if (!extractedOib) {
          results.push({
            status: 'error',
            message: 'Could not extract OIB from PDF page'
          });
          continue;
        }

        // Find matching student
        const student = activeStudents.find(s => s.oib === extractedOib);
        if (!student) {
          results.push({
            oib: extractedOib,
            status: 'error',
            message: 'No matching student found for OIB'
          });
          continue;
        }

        // Generate invoice number
        const lastInvoice = await Invoice.findOne({
          where: {
            invoiceNumber: {
              [Op.like]: `${year}${month}%`
            }
          },
          order: [['invoiceNumber', 'DESC']]
        });

        let sequence = '001';
        if (lastInvoice) {
          const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-3));
          sequence = String(lastSequence + 1).padStart(3, '0');
        }

        const invoiceNumber = `${year}${month}${sequence}`;

        // Format PDF data for storage
        const pdfData = {
          data: {
            type: 'Buffer',
            data: Array.from(page)
          },
          contentType: uploadedFile.mimetype,
          originalName: `Invoice-${invoiceNumber}.pdf`
        };

        // Create invoice with PDF data
        const invoice = await Invoice.create({
          studentId: student.id,
          schoolId: student.schoolId,
          mentorId: req.user.id,
            month,
            year,
          invoiceNumber,
          pdfData: JSON.stringify(pdfData),
          pdfContentType: uploadedFile.mimetype,
          pdfOriginalName: `Invoice-${invoiceNumber}.pdf`,
          status: 'pending',
          active: true
        });

          results.push({
            status: 'success',
            oib: extractedOib,
            invoiceId: invoice.id
          });
        } catch (error) {
          console.error('Error processing page:', error);
          results.push({
            status: 'error',
            message: error.message
          });
        }
      }

      return res.json({ results });
    } else {
      // Bulk generation method
      const { type } = req.body;

      if (!type) {
        return res.status(400).json({
          error: 'Missing required field: type'
        });
      }

      // Get current date for invoice
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthStr = String(month).padStart(2, '0');

      // Get school settings and program
      const invoiceSettings = await InvoiceSettings.findOne({
        where: { schoolId: req.user.schoolId }
      });

      if (!invoiceSettings) {
        return res.status(400).json({
          error: 'No invoice settings found for school'
        });
      }

      // Get all active students for the school
      const activeStudents = await User.findAll({
        where: {
          isStudent: true,
          deletedAt: null,
          schoolId: req.user.schoolId
        },
        include: [{
          model: Program,
          as: 'programs',
          through: { attributes: [] }
        }],
        attributes: ['id', 'ime', 'prezime', 'schoolId', 'oib', 'email', 'programType']
      });

      const results = [];

      for (const student of activeStudents) {
        try {
          if (!student.programs || student.programs.length === 0) {
            results.push({
              status: 'error',
              studentId: student.id,
              studentName: `${student.ime} ${student.prezime}`,
              message: 'Student nema dodijeljen program'
            });
            continue;
          }

          // Calculate total amount from all programs based on program type
          let totalAmount = 0;
          const programDetails = [];
          const invalidPrograms = [];

          for (const program of student.programs) {
            // Get the program type for this specific program
            const programTypeForThisProgram = student.programType?.[program.id];
            
            // Find the price for this program type
            const programTypeData = program.tipovi.find(t => t.tip === programTypeForThisProgram);
            
            if (!programTypeData || !programTypeData.cijena || programTypeData.cijena <= 0) {
              invalidPrograms.push(`${program.naziv} (cijena nije definirana za tip ${programTypeForThisProgram || 'none'})`);
              continue;
            }

            totalAmount += programTypeData.cijena;
            programDetails.push({
              naziv: program.naziv,
              tip: programTypeForThisProgram,
              cijena: programTypeData.cijena
            });
          }

          if (invalidPrograms.length > 0) {
            results.push({
              status: 'error',
              studentId: student.id,
              studentName: `${student.ime} ${student.prezime}`,
              message: `Neispravna konfiguracija programa: ${invalidPrograms.join(', ')}`
            });
            continue;
          }

          if (totalAmount <= 0) {
            results.push({
              status: 'error',
              studentId: student.id,
              studentName: `${student.ime} ${student.prezime}`,
              message: 'Ukupni iznos je 0 ili negativan'
            });
            continue;
          }

          // Generate invoice number
          const lastInvoice = await Invoice.findOne({
            where: {
              invoiceNumber: {
                [Op.like]: `${year}${monthStr}%`
              }
            },
            order: [['invoiceNumber', 'DESC']]
          });

          let sequence = '001';
          if (lastInvoice) {
            const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-3));
            sequence = String(lastSequence + 1).padStart(3, '0');
          }

          const invoiceNumber = `${year}${monthStr}${sequence}`;

          // Create invoice with all programs
          const invoice = await Invoice.create({
            studentId: student.id,
            schoolId: student.schoolId,
            mentorId: req.user.id,
            programId: student.programs[0].id, // Use first program ID for compatibility
            additionalProgramIds: student.programs.slice(1).map(p => p.id), // Store additional program IDs if needed
            month,
            year,
            amount: totalAmount,
            type,
            invoiceNumber,
            status: 'pending',
            active: true
          });

          // Generate PDF using the template with all programs
          const pdfBuffer = await generateInvoicePDF(
            {
              ...invoice.dataValues,
              type: type // Ensure we pass the correct document type
            },
            invoiceSettings,
            student,
            programDetails
          );

          // Update invoice with PDF data
          await invoice.update({
            pdfData: JSON.stringify({
              data: {
                type: 'Buffer',
                data: Array.from(pdfBuffer)
              },
              contentType: 'application/pdf',
              originalName: `${type === 'članarina' ? 'Clanarina' : 'Racun'}-${invoiceNumber}.pdf`
            }),
            pdfContentType: 'application/pdf',
            pdfOriginalName: `${type === 'članarina' ? 'Clanarina' : 'Racun'}-${invoiceNumber}.pdf`
          });

          results.push({
            status: 'success',
            studentId: student.id,
            studentName: `${student.ime} ${student.prezime}`,
            invoiceId: invoice.id,
            amount: totalAmount,
            programs: programDetails
          });
        } catch (error) {
          console.error('Error generating invoice for student:', error);
          results.push({
            status: 'error',
            studentId: student.id,
            studentName: student.ime && student.prezime ? `${student.ime} ${student.prezime}` : 'Nepoznat student',
            message: error.message
          });
        }
      }

      // Add summary to results
      const summary = {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        error: results.filter(r => r.status === 'error').length,
        totalAmount: results.reduce((sum, r) => r.status === 'success' ? sum + r.amount : sum, 0)
      };

      return res.json({ results, summary });
    }
  } catch (error) {
    console.error('Error in bulk invoice generation:', error);
    res.status(500).json({
      error: 'Error processing bulk invoice request',
      details: error.message
    });
  }
};

// Generate invoices for selected students
const generateSelectedInvoices = async (req, res) => {
  try {
    const { type, documentType, studentIds } = req.body;

    if (!type || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: type and studentIds array'
      });
    }

    // Get current date for invoice
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');

    // Get school settings
    const invoiceSettings = await InvoiceSettings.findOne({
      where: { schoolId: req.user.schoolId }
    });

    if (!invoiceSettings) {
      return res.status(400).json({
        error: 'No invoice settings found for school'
      });
    }

    // Get selected students
    const selectedStudents = await User.findAll({
      where: {
        id: { [Op.in]: studentIds },
        isStudent: true,
        deletedAt: null,
        schoolId: req.user.schoolId
      },
      include: [{
        model: Program,
        as: 'programs',
        through: { attributes: [] }
      }],
      attributes: ['id', 'ime', 'prezime', 'schoolId', 'oib', 'email', 'programType']
    });

    const results = [];

    for (const student of selectedStudents) {
      try {
        if (!student.programs || student.programs.length === 0) {
          results.push({
            status: 'error',
            studentId: student.id,
            studentName: `${student.ime} ${student.prezime}`,
            message: 'Student nema dodijeljen program'
          });
          continue;
        }

        // Calculate total amount from all programs based on program type
        let totalAmount = 0;
        const programDetails = [];
        const invalidPrograms = [];

        for (const program of student.programs) {
          // Get the program type for this specific program
          const programTypeForThisProgram = student.programType?.[program.id];
          
          // Find the price for this program type
          const programTypeData = program.tipovi.find(t => t.tip === programTypeForThisProgram);
          
          if (!programTypeData || !programTypeData.cijena || programTypeData.cijena <= 0) {
            invalidPrograms.push(`${program.naziv} (cijena nije definirana za tip ${programTypeForThisProgram || 'none'})`);
            continue;
          }

          totalAmount += programTypeData.cijena;
          programDetails.push({
            naziv: program.naziv,
            tip: programTypeForThisProgram,
            cijena: programTypeData.cijena
          });
        }

        if (invalidPrograms.length > 0) {
          results.push({
            status: 'error',
            studentId: student.id,
            studentName: `${student.ime} ${student.prezime}`,
            message: `Neispravna konfiguracija programa: ${invalidPrograms.join(', ')}`
          });
          continue;
        }

        if (totalAmount <= 0) {
          results.push({
            status: 'error',
            studentId: student.id,
            studentName: `${student.ime} ${student.prezime}`,
            message: 'Ukupni iznos je 0 ili negativan'
          });
          continue;
        }

        // Generate invoice number
        const lastInvoice = await Invoice.findOne({
          where: {
            invoiceNumber: {
              [Op.like]: `${year}${monthStr}%`
            }
          },
          order: [['invoiceNumber', 'DESC']]
        });

        let sequence = '001';
        if (lastInvoice) {
          const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-3));
          sequence = String(lastSequence + 1).padStart(3, '0');
        }

        const invoiceNumber = `${year}${monthStr}${sequence}`;

        // Create invoice with all programs
        const invoice = await Invoice.create({
          studentId: student.id,
          schoolId: student.schoolId,
          mentorId: req.user.id,
          programId: student.programs[0].id, // Use first program ID for compatibility
          additionalProgramIds: student.programs.slice(1).map(p => p.id), // Store additional program IDs if needed
          month,
          year,
          amount: totalAmount,
          type: documentType || type, // Use documentType if provided, fall back to type
          invoiceNumber,
          status: 'pending',
          active: true
        });

        // Generate PDF using the template with all programs
        const pdfBuffer = await generateInvoicePDF(
          {
            ...invoice.dataValues,
            type: documentType || type // Ensure we pass the correct document type
          },
          invoiceSettings,
          student,
          programDetails
        );

        // Update invoice with PDF data
        await invoice.update({
          pdfData: JSON.stringify({
            data: {
              type: 'Buffer',
              data: Array.from(pdfBuffer)
            },
            contentType: 'application/pdf',
            originalName: `${(documentType || type) === 'članarina' ? 'Clanarina' : 'Racun'}-${invoiceNumber}.pdf`
          }),
          pdfContentType: 'application/pdf',
          pdfOriginalName: `${(documentType || type) === 'članarina' ? 'Clanarina' : 'Racun'}-${invoiceNumber}.pdf`
        });

        results.push({
          status: 'success',
          studentId: student.id,
          studentName: `${student.ime} ${student.prezime}`,
          invoiceId: invoice.id,
          amount: totalAmount,
          programs: programDetails,
          student: student // Include student data for frontend display
        });
      } catch (error) {
        console.error('Error generating invoice for student:', error);
        results.push({
          status: 'error',
          studentId: student.id,
          studentName: student.ime && student.prezime ? `${student.ime} ${student.prezime}` : 'Nepoznat student',
          message: error.message
        });
      }
    }

    // Add summary to results
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      error: results.filter(r => r.status === 'error').length,
      totalAmount: results.reduce((sum, r) => r.status === 'success' ? sum + r.amount : sum, 0)
    };

    return res.json({ results, summary });
  } catch (error) {
    console.error('Error in selected invoice generation:', error);
    res.status(500).json({
      error: 'Error processing selected invoice request',
      details: error.message
    });
  }
};

module.exports = {
  generateInvoice,
  getUserInvoices,
  downloadInvoice,
  addInvoice,
  uploadPdfInvoice,
  getInvoices,
  generateBulkInvoices,
  generateSelectedInvoices
};
