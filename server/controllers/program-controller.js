const { Program, School } = require('../models'); // Assuming you have defined Sequelize models for Program and School
const asyncWrapper = require('../middleware/asyncWrapper');

// Get all programs
const getAllPrograms = async (req, res) => {
  try {
    console.log('User in getAllPrograms:', req.user); // Add this debug log

    const programs = await Program.findAll({
      where: { 
        active: true,
        schoolId: req.user.school.id  // Make sure this matches your user object structure
      },
      include: [{
        model: School,
        as: 'school',
        attributes: ['id', 'name']
      }],
      order: [['naziv', 'ASC']]
    });

    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Error fetching programs' });
  }
};


// Get program by ID
const getProgramById = asyncWrapper(async (req, res) => {
  try {
    const program = await Program.findOne({
      where: { 
        id: req.params.id, 
        schoolId: req.user.school.id  // Match this with getAllPrograms
      },
      include: [{
        model: School,
        as: 'school',
        attributes: ['id', 'name']
      }]
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(program);
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ error: 'Error fetching program' });
  }
});


// Create a new program
const createProgram = asyncWrapper(async (req, res) => {
  try {
    const { naziv, tipovi } = req.body;
    
    // Use the school ID from the authenticated user
    const schoolId = req.user.school.id;

    // Transform tipovi from object to array format if needed
    const transformedTipovi = Array.isArray(tipovi) 
      ? tipovi 
      : Object.entries(tipovi)
          .filter(([_, cijena]) => cijena !== '' && parseFloat(cijena) > 0)
          .map(([tip, cijena]) => ({
            tip,
            cijena: parseFloat(cijena)
          }));

    const program = await Program.create({
      naziv,
      tipovi: transformedTipovi,
      schoolId,
      active: true
    });

    res.status(201).json(program);
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(400).json({ error: error.message || 'Error creating program' });
  }
});


// Update a program
const updateProgram = asyncWrapper(async (req, res) => {
  try {
    const { naziv, tipovi } = req.body;

    // Transform tipovi from object to array format if needed
    const transformedTipovi = Array.isArray(tipovi) 
      ? tipovi 
      : Object.entries(tipovi)
          .filter(([_, cijena]) => cijena !== '' && parseFloat(cijena) > 0)
          .map(([tip, cijena]) => ({
            tip,
            cijena: parseFloat(cijena)
          }));

    const program = await Program.findOne({
      where: { id: req.params.id }
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Update the program
    await program.update({
      naziv,
      tipovi: transformedTipovi
    });

    res.json(program);
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(400).json({ error: error.message || 'Error updating program' });
  }
});

// Delete a program
const deleteProgram = asyncWrapper(async (req, res) => {
  try {
    const program = await Program.findOne({
      where: { 
        id: req.params.id, 
        schoolId: req.user.school.id  // Changed from school to schoolId
      }
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Instead of destroy, set active to false (soft delete)
    await program.update({ active: false });

    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ error: 'Error deleting program' });
  }
});

// Get programs by school (public endpoint)
const getProgramsBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const programs = await Program.findAll({
      where: { 
        active: true,
        schoolId: schoolId
      },
      attributes: ['id', 'naziv'], // Only send necessary data
      order: [['naziv', 'ASC']]
    });

    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Error fetching programs' });
  }
};

module.exports = {
  getAllPrograms,
  getProgramsBySchool,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
};
