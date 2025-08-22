const { Poll, Notification } = require('../models');
const asyncWrapper = require('../middleware/asyncWrapper');
const { Op } = require('sequelize');

// Create a new poll
const createPoll = asyncWrapper(async (req, res) => {
  const { question, options, endDate, type } = req.body;
  const creator = req.user;
  const schoolId = req.user.schoolId;

  if (!question || !options || !endDate || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const poll = await Poll.create({
      question,
      options,
      type,
      endDate,
      schoolId,
      creatorId: creator.id,
      creatorName: `${creator.ime} ${creator.prezime}`,
      status: 'active',
      responses: [],
    });

    // Create notification for all students
    await Notification.create({
      title: 'Nova anketa',
      message: `Nova anketa za teorijsku nastavu: ${question}`,
      content: `Nova anketa za teorijsku nastavu: ${question}`,
      type: 'poll',
      recipientId: null, // null means for all students
      senderId: creator.id,
      schoolId: schoolId,
      read: false,
      link: `/naslovna?tab=polls&pollId=${poll.id}`
    });

    // Emit socket events for real-time updates
    if (req.io) {
      req.io.to(`school_${schoolId}`).emit('newPoll', poll);
    }

    res.status(201).json({
      message: 'Poll created successfully',
      poll
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get active polls
const getActivePolls = asyncWrapper(async (req, res) => {
  const schoolId = req.user.schoolId;
  const isMentor = !req.user.isStudent;
  const pohadjaTeoriju = req.user.pohadjaTeoriju;

  try {
    // If user is not a mentor and doesn't attend theory classes, return no polls
    if (!isMentor && !pohadjaTeoriju) {
      return res.status(403).json({ 
        message: 'Samo učenici koji pohađaju teorijsku nastavu mogu vidjeti ankete',
        polls: []
      });
    }

    const whereClause = {
      schoolId,
      ...(isMentor 
        ? { creatorId: req.user.id } // Mentors see all their created polls
        : { // Students see only active polls that haven't ended
            status: 'active',
            endDate: {
              [Op.gt]: new Date()
            }
          }
      )
    };

    const polls = await Poll.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ polls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit poll response
const submitPollResponse = asyncWrapper(async (req, res) => {
  const { pollId } = req.params;
  const { response } = req.body;
  const user = req.user;

  try {
    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (new Date(poll.endDate) < new Date()) {
      return res.status(400).json({ message: 'Poll has ended' });
    }

    // Get current responses or initialize empty array
    let currentResponses = poll.responses || [];
    
    // Check if user has already voted
    const existingResponse = currentResponses.find(r => r.userId === user.id);
    if (existingResponse) {
      // Check if the previous vote was more than 10 minutes ago
      const voteTime = new Date(existingResponse.timestamp);
      const timeDiff = (new Date() - voteTime) / 1000 / 60; // Convert to minutes
      
      if (timeDiff > 10) {
        return res.status(400).json({ 
          message: 'You can no longer change your vote. Votes are locked after 10 minutes.' 
        });
      }
    }

    // Remove any existing response from this user
    currentResponses = currentResponses.filter(r => r.userId !== user.id);

    // Add new response
    const newResponse = {
      userId: user.id,
      ime: user.ime,
      prezime: user.prezime,
      response,
      timestamp: new Date().toISOString()
    };
    
    currentResponses.push(newResponse);

    // Update the poll with the new responses array
    await Poll.update(
      { responses: currentResponses },
      { 
        where: { id: pollId },
        returning: true
      }
    );

    // Fetch the updated poll
    const updatedPoll = await Poll.findByPk(pollId);

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(`school_${poll.schoolId}`).emit('pollUpdate', {
        pollId,
        responses: updatedPoll.responses
      });
    }

    res.status(200).json({ 
      message: 'Response submitted successfully',
      poll: updatedPoll
    });
  } catch (error) {
    console.error('Error submitting poll response:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete poll
const deletePoll = asyncWrapper(async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user.id;
  const isMentor = !req.user.isStudent;

  if (!isMentor) {
    return res.status(403).json({ message: 'Only mentors can delete polls' });
  }

  try {
    const poll = await Poll.findOne({
      where: {
        id: pollId,
        creatorId: userId
      }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found or you do not have permission to delete it' });
    }

    await poll.destroy();

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(`school_${poll.schoolId}`).emit('pollDeleted', pollId);
    }

    res.status(200).json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = {
  createPoll,
  getActivePolls,
  submitPollResponse,
  deletePoll
}; 