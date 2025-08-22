const bcrypt = require('bcrypt');
const User = require('../models/user');
const Mentor = require('../models/mentor');
const nodemailer = require('nodemailer');
const { verifyToken } = require('../middleware/auth');
const userController = require('../controllers/user-controller');
const driveController = require('../controllers/drive-controller');
const documentController = require('../controllers/document-controller');
const postController = require('../controllers/post-controller');
const enrollmentRoutes = require('./enrollment-routes');

// Configure email transporter using existing settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Add to existing routes
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { userId, userType, email } = req.body;
    
    // Find user/mentor
    const Model = userType === 'student' ? User : Mentor;
    const user = await Model.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }
    
    // Check last reset time
    if (user.lastPasswordReset && 
        Date.now() - new Date(user.lastPasswordReset).getTime() < 24 * 60 * 60 * 1000) {
      return res.status(429).json({
        message: 'Molimo pričekajte 24 sata između resetiranja lozinke.'
      });
    }

    // Generate new password (8 characters)
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.lastPasswordReset = new Date();
    await user.save();

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Nova lozinka - Music Art Incubator',
      html: `
        <div>
          <h2>Nova lozinka za vaš račun</h2>
          <p>Vaša nova lozinka je: <strong>${newPassword}</strong></p>
          <p>Molimo vas da se prijavite s novom lozinkom.</p>
          <br/>
          <p>Lijep pozdrav,<br/>Music Art Incubator Tim</p>
        </div>
      `
    });

    res.json({ message: 'Nova lozinka je poslana na email.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Greška pri resetiranju lozinke.' });
  }
});

// Add or update this route
router.post('/remove-student-from-mentor', async (req, res) => {
  try {
    const { mentorId, studentId } = req.body;

    // Update mentor document
    await Mentor.findByIdAndUpdate(mentorId, {
      $pull: { students: { ucenikId: studentId } }
    });

    // Update student document
    await User.findByIdAndUpdate(studentId, {
      $unset: { mentor: "" }
    });

    res.status(200).json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ message: 'Error removing student' });
  }
});

// Update or add this route
router.post('/users', async (req, res) => {
  try {
    const { query } = req.body;
    await userController.searchUsersAndMentors(req, res);
  } catch (error) {
    console.error('Error in user search route:', error);
    res.status(500).json({ message: 'Error processing search request' });
  }
});

// Add these routes with the verifyToken middleware
router.get('/posts', verifyToken, postController.getPosts);
router.get('/my-posts', verifyToken, postController.getMyPosts);

// Student Routes
router.get('/students/theory', verifyToken, require('../controllers/student-controller').getTheoryStudents);
router.get('/students/by-program', verifyToken, require('../controllers/student-controller').getStudentsByProgram);

// Programs Routes
router.get('/programs', verifyToken, require('../controllers/program-controller').getAllPrograms);

// Google Drive integration routes
router.get('/drive/:schoolId/status', verifyToken, driveController.getDriveStatus);
router.post('/drive/:schoolId/init', verifyToken, driveController.initDriveSetup);
router.post('/drive/:schoolId/complete', verifyToken, driveController.completeDriveSetup);
router.get('/drive/:schoolId/files', verifyToken, driveController.listFiles);
router.post('/drive/:schoolId/files', verifyToken, driveController.uploadFile);
router.post('/drive/:schoolId/folders', verifyToken, driveController.createFolder);
router.get('/drive/:schoolId/files/:fileId', verifyToken, driveController.getFile);
router.delete('/drive/:schoolId/files/:fileId', verifyToken, driveController.deleteFile);
router.get('/drive/:schoolId/browser', verifyToken, driveController.browseFolders);
router.post('/drive/:schoolId/set-root-folder', verifyToken, driveController.setRootFolder);
router.post('/drive/:schoolId/settings', verifyToken, driveController.updateDriveSettings);

// Add this route in the document routes section
router.post('/documents/drive', verifyToken, documentController.createDriveDocument); 
router.use('/enrollment', enrollmentRoutes); 