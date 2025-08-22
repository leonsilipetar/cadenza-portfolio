const express = require('express');
const {
  signup,
  login,
  verifyToken,
  refreshToken,
  getUser,
  logout,
  getKorisnici,
  getDetaljiKorisnika,
  updateDetaljiKorisnika,
  getAllStudents,
  searchUsersAndMentors,
  getUserInvoices,
  updatePassword,
  deleteUser,
  authenticateUser,
  getUserProfile,
  createUser,
  updateUser,
  getUsersBySchool,
  updateFcmToken,
  getOsnovniDetaljiKorisnika,
  getOsnovniDetaljiSvihKorisnika,
  getUserStats,
  getLinkedAccounts,
  getUserWithPrograms
} = require('../controllers/user-controller.js');
const {
  signupMentor,
  getMentori,
  updateDetaljiMentora,
  getMentorStudents,
  getStudentsRaspored,
  getStudentRaspored,
  addScheduleToStudent,
  deleteRaspored,
  getDetaljiMentora,
  getClassroomSchedule,
  getOsnovniDetaljiMentora,
  getAllStudentSchedules,
  getOsnovniDetaljiJednogMentora
} = require('../controllers/mentor-controller.js');
const { updateTeorija, getTeorija, deleteTermin } = require('../controllers/teorija-controller');
const { getSchools } = require('../controllers/school-controller');
const {
  createClassroom,
  getAllClassrooms,
  updateClassroom,
  deleteClassroom,
} = require('../controllers/classroom-controller'); // Import classroom controller
const { generateInvoice, addInvoice, downloadInvoice } = require('../controllers/invoice-controller'); // Import invoice controller
const { getAllPrograms, getProgramById, createProgram, updateProgram, deleteProgram } = require('../controllers/program-controller');
const {
  getTheoryStudents,
  getStudentsByProgram
} = require('../controllers/student-controller');

const {
  createPost,
  getPosts,
  getMyPosts,
  updatePost,
  deletePost
} = require('../controllers/post-controller');
const { getNotifications } = require('../controllers/notification-controller.js');
const {
  getChats
} = require('../controllers/chat-controller');
const {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  sendGroupMessage,
  markGroupMessagesAsRead
} = require('../controllers/message-controller.js');
const { Message, User, Sequelize } = require('../models');
const { Op } = Sequelize;
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
const invoiceController = require('../controllers/invoice-controller');
const { Program, Mentor, School, Invoice } = require('../models');
const { Chat } = require('../models');
const { sequelize } = require('../models');
const documentRoutes = require('./document-routes');
const { uploadProfilePicture, getProfilePicture, deleteProfilePicture } = require('../controllers/profile-controller');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const { loginLimiter, fcmLimiter, staticResourceLimiter } = require('../middleware/rateLimiter');
const xlsx = require('xlsx');  // Add this at the top
const { Analytics } = require('../models');
const {
  getDriveStatus,
  initDriveSetup,
  completeDriveSetup,
  listFiles,
  uploadFile,
  createFolder,
  getFile,
  deleteFile,
  browseFolders,
  setRootFolder,
  updateDriveSettings
} = require('../controllers/drive-controller');

// Message validation constants
const MESSAGE_MAX_LENGTH = 2000;
const MESSAGE_MIN_LENGTH = 1;

// Create a limiter for message sending
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 30 messages per minute
  message: {
    error: 'Too many messages sent. Please wait a minute before sending more messages.'
  },
  keyGenerator: (req) => req.user.id // Rate limit by user ID
});

// Message validation middleware
const validateMessage = (req, res, next) => {
  const { text } = req.body;

  if (!text || text.trim().length < MESSAGE_MIN_LENGTH) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (text.length > MESSAGE_MAX_LENGTH) {
    return res.status(400).json({ error: `Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters` });
  }

  // Sanitize the message text
  req.body.text = xss(text.trim());
  next();
};

const router = express.Router();

// Document routes
router.use('/documents', documentRoutes);

// Authentication routes (no token required)
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post('/refresh-token', refreshToken);

