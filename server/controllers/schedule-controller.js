const { WeekType, Poll, Student, School, Notification } = require('../models');
const moment = require('moment');
const asyncWrapper = require('../middleware/asyncWrapper');
const { Op } = require('sequelize');

// Get current week type
const getCurrentWeekType = asyncWrapper(async (req, res) => {
  const schoolId = req.user.schoolId;

  try {
    const latestWeekType = await WeekType.findOne({
      where: { schoolId },
      order: [['date', 'DESC']]
    });

    if (!latestWeekType) {
      return res.status(200).json({ weekType: null });
    }

    // Calculate if we need to flip the week type based on weeks passed
    const startDate = moment(latestWeekType.date);
    const today = moment();
    const weeksDiff = today.diff(startDate, 'weeks');
    
    const currentType = weeksDiff % 2 === 0 
      ? latestWeekType.type 
      : (latestWeekType.type === 'A' ? 'B' : 'A');

    res.status(200).json({ weekType: currentType });
  } catch (error) {
    console.error('Error getting week type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set week type
const setWeekType = asyncWrapper(async (req, res) => {
  const { weekType, date } = req.body;
  const schoolId = req.user.schoolId;

  if (!weekType || !date || !['A', 'B'].includes(weekType)) {
    return res.status(400).json({ message: 'Invalid week type or date' });
  }

  try {
    await WeekType.create({
      type: weekType,
      date: date,
      schoolId: schoolId
    });

    res.status(200).json({ message: 'Week type set successfully' });
  } catch (error) {
    console.error('Error setting week type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new poll
const createPoll = asyncWrapper(async (req, res) => {
  const { question, options, type, endDate } = req.body;
  const creator = req.user;
  const schoolId = req.user.schoolId;

  if (!question || !options || !type || !endDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get all students from the school who attend theory classes
    const recipients = await Student.findAll({
      where: {
        schoolId,
        pohadjaTeoriju: true
      }
    });

    const poll = await Poll.create({
      question,
      options,
      type,
      endDate,
      schoolId,
      creatorId: creator.id,
      status: 'active',
      responses: [],
      recipientIds: recipients.map(r => r.id)
    });

    // Create notifications for all recipients
    await Promise.all(
      recipients.map(student => 
        Notification.create({
          title: 'Nova anketa',
          content: `Nova anketa za teorijsku nastavu: ${question}`,
          type: 'poll',
          recipientId: student.id,
          senderId: creator.id,
          schoolId: schoolId,
          read: false,
          link: `/naslovna?tab=polls&pollId=${poll.id}`
        })
      )
    );

    // Emit socket events for real-time updates
    if (req.io) {
      // Emit new poll event
      req.io.to(`school_${schoolId}`).emit('newPoll', {
        ...poll.toJSON(),
        creator: {
          id: creator.id,
          name: `${creator.ime} ${creator.prezime}`
        }
      });

      // Emit notifications to each recipient
      recipients.forEach(student => {
        req.io.to(`user_${student.id}`).emit('notification', {
          type: 'poll',
          message: 'Nova anketa za teorijsku nastavu'
        });
      });
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

  try {
    const polls = await Poll.findAll({
      where: {
        schoolId,
        status: 'active',
        endDate: {
          [Op.gt]: new Date()
        }
      },
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
  const userId = req.user.id;

  try {
    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ message: 'Poll is no longer active' });
    }

    if (new Date(poll.endDate) < new Date()) {
      return res.status(400).json({ message: 'Poll has ended' });
    }

    // Check if user has already responded
    const existingResponse = poll.responses.find(r => r.userId === userId);
    if (existingResponse) {
      return res.status(400).json({ message: 'You have already responded to this poll' });
    }

    // Add response
    poll.responses = [...poll.responses, { userId, response, timestamp: new Date() }];
    await poll.save();

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(`school_${poll.schoolId}`).emit('pollUpdate', {
        pollId,
        responses: poll.responses
      });
    }

    res.status(200).json({ message: 'Response submitted successfully' });
  } catch (error) {
    console.error('Error submitting poll response:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = {
  getCurrentWeekType,
  setWeekType,
  createPoll,
  getActivePolls,
  submitPollResponse
}; 