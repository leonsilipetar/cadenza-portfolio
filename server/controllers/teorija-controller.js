const { RasporedTeorija, School } = require('../models'); // Import both models
const asyncWrapper = require('../middleware/asyncWrapper');
const { createRasporedNotification } = require('./notification-controller');

// Update Teorija schedule
const updateTeorija = asyncWrapper(async (req, res) => {
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
    let schedule = await RasporedTeorija.findOne({
      where: { schoolId }
    });

    if (!schedule) {
      // Create new schedule if it doesn't exist
      schedule = await RasporedTeorija.create({
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
        type: 'teorija',
        mentor: term.mentor || '',
        dvorana: term.dvorana,
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
        
        // Combine existing and new terms, removing duplicates by time and week
        const combinedTerms = [...existingTerms];
        
        newTerms.forEach(newTerm => {
          // Check if there's already a term at this time, in this room, and in this week
          const existingIndex = combinedTerms.findIndex(
            et => et.vrijeme === newTerm.vrijeme && 
                 et.dvorana === newTerm.dvorana &&
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
      message: 'Raspored teorija updated successfully',
      raspored: schedule
    });
  } catch (error) {
    console.error('Error updating teorija:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// Get all Teorija schedules
const getTeorija = asyncWrapper(async (req, res) => {
  try {
    const teorija = await RasporedTeorija.findAll({
      where: { active: true }
    });

    // Format the response to match the expected structure
    const formattedTeorija = teorija.map(t => ({
      id: t.id,
      pon: t.pon || [],
      uto: t.uto || [],
      sri: t.sri || [],
      cet: t.cet || [],
      pet: t.pet || [],
      sub: t.sub || [],
      schoolId: t.schoolId,
      active: t.active,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    res.status(200).json({ teorija: formattedTeorija });
  } catch (error) {
    console.error('Error fetching teorija:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// Delete a term from schedule
const deleteTermin = asyncWrapper(async (req, res) => {
  try {
    const { id } = req.params;
    const { day, teorijaID } = req.query;

    console.log('Delete params:', { id, day, teorijaID });

    const rasporedTeorija = await RasporedTeorija.findByPk(teorijaID);
    if (!rasporedTeorija) {
      return res.status(404).json({ message: 'RasporedTeorija not found' });
    }

    // Get current day's schedule
    let daySchedule = rasporedTeorija[day] || [];
    console.log('Current day schedule:', daySchedule);
    
    if (!Array.isArray(daySchedule)) {
      return res.status(400).json({ message: `Invalid schedule format for ${day}` });
    }

    // Convert id to number for comparison
    const termIdToDelete = parseInt(id);
    console.log('Term ID to delete:', termIdToDelete);

    // Remove the specific term
    const updatedDaySchedule = daySchedule.filter(term => {
      const termId = parseInt(term.id);
      console.log('Comparing term ID:', termId, 'with:', termIdToDelete);
      return termId !== termIdToDelete;
    });

    console.log('Updated day schedule:', updatedDaySchedule);

    // Update the specific day's schedule
    rasporedTeorija[day] = updatedDaySchedule;
    await rasporedTeorija.save();

    res.json({ 
      message: 'Termin deleted successfully',
      schedule: rasporedTeorija[day]
    });

  } catch (error) {
    console.error('Error deleting term:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

module.exports = { updateTeorija, getTeorija, deleteTermin };