// Protected routes (token required)
router.post("/signup", verifyToken, signup);
router.put("/update-korisnik/:userId", verifyToken, updateDetaljiKorisnika);
router.get("/user", verifyToken, getUser);
router.get("/user/programs", verifyToken, getUserWithPrograms);
router.get("/user/programs/:id", verifyToken, getUserWithPrograms);
router.get("/korisnici", verifyToken, getKorisnici);
router.get("/profil", verifyToken, getUser);
router.get('/linked-accounts', verifyToken, getLinkedAccounts);
router.get("/korisnik/:userId", verifyToken, getDetaljiKorisnika);
router.get("/korisnik-osnovno/:userId", verifyToken, getOsnovniDetaljiKorisnika);
router.get("/korisnici-osnovno", verifyToken, getOsnovniDetaljiSvihKorisnika);
router.get('/all-students', getAllStudents);
router.get('/users/stats', verifyToken, getUserStats);
router.get('/users', verifyToken, searchUsersAndMentors);
router.get('/users/:userId/invoices', getUserInvoices);
router.get('/users/:id/programs', verifyToken, getUserWithPrograms);
router.get('/users/programs', verifyToken, getUserWithPrograms);
router.post("/reset-password", verifyToken, updatePassword);

// Chat-related routes
router.get('/messages/:recipientId', verifyToken, getMessages);
router.post('/messages', verifyToken, messageLimiter, validateMessage, sendMessage);
router.post('/messages/group', verifyToken, messageLimiter, validateMessage, sendGroupMessage);
router.post('/messages/mark-read', verifyToken, markMessagesAsRead);
router.post('/messages/group/mark-read', verifyToken, markGroupMessagesAsRead);
router.get('/chats', verifyToken, getChats);
router.delete('/messages/:messageId', verifyToken, deleteMessage);

// Mentor-related routes
router.post('/signup-mentori', verifyToken, signupMentor);
router.get('/mentori', verifyToken, getMentori);
router.get('/mentori/:korisnikId', verifyToken, getDetaljiMentora);
router.get('/mentori-osnovno/:korisnikId', verifyToken,  getOsnovniDetaljiMentora);
router.get('/mentor-osnovno/:korisnikId', verifyToken,  getOsnovniDetaljiJednogMentora);
router.put('/mentori/:korisnikId', verifyToken, updateDetaljiMentora);

// Theory-related routes
router.post("/uredi/teorija", verifyToken, updateTeorija);
router.get("/rasporedTeorija", verifyToken, getTeorija);
router.get("/rasporedUcenici/:id", verifyToken, getStudentsRaspored);
router.get("/allStudentSchedules", verifyToken, getAllStudentSchedules);
router.get("/rasporedUcenik/:id", verifyToken, getStudentRaspored);
router.get('/students/:id', verifyToken, getMentorStudents);
router.post('/uredi/ucenik-raspored/:id', verifyToken, addScheduleToStudent);
router.delete("/deleteTermin/:id", verifyToken, deleteTermin);
router.delete("/deleteUcenikTermin/:id", verifyToken, deleteRaspored);

// Student special routes
router.get('/group-create/theory', verifyToken, getTheoryStudents);
router.get('/group-create/by-program', verifyToken, getStudentsByProgram);

// Classroom-related routes
router.post('/classrooms', verifyToken, createClassroom);
router.get('/classrooms', verifyToken, getAllClassrooms);
router.put('/classrooms/:id', verifyToken, updateClassroom);
router.delete('/classrooms/:id', verifyToken, deleteClassroom);

// New route for fetching schools
router.get('/schools', verifyToken, getSchools);

// Nova ruta za generiranje računa
// U ruti
router.get('/users/:userId/invoices', verifyToken, getUserInvoices);
router.post('/generate-invoice', verifyToken, generateInvoice);
router.get('/download/:id', verifyToken, downloadInvoice);
router.post('/racuni', verifyToken, addInvoice);

router.delete("/delete-user/:id", verifyToken, deleteUser);

// Post-related routes
router.post('/posts', verifyToken, createPost);
router.get('/posts', verifyToken, getPosts);
router.get('/my-posts', verifyToken, getMyPosts);
router.put('/posts-edit/:id', verifyToken, updatePost);
router.delete('/posts/:id', verifyToken, deletePost);

