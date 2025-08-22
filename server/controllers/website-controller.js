const { School, Mentor, Program } = require('../models');
const { Op } = require('sequelize');

/**
 * Get public content for a school's website
 */
const getPublicContent = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Get school information
    const school = await School.findByPk(schoolId, {
      attributes: ['id', 'name', 'street', 'location', 'radnoVrijeme', 'kontaktInfo', 'webOpis', 'webSettings']
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Get programs for this school that are marked to show on web
    const programs = await Program.findAll({
      where: {
        schoolId,
        showOnWeb: true,
        active: true
      },
      attributes: ['id', 'naziv', 'kratakOpis', 'opis', 'tipovi', 'cijena', 'trajanje']
    });
    
    // Get mentors for this school that are marked to show on web
    const mentors = await Mentor.findAll({
      where: {
        schoolId,
        showOnWeb: true
      },
      attributes: ['id', 'ime', 'prezime', 'kratakOpis', 'opis', 'profilePicture'],
      include: [
        {
          model: Program,
          as: 'programs',
          attributes: ['id', 'naziv'],
          through: { attributes: [] }
        }
      ]
    });
    
    return res.status(200).json({
      school,
      programs,
      mentors
    });
    
  } catch (error) {
    console.error('Error fetching public content:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update school website settings
 */
const updateSchoolWebSettings = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { radnoVrijeme, kontaktInfo, webOpis, webSettings, webEnabled } = req.body;
    
    const school = await School.findByPk(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Update school website settings
    const updatedSchool = await school.update({
      radnoVrijeme: radnoVrijeme || school.radnoVrijeme,
      kontaktInfo: kontaktInfo || school.kontaktInfo,
      webOpis: webOpis !== undefined ? webOpis : school.webOpis,
      webSettings: webSettings || school.webSettings,
      webEnabled: webEnabled !== undefined ? webEnabled : school.webEnabled
    });
    
    return res.status(200).json({
      message: 'School website settings updated successfully',
      school: updatedSchool
    });
    
  } catch (error) {
    console.error('Error updating school website settings:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update mentor website visibility and content
 */
const updateMentorWebContent = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { kratakOpis, opis, showOnWeb } = req.body;
    
    const mentor = await Mentor.findByPk(mentorId);
    
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }
    
    // Verify the mentor belongs to user's school
    if (mentor.schoolId !== req.user.schoolId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this mentor' });
    }
    
    // Update mentor web content
    const updatedMentor = await mentor.update({
      kratakOpis: kratakOpis !== undefined ? kratakOpis : mentor.kratakOpis,
      opis: opis !== undefined ? opis : mentor.opis,
      showOnWeb: showOnWeb !== undefined ? showOnWeb : mentor.showOnWeb
    });
    
    return res.status(200).json({
      message: 'Mentor web content updated successfully',
      mentor: updatedMentor
    });
    
  } catch (error) {
    console.error('Error updating mentor web content:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update program website visibility and content
 */
const updateProgramWebContent = async (req, res) => {
  try {
    const { programId } = req.params;
    const { kratakOpis, opis, showOnWeb } = req.body;
    
    const program = await Program.findByPk(programId);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    // Verify the program belongs to user's school
    if (program.schoolId !== req.user.schoolId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this program' });
    }
    
    // Update program web content
    const updatedProgram = await program.update({
      kratakOpis: kratakOpis !== undefined ? kratakOpis : program.kratakOpis,
      opis: opis !== undefined ? opis : program.opis,
      showOnWeb: showOnWeb !== undefined ? showOnWeb : program.showOnWeb
    });
    
    return res.status(200).json({
      message: 'Program web content updated successfully',
      program: updatedProgram
    });
    
  } catch (error) {
    console.error('Error updating program web content:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all website content for admin panel
 */
const getWebsiteAdminContent = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Verify user has access to this school
    if (schoolId != req.user.schoolId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this school' });
    }
    
    // Get school information
    const school = await School.findByPk(schoolId, {
      attributes: ['id', 'name', 'street', 'location', 'radnoVrijeme', 'kontaktInfo', 'webOpis', 'webEnabled', 'webSettings']
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Get all programs for this school (both visible and hidden)
    const programs = await Program.findAll({
      where: {
        schoolId,
        active: true
      },
      attributes: ['id', 'naziv', 'kratakOpis', 'opis', 'showOnWeb', 'tipovi', 'cijena', 'trajanje']
    });
    
    // Get all mentors for this school (both visible and hidden)
    const mentors = await Mentor.findAll({
      where: {
        schoolId
      },
      attributes: ['id', 'ime', 'prezime', 'kratakOpis', 'opis', 'showOnWeb', 'profilePicture'],
      include: [
        {
          model: Program,
          as: 'programs',
          attributes: ['id', 'naziv'],
          through: { attributes: [] }
        }
      ]
    });
    
    return res.status(200).json({
      school,
      programs,
      mentors
    });
    
  } catch (error) {
    console.error('Error fetching website admin content:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPublicContent,
  updateSchoolWebSettings,
  updateMentorWebContent,
  updateProgramWebContent,
  getWebsiteAdminContent
}; 