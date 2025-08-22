const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/user-controller');
const { createPoll, getActivePolls, submitPollResponse, deletePoll } = require('../controllers/poll-controller');

// Apply verifyToken middleware to specific routes
router.post('/', verifyToken, createPoll);
router.get('/active', verifyToken, getActivePolls);
router.post('/:pollId/vote', verifyToken, submitPollResponse);
router.delete('/:pollId', verifyToken, deletePoll);

module.exports = router;

 