// Add these routes to your existing user routes
router.get('/students/mentors', verifyToken, async (req, res) => {
  try {
    const mentors = await Mentor.findAll({
      attributes: ['id', 'ime', 'prezime', 'email', 'profilePicture']
    }); // Fetch all mentors with profile picture

    // Format response to include hasProfilePicture flag
    const formattedMentors = mentors.map(mentor => ({
      id: mentor.id,
      ime: mentor.ime,
      prezime: mentor.prezime,
      email: mentor.email,
      hasProfilePicture: mentor.profilePicture !== null
    }));

    res.json(formattedMentors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching mentors' });
  }
});

router.get('/mentors/students', verifyToken, async (req, res) => {
  try {
    const mentorId = req.user.id;

    // Find all students associated with this mentor
    const students = await User.findAll({
      where: {
        mentorId: {
          [Op.contains]: [mentorId]
        },
        isStudent: true
      },
      include: [{
        model: Program,
        as: 'programs',
        through: { attributes: [] }, // Exclude junction table fields
        attributes: ['id', 'naziv', 'tipovi']
      }],
      attributes: ['id', 'ime', 'prezime', 'adresa', 'oib', 'email', 'programType', 'hasUnpaidInvoice', 'profilePicture']
    });

    // Format the response to include program information, hasUnpaidInvoice, and hasProfilePicture
    const formattedStudents = students.map(student => ({
      id: student.id,
      ime: student.ime,
      prezime: student.prezime,
      program: student.programs || [], // Include all programs
      adresa: student.adresa,
      oib: student.oib,
      email: student.email,
      programType: student.programType,
      hasUnpaidInvoice: student.hasUnpaidInvoice,
      hasProfilePicture: student.profilePicture !== null
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Error fetching mentor students:', error);
    res.status(500).json({
      message: 'Error fetching mentor students',
      error: error.message
    });
  }
});

// Programs routes
router.get('/programs', verifyToken, getAllPrograms);
router.get('/programs/:id', verifyToken, getProgramById);
router.post('/programs', verifyToken, createProgram);
router.put('/programs/:id', verifyToken, updateProgram);
router.delete('/programs/:id', verifyToken, deleteProgram);
router.post('/invoices/upload-pdf-invoice', verifyToken, upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Decode the filename
    const originalName = decodeURIComponent(escape(req.file.originalname));

    const { studentId } = req.body;

    // Get student details
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate invoice number (YYYYMMXXX format)
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    // Find the last invoice number for current year/month
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

    // Calculate due date (15 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Structure the PDF data to match MongoDB format
    const pdfData = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: originalName
    };


    // Create invoice record
    const invoice = await Invoice.create({
      studentId: parseInt(studentId),
      mentorId: req.user.id,
      schoolId: student.schoolId,
      invoiceNumber,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      dueDate,
      pdfData: JSON.stringify(pdfData), // Store as JSON string
      pdfContentType: req.file.mimetype,
      pdfOriginalName: originalName,
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

    // Parse the PDF data back to object
    const invoiceData = populatedInvoice.toJSON();
    if (invoiceData.pdfData) {
      invoiceData.pdfData = JSON.parse(invoiceData.pdfData);
      // Convert Buffer to base64 string
      invoiceData.pdfData.data = Buffer.from(invoiceData.pdfData.data).toString('base64');
    }

    res.status(201).json(invoiceData);
  } catch (error) {
    console.error('Error uploading invoice:', error);
    res.status(500).json({
      message: 'Error uploading invoice',
      error: error.message
    });
  }
});
// Invoice routes
router.post('/invoices/generate', verifyToken, upload.single('pdfFile'), async (req, res) => {
  try {
    const invoiceData = JSON.parse(req.body.invoiceData);
    const pdfFile = req.file;

    if (!pdfFile || !invoiceData) {
      return res.status(400).json({ error: 'Missing required data' });
    }


    // Generate invoice number (YYYYMMXXX format)
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    // Find the last invoice number for current year/month
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

    // Calculate due date (15 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Format PDF data for storage
    const pdfData = JSON.stringify({
      data: {
        type: 'Buffer',
        data: Array.from(pdfFile.buffer)
      },
      contentType: pdfFile.mimetype,
      originalName: pdfFile.originalname
    });

    // Create invoice with PDF data
    const invoice = await Invoice.create({
      studentId: invoiceData.studentId,
      programId: invoiceData.programId,
      schoolId: invoiceData.schoolId,
      mentorId: invoiceData.mentorId,
      month: invoiceData.month,
      year: invoiceData.year,
      amount: invoiceData.amount,
      programType: invoiceData.programType,
      invoiceNumber,
      dueDate: invoiceData.dueDate,
      pdfData: pdfData,
      pdfContentType: pdfFile.mimetype,
      pdfOriginalName: pdfFile.originalname,
      status: 'pending',
      active: true
    });

    // Fetch complete invoice with relations
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

    res.json(fullInvoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(500).json({
      error: 'Error saving invoice',
      details: error.message
    });
  }
});

router.get('/invoices/user/:userId', verifyToken, invoiceController.getUserInvoices);
router.get('/invoices/:invoiceId', verifyToken, invoiceController.downloadInvoice);

// Get student's invoices
router.get('/invoices/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const invoices = await Invoice.findAll({
      where: {
        studentId: studentId,
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
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
});

// Add this route to your existing user routes
router.get('/search/users', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    // Search in both User and Mentor tables
    const [users, mentors] = await Promise.all([
      User.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { ime: { [Op.iLike]: `%${query}%` } },
                { prezime: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } },
                { korisnickoIme: { [Op.iLike]: `%${query}%` } }
              ]
            },
            { schoolId: req.user.schoolId }, // Use req.user.schoolId
            { deletedAt: null } // Only active users
          ]
        },
        include: [{
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }],
        limit: 10
      }).catch(err => {
        console.error('Error searching users:', err);
        return [];
      }),

      Mentor.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { ime: { [Op.iLike]: `%${query}%` } },
                { prezime: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } },
                { korisnickoIme: { [Op.iLike]: `%${query}%` } }
              ]
            },
            { schoolId: req.user.schoolId }, // Use req.user.schoolId
            { deletedAt: null } // Only active mentors
          ]
        },
        include: [{
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }],
        limit: 10
      }).catch(err => {
        console.error('Error searching mentors:', err);
        return [];
      })
    ]);

    // Combine and format results
    const results = [
      ...(Array.isArray(users) ? users : []).map(user => ({
        id: user.id,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email,
        korisnickoIme: user.korisnickoIme,
        uloga: 'Student',
        school: user.school
      })),
      ...(Array.isArray(mentors) ? mentors : []).map(mentor => ({
        id: mentor.id,
        ime: mentor.ime,
        prezime: mentor.prezime,
        email: mentor.email,
        korisnickoIme: mentor.korisnickoIme,
        uloga: 'Mentor',
        school: mentor.school
      }))
    ];

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      message: 'Error searching users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add this route for deleting invoices
router.delete('/invoices/delete/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the invoice
    const invoice = await Invoice.findOne({
      where: {
        id: parseInt(id),
        [Op.or]: [
          { mentorId: userId },
          { studentId: { [Op.in]: req.user.students?.map(s => s.id) || [] } }
        ]
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Račun nije pronađen ili nemate pristup'
      });
    }

    await invoice.destroy();

    res.status(200).json({
      success: true,
      message: 'Račun uspješno obrisan'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Greška prilikom brisanja računa'
    });
  }
});

