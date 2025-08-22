const express = require('express');
const { verifyToken } = require('../controllers/user-controller');
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
  removeStudentFromMentor,
  updateMentorPrograms,
  cleanupDuplicateSchedules
} = require('../controllers/mentor-controller');

const router = express.Router();

// Add logging to debug route matching
router.use((req, res, next) => {
  console.log('Mentor route hit:', req.method, req.path);
  next();
});

// Mentor-related routes
router.post('/signup-mentori', verifyToken, signupMentor);
router.get('/mentori', verifyToken, getMentori);
router.get('/mentor/:mentorId', verifyToken, getDetaljiMentora);
router.put('/update-mentor/:mentorId', verifyToken, updateDetaljiMentora);
router.get('/mentors/students', verifyToken, getMentorStudents);
router.get('/students/raspored/:id', verifyToken, getStudentsRaspored);
router.get('/student/raspored/:id', verifyToken, getStudentRaspored);
router.post('/add-schedule', verifyToken, addScheduleToStudent);
router.delete('/delete-raspored/:id', verifyToken, deleteRaspored);
router.delete('/mentor/:mentorId/student/:studentId', verifyToken, removeStudentFromMentor);
router.post('/mentori/:id/programs', verifyToken, updateMentorPrograms);
router.post('/cleanup-schedules', verifyToken, cleanupDuplicateSchedules);

router.route('/mentori/:id')
  .put(verifyToken, updateDetaljiMentora)
  .delete(verifyToken, removeStudentFromMentor);

module.exports = router;