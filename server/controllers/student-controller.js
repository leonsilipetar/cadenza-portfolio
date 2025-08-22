const { User, Program, School } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const getAllStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: { isStudent: true },
      include: [{
        model: Program,
        as: 'programs',
        through: { attributes: [] },
        attributes: ['id', 'naziv', 'tipovi'], // Include tipovi
      }],
      order: [['prezime', 'ASC']]
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Error fetching students' });
  }
};

// Get students who attend theory classes
const getTheoryStudents = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    console.log('Getting theory students for school:', schoolId);
    
    const students = await User.findAll({
      where: {
        isStudent: true,
        pohadjaTeoriju: true,
        schoolId
      },
      attributes: ['id', 'ime', 'prezime', 'email'],
      order: [['prezime', 'ASC']]
    });
    
    console.log(`Found ${students.length} theory students`);
    return res.json(students);
  } catch (error) {
    console.error('Error fetching theory students:', error);
    return res.status(500).json({ 
      error: 'Error fetching theory students',
      details: error.message
    });
  }
};

// Get students by program
const getStudentsByProgram = async (req, res) => {
  try {
    const { programId } = req.query;
    const schoolId = req.user.schoolId;
    
    console.log('Getting students for program:', programId, 'in school:', schoolId);
    
    if (!programId) {
      return res.status(400).json({ error: 'Program ID is required' });
    }
    
    // Validate programId
    const parsedProgramId = parseInt(programId, 10);
    if (isNaN(parsedProgramId)) {
      return res.status(400).json({ error: 'Invalid program ID format' });
    }
    
    // Use a raw query to get students by program and school efficiently
    const query = `
      SELECT u.id, u.ime, u.prezime, u.email 
      FROM "User" u 
      JOIN "UserProgram" up ON u.id = up."userId" 
      WHERE u."isStudent" = true 
      AND u."schoolId" = ? 
      AND up."programId" = ? 
      ORDER BY u.prezime ASC
    `;
    
    const [students] = await sequelize.query(query, {
      replacements: [schoolId, parsedProgramId],
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`Found ${students ? students.length : 0} students in program ${programId}`);
    
    return res.json(students || []);
  } catch (error) {
    console.error('Error fetching students by program:', error);
    res.status(500).json({ 
      error: 'Error fetching students by program',
      details: error.message
    });
  }
};

module.exports = {
  getAllStudents,
  getTheoryStudents,
  getStudentsByProgram
}; 