// Add this route for students to fetch their own invoices
router.get('/invoices/students-invoices/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;
  try {
    // Verify that the user is a student
    if (!req.user.isStudent) {
      return res.status(403).json({
        message: 'Only students can access their invoices through this endpoint'
      });
    }

    const invoices = await Invoice.findAll({
      where: {
        studentId: studentId,
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
      error: 'Error downloading invoice',
      details: error.message
    });
  }
});

// Add this route before any routes with :id parameter
router.get('/raspored/:day/:classroomId', verifyToken, getClassroomSchedule);

router.post('/users/fcm-token', verifyToken, fcmLimiter, updateFcmToken);

// Add reminder settings route
router.post('/user/reminder-settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reminderPreferences } = req.body;

    // Validate reminder preferences structure
    if (!reminderPreferences || typeof reminderPreferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder preferences format'
      });
    }

    // Ensure all required fields are present with correct types
    const validatedPreferences = {
      practiceReminders: Boolean(reminderPreferences.practiceReminders),
      classReminders: Boolean(reminderPreferences.classReminders),
      reminderTime: reminderPreferences.reminderTime || '14:00'
    };

    // Find the user first
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update the preferences
    user.reminderPreferences = validatedPreferences;
    await user.save();

    // Get the fresh data
    await user.reload();

    res.json({
      success: true,
      message: 'Reminder preferences updated successfully',
      data: {
        reminderPreferences: user.reminderPreferences
      }
    });
  } catch (error) {
    console.error('Error updating reminder preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reminder preferences'
    });
  }
});

