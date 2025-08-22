const { Classroom, School } = require('../models'); // Assuming models are properly imported

// Create a new classroom
exports.createClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.create({
      ...req.body,
      schoolId: req.user.school.id  // Use authenticated user's school
    });
    res.status(201).json(classroom);
  } catch (err) {
    console.error('Error creating classroom:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get all classrooms for user's school
exports.getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.findAll({
      where: {
        schoolId: req.user.school.id,
        active: true
      },
      include: [{ 
        model: School,
        as: 'school',
        attributes: ['id', 'name']
      }]
    });
    res.json(classrooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get classrooms by school
exports.getClassrooms = async (req, res) => {
  const { schoolId } = req.query;
  try {
    const classrooms = await Classroom.findAll({
      where: schoolId ? { schoolId } : {},
      include: [{ model: School, as: 'school' }] // Including School model
    });
    res.status(200).json(classrooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Update a classroom
exports.updateClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      where: {
        id: req.params.id,
        schoolId: req.user.school.id  // Ensure user can only update their school's classrooms
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    await classroom.update(req.body);
    res.json(classroom);
  } catch (err) {
    console.error('Error updating classroom:', err);
    res.status(400).json({ error: err.message });
  }
};

// Delete a classroom (soft delete)
exports.deleteClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      where: {
        id: req.params.id,
        schoolId: req.user.school.id  // Ensure user can only delete their school's classrooms
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    await classroom.update({ active: false });
    res.json({ message: 'Classroom deleted successfully' });
  } catch (err) {
    console.error('Error deleting classroom:', err);
    res.status(500).json({ error: err.message });
  }
};
