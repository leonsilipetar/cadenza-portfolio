const { createRasporedNotification } = require('./notification-controller');
const { Mentor, Student, Raspored, School } = require('../models');

const createRaspored = async (req, res) => {
  try {
    const { raspored, studentId } = req.body;
    
    // Validate input
    if (!raspored || !studentId) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // Find the student
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    // Process each day's schedule
    const processedRaspored = {};
    ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].forEach(day => {
      if (raspored[day]) {
        // Add week information to each term
        processedRaspored[day] = raspored[day].map(term => ({
          ...term,
          id: term.id || Date.now() + Math.floor(Math.random() * 10000),
          week: term.week || null // Add week information
        }));

        // Sort terms by week and time
        processedRaspored[day].sort((a, b) => {
          // First sort by week (null weeks come first)
          if (a.week === null && b.week !== null) return -1;
          if (a.week !== null && b.week === null) return 1;
          if (a.week !== b.week) return a.week < b.week ? -1 : 1;
          
          // Then sort by time
          const timeA = a.vrijeme.split(':').map(Number);
          const timeB = b.vrijeme.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
      }
    });

    // Create or update the schedule
    let schedule = await Raspored.findOne({
      where: { studentId }
    });

    if (schedule) {
      await schedule.update(processedRaspored);
    } else {
      schedule = await Raspored.create({
        ...processedRaspored,
        studentId
      });
    }

    // Create notification
    const creator = await Mentor.findByPk(req.user.id);
    await createRasporedNotification(schedule, creator);

    res.status(200).json({
      message: 'Schedule created successfully',
      schedule
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get schedule for a student
const getRaspored = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const schedule = await Raspored.findOne({
      where: { studentId }
    });

    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      schedule
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

const updateRaspored = asyncWrapper(async (req, res) => {
  try {
    const { raspored, schoolId, merge } = req.body;
    const sender = req.user;
    
    // Verify the school exists
    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ 
        message: 'School not found' 
      });
    }

    // Get existing schedule
    let schedule = await Raspored.findOne({
      where: { schoolId }
    });

    if (!schedule) {
      // Create new schedule if it doesn't exist
      schedule = await Raspored.create({
        schoolId,
        pon: [], uto: [], sri: [], cet: [], pet: [], sub: []
      });
    }

    // Group new terms by day
    const termsByDay = raspored.reduce((acc, term) => {
      if (!acc[term.day]) acc[term.day] = [];
      // Ensure each term has an id and week information
      const termWithId = {
        ...term,
        id: term.id || Date.now() + Math.floor(Math.random() * 10000),
        day: term.day,
        type: 'voznja',
        mentor: term.mentor || '',
        kandidat: term.kandidat || '',
        vrijeme: term.vrijeme,
        duration: term.duration || 45,
        schoolId: schoolId,
        week: term.week // Ensure week is included
      };
      acc[term.day].push(termWithId);
      return acc;
    }, {});

    // If merging, combine with existing terms
    if (merge) {
      Object.keys(termsByDay).forEach(day => {
        const existingTerms = schedule[day] || [];
        const newTerms = termsByDay[day];
        
        // Combine existing and new terms, removing duplicates by time, mentor, and week
        const combinedTerms = [...existingTerms];
        
        newTerms.forEach(newTerm => {
          // Check if there's already a term at this time for this mentor and week
          const existingIndex = combinedTerms.findIndex(
            et => et.vrijeme === newTerm.vrijeme && 
                 et.mentor === newTerm.mentor &&
                 et.week === newTerm.week // Include week in duplicate check
          );
          
          if (existingIndex >= 0) {
            // Update existing term but preserve its id
            combinedTerms[existingIndex] = {
              ...newTerm,
              id: combinedTerms[existingIndex].id
            };
          } else {
            // Add new term with generated id
            combinedTerms.push(newTerm);
          }
        });

        // Sort terms by week and time
        combinedTerms.sort((a, b) => {
          // First sort by week (null weeks come first)
          if (a.week === null && b.week !== null) return -1;
          if (a.week !== null && b.week === null) return 1;
          if (a.week !== b.week) return a.week < b.week ? -1 : 1;
          
          // Then sort by time
          const timeA = a.vrijeme.split(':').map(Number);
          const timeB = b.vrijeme.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

        schedule[day] = combinedTerms;
      });
    } else {
      // Just update the specified days with new terms
      Object.entries(termsByDay).forEach(([day, terms]) => {
        schedule[day] = terms;
      });
    }

    await schedule.save();

    // Create notification for schedule update
    await createRasporedNotification(schedule, sender);

    res.status(200).json({ 
      message: 'Raspored updated successfully',
      raspored: schedule
    });
  } catch (error) {
    console.error('Error updating raspored:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

module.exports = {
  createRaspored,
  getRaspored,
  updateRaspored
}; 