router.get('/verify-token', verifyToken, (req, res) => {
  res.json({
    valid: true,
    userId: req.userId,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      origin: req.headers.origin
    }
  });
});

// Profile picture routes
router.post('/profile-picture', verifyToken, staticResourceLimiter, upload.single('profilePicture'), uploadProfilePicture);
router.get('/profile-picture/:userId', staticResourceLimiter, getProfilePicture);
router.post('/profile-picture/upload', verifyToken, staticResourceLimiter, upload.single('profilePicture'), uploadProfilePicture);
router.delete('/profile-picture', verifyToken, deleteProfilePicture);

// Add new route for bulk generation
router.post('/invoices/generate-bulk', verifyToken, upload.single('pdfFile'), invoiceController.generateBulkInvoices);

// Add new route for generating selected invoices
router.post('/invoices/generate-selected', verifyToken, invoiceController.generateSelectedInvoices);

// Add this route before any routes with :id parameter
router.get('/invoices', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get the admin's school ID from the request user
    const adminSchoolId = req.user.schoolId;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: {
        schoolId: adminSchoolId  // Add this where clause
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
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    res.json({
      invoices,
      pagination: {
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching all invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
});

// Add month mapping
const MONTH_MAP = {
  'siječanj': 1,
  'veljača': 2,
  'ožujak': 3,
  'travanj': 4,
  'svibanj': 5,
  'lipanj': 6,
  'srpanj': 7,
  'kolovoz': 8,
  'rujan': 9,
  'listopad': 10,
  'studeni': 11,
  'prosinac': 12
};

// Add new route for invoice status updates from XLSX
router.post('/invoices/update-status', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read XLSX file
    const workbook = xlsx.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return res.status(400).json({ message: 'File is empty or missing data rows' });
    }

    const results = [];
    const processedOibs = new Set();
    const headers = rows[0].map(h => h?.toString().toLowerCase());

    // Check if it's a month-based format or simple format
    const isMonthFormat = headers.some(h => MONTH_MAP[h]);

    // Process each data row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const oib = row[0]?.toString(); // First column is always OIB

      // Validate OIB
      if (!oib || oib.length !== 11 || !/^\d+$/.test(oib)) {
        results.push({ oib: oib || 'unknown', status: 'error', message: 'Invalid OIB format' });
        continue;
      }

      // Find user by OIB
      const user = await User.findOne({ where: { oib } });
      if (!user) {
        results.push({ oib, status: 'error', message: 'User not found' });
        continue;
      }

      if (isMonthFormat) {
        // Process month-based format
        let hasUnpaidInvoice = false;
        const currentYear = new Date().getFullYear();

        // Process each month column
        for (let j = 1; j < headers.length; j++) {
          const monthName = headers[j];
          const monthNum = MONTH_MAP[monthName];
          if (!monthNum) continue;

          const isPaid = row[j]?.toString().toLowerCase() === 'da';

          // Find and update invoice for this month
          const invoice = await Invoice.findOne({
            where: {
              studentId: user.id,
              month: monthNum,
              year: currentYear,
              active: true
            }
          });

          if (invoice) {
            invoice.status = isPaid ? 'paid' : 'pending';
            await invoice.save();

            if (!isPaid) {
              hasUnpaidInvoice = true;
            }
          }
        }

        // Update user's hasUnpaidInvoice flag based on all months
        if (!processedOibs.has(oib)) {
          user.hasUnpaidInvoice = hasUnpaidInvoice;
          await user.save();
          processedOibs.add(oib);
        }
      } else {
        // Process simple format (OIB | Status)
        const isPaid = row[1]?.toString().toLowerCase() === 'da';

        // Only update user's hasUnpaidInvoice flag
        if (!processedOibs.has(oib)) {
          user.hasUnpaidInvoice = !isPaid;
          await user.save();
          processedOibs.add(oib);
        }
      }

      results.push({ oib, status: 'success' });
    }

    res.json({
      message: 'Status update completed',
      results,
      format: isMonthFormat ? 'month-based' : 'simple'
    });

  } catch (error) {
    console.error('Error updating invoice statuses:', error);
    res.status(500).json({
      error: 'Error updating invoice statuses',
      details: error.message
    });
  }
});

