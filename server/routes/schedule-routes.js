const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/user-controller');
const {
  getCurrentWeekType,
  setWeekType,
  createPoll,
  getActivePolls,
  submitPollResponse
} = require('../controllers/schedule-controller');

// Week type routes
router.get('/week-type', verifyToken, getCurrentWeekType);
router.post('/set-week-type', verifyToken, setWeekType);

// Poll routes
router.post('/polls', verifyToken, createPoll);
router.get('/polls', verifyToken, getActivePolls);
router.post('/polls/:pollId/respond', verifyToken, submitPollResponse);

module.exports = router; 