// Add this helper function at the top with other helper functions
const generateUsername = async (ime, prezime) => {
  let baseUsername = `${ime.toLowerCase()}.${prezime.toLowerCase()}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9.]/g, ''); // Remove special characters except dots

  let username = baseUsername;
  let counter = 1;

  // Keep checking until we find an available username
  while (true) {
    // Check both User and Mentor tables for existing username
    const [existingUser, existingMentor] = await Promise.all([
      User.findOne({ where: { korisnickoIme: username } }),
      Mentor.findOne({ where: { korisnickoIme: username } })
    ]);

    if (!existingUser && !existingMentor) {
      return username;
    }
    username = `${baseUsername}${counter}`;
    counter++;
  }
};

// Update the bulk upload route
router.post('/users/bulk-upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read XLSX file
    const workbook = xlsx.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return res.status(400).json({ message: 'File is empty or missing data rows' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Skip header row and process each data row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      try {
        const ime = row[0];
        const prezime = row[1];

        if (!ime || !prezime) {
          throw new Error('Ime i prezime su obavezna polja');
        }

        // Generate username
        const korisnickoIme = await generateUsername(ime, prezime);

        // Extract user data from row
        const userData = {
          ime,
          prezime,
          email: row[2],
          oib: row[3],
          korisnickoIme, // Add the generated username
          adresa: row[4] || row[5] || row[6] ? {
            ulica: row[4] || '',
            kucniBroj: row[5] || '',
            mjesto: row[6] || ''
          } : null,
          roditelj1: row[7] || row[8] || row[9] ? {
            ime: row[7] || '',
            prezime: row[8] || '',
            brojMobitela: row[9] || ''
          } : null,
          roditelj2: row[10] || row[11] || row[12] ? {
            ime: row[10] || '',
            prezime: row[11] || '',
            brojMobitela: row[12] || ''
          } : null,
          isStudent: true,
          schoolId: req.user.schoolId // Use the admin's school ID
        };

        // Call the existing signup function
        await signup({ body: userData }, {
          status: () => ({
            json: (data) => {
              successCount++;
              results.push({
                status: 'success',
                email: userData.email,
                korisnickoIme: userData.korisnickoIme // Include generated username in response
              });
            }
          })
        });

      } catch (error) {
        errorCount++;
        results.push({
          status: 'error',
          email: row[2] || 'unknown',
          message: error.message || 'Error creating user'
        });
      }
    }

    res.json({
      message: `Processed ${rows.length - 1} rows`,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    res.status(500).json({
      message: 'Error processing file',
      error: error.message
    });
  }
});

// Add new route for mentor bulk upload
router.post('/mentors/bulk-upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read XLSX file
    const workbook = xlsx.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      return res.status(400).json({ message: 'File is empty or missing data rows' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Skip header row and process each data row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      try {
        const ime = row[0];
        const prezime = row[1];
        const email = row[2];
        const oib = row[3];

        if (!ime || !prezime || !email || !oib) {
          throw new Error('Nedostaju obavezna polja (ime, prezime, email, OIB)');
        }

        // Generate username using the existing helper function
        const korisnickoIme = await generateUsername(ime, prezime);

        // Prepare mentor data
        const mentorData = {
          ime,
          prezime,
          email,
          oib,
          korisnickoIme,
          adresa: row[4] || row[5] || row[6] ? {
            ulica: row[4] || '',
            kucniBroj: row[5] || '',
            mjesto: row[6] || ''
          } : null,
          isMentor: true,
          isStudent: false,
          schoolId: req.user.schoolId
        };

        // Call the existing signupMentor function
        await signupMentor({ body: mentorData }, {
          status: () => ({
            json: (data) => {
              successCount++;
              results.push({
                status: 'success',
                email: mentorData.email,
                korisnickoIme: mentorData.korisnickoIme
              });
            }
          })
        });

      } catch (error) {
        errorCount++;
        results.push({
          status: 'error',
          email: row[2] || 'unknown',
          message: error.message || 'Error creating mentor'
        });
      }
    }

    res.json({
      message: `Processed ${rows.length - 1} rows`,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    res.status(500).json({
      message: 'Error processing file',
      error: error.message
    });
  }
});

// Add analytics endpoint
router.post('/analytics', verifyToken, async (req, res) => {
  try {
    const analyticsData = req.body;

    // Add user info if available
    if (req.user) {
      analyticsData.userId = req.user.id;
      analyticsData.userRole = req.user.isMentor ? 'Mentor' : 'Student';
      analyticsData.schoolId = req.user.schoolId;
    }

    // Create analytics record
    await Analytics.create({
      device_type: analyticsData.deviceInfo?.platform || null,
      browser: analyticsData.deviceInfo?.userAgent?.split(' ')[0] || null,
      platform: analyticsData.deviceInfo?.platform || null,
      language: analyticsData.deviceInfo?.language || null,
      screen_width: analyticsData.deviceInfo?.screenSize?.split('x')[0] || null,
      screen_height: analyticsData.deviceInfo?.screenSize?.split('x')[1] || null,
      is_pwa: analyticsData.deviceInfo?.isPWA || false,
      is_mobile: /Mobile|Android|iOS/.test(analyticsData.deviceInfo?.userAgent) || false,
      user_agent: analyticsData.deviceInfo?.userAgent || null,

      // Performance metrics if available
      page_load_time: analyticsData.pageLoadTime,
      time_to_interactive: analyticsData.timeToInteractive,
      api_response_time: analyticsData.apiResponseTime,
      memory_usage: analyticsData.memoryUsage,

      // Session metrics if available
      session_duration: analyticsData.session_duration,
      pages_per_session: analyticsData.pages_per_session,
      bounce_rate: analyticsData.bounce_rate,
      active_time: analyticsData.active_time,

      // Feature usage if available
      feature_used: analyticsData.feature_used,
      interaction_count: analyticsData.interaction_count
    });

    res.status(200).json({ message: 'Analytics data received' });
  } catch (error) {
    console.error('Error saving analytics:', error);
    res.status(500).json({
      message: 'Error saving analytics data',
      error: error.message
    });
  }
});

// Add Drive routes
router.get('/drive/:schoolId/status', verifyToken, getDriveStatus);
router.post('/drive/:schoolId/init', verifyToken, initDriveSetup);
router.post('/drive/:schoolId/complete', verifyToken, completeDriveSetup);
router.get('/drive/:schoolId/files', verifyToken, listFiles);
router.post('/drive/:schoolId/upload', verifyToken, upload.single('file'), uploadFile);
router.post('/drive/:schoolId/folders', verifyToken, createFolder);
router.get('/drive/:schoolId/files/:fileId', verifyToken, getFile);
router.delete('/drive/:schoolId/files/:fileId', verifyToken, deleteFile);
router.get('/drive/:schoolId/browser', verifyToken, browseFolders);
router.post('/drive/:schoolId/root-folder', verifyToken, setRootFolder);
router.post('/drive/:schoolId/settings', verifyToken, updateDriveSettings);

module.exports = router;