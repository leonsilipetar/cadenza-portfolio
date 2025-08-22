const { Enrollment, User, School, Program, Mentor, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncWrapper = require('../middleware/asyncWrapper');

// Helper to get current school year (e.g. '2024/2025')
function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // School year typically starts in September (month 9)
  // If we're in months 9-12, we're in the current year's school year
  // If we're in months 1-8, we're in the previous year's school year
  let schoolYear;
  if (month >= 9) {
    // September onwards: current year / next year
    schoolYear = `${year}/${year + 1}`;
  } else {
    // January to August: previous year / current year
    schoolYear = `${year - 1}/${year}`;
  }
  
  return schoolYear;
}

// Helper to get enrollment school year (for enrollment checking)
function getEnrollmentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // For enrollment purposes:
  // - Months 6-8 (June-August): Check enrollment for upcoming school year
  // - Months 9-12 (September-December): Check enrollment for current school year
  // - Months 1-5 (January-May): Check enrollment for current school year
  let schoolYear;
  if (month >= 6 && month <= 8) {
    // June-August: Check enrollment for upcoming school year
    schoolYear = `${year}/${year + 1}`;
  } else {
    // September-May: Check enrollment for current school year
    if (month >= 9) {
      schoolYear = `${year}/${year + 1}`;
    } else {
      schoolYear = `${year - 1}/${year}`;
    }
  }
  
  return schoolYear;
}

// 1. Get current user's enrollment for the current year
exports.getCurrentEnrollment = asyncWrapper(async (req, res) => {
  
  const userId = req.user.id;
  const schoolYear = getEnrollmentSchoolYear();
  
  try {
    const enrollment = await Enrollment.findOne({
      where: { userId, schoolYear },
      include: [
        { model: School, as: 'school' },
        { model: Program, as: 'program' },
        { model: Mentor, as: 'mentor' }
      ]
    });
    
    res.json({ enrollment, schoolYear });
  } catch (error) {
    console.error('📋 Error in getCurrentEnrollment:', error);
    throw error;
  }
});

// Get enrollment statistics for admin dashboard
exports.getEnrollmentStats = asyncWrapper(async (req, res) => {
  try {
    const { schoolId } = req.query;
    const schoolYear = getCurrentSchoolYear();
    
    // Build where clause based on schoolId
    const whereClause = { schoolYear };
    if (schoolId) {
      whereClause.schoolId = schoolId;
    }
    
    // Get active enrollments (accepted and active)
    const activeEnrollments = await Enrollment.count({
      where: {
        ...whereClause,
        agreementAccepted: true,
        active: true
      }
    });
    
    // Get pending enrollments (not yet accepted)
    const pendingEnrollments = await Enrollment.count({
      where: {
        ...whereClause,
        agreementAccepted: false
      }
    });

    res.json({
      activeEnrollments,
      pendingEnrollments,
      schoolYear
    });
  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    throw error;
  }
});

// 2. Accept/confirm enrollment for the current year
exports.acceptEnrollment = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const schoolYear = getEnrollmentSchoolYear();
  const agreementText = req.body.agreementText || '';
  const requestedProgramId = req.body.programId; // Get programId from request body
  
  // Resolve schoolId robustly: prefer token, then request body, then DB, then selected program
  let effectiveSchoolId = req.user?.schoolId || req.body.schoolId || null;
  let dbUser = null;
  let requestedProgram = null;
  if (requestedProgramId) {
    requestedProgram = await Program.findByPk(requestedProgramId);
    if (!requestedProgram) {
      return res.status(400).json({ success: false, message: 'Selected program not found' });
    }
    // If user already has a school and it mismatches the program's school, reject
    if (effectiveSchoolId && String(effectiveSchoolId) !== String(requestedProgram.schoolId)) {
      return res.status(400).json({ success: false, message: 'Invalid program selected or program does not belong to your school' });
    }
    // If school not known yet, use the program's school
    if (!effectiveSchoolId) {
      effectiveSchoolId = requestedProgram.schoolId;
    }
  }

  if (!effectiveSchoolId) {
    dbUser = await User.findByPk(userId, { include: [{ model: School, as: 'school' }, { model: Program, as: 'programs' }] });
    effectiveSchoolId = dbUser?.schoolId || dbUser?.school?.id || null;
  }

  // Robustno dohvaćanje programId i mentorId
  let programId = null;
  
  // Priority: 1. Requested programId, 2. User's current program, 3. User's programs array (token), 4. DB user's programs
  if (requestedProgramId) {
    // At this point requestedProgram is loaded and effectiveSchoolId aligned
    programId = requestedProgramId;
  } else if (req.user.programId) {
    programId = req.user.programId;
  } else if (Array.isArray(req.user.programs) && req.user.programs.length > 0) {
    programId = req.user.programs[0].id;
  } else if (!programId && !dbUser) {
    // As a last resort, fetch from DB if not already loaded
    dbUser = await User.findByPk(userId, { include: [{ model: Program, as: 'programs' }] });
    if (Array.isArray(dbUser?.programs) && dbUser.programs.length > 0) {
      programId = dbUser.programs[0].id;
    }
  }

  // If still no effectiveSchoolId, try to derive from chosen program
  if (!effectiveSchoolId && programId) {
    const p = requestedProgram || (await Program.findByPk(programId));
    if (p) {
      effectiveSchoolId = p.schoolId;
    }
  }

  if (!effectiveSchoolId) {
    // As a last fallback, try to use any existing enrollment to determine school
    const anyEnrollment = await Enrollment.findOne({ where: { userId }, order: [['createdAt', 'DESC']] });
    if (anyEnrollment?.schoolId) {
      effectiveSchoolId = anyEnrollment.schoolId;
    }
  }

  if (!effectiveSchoolId) {
    return res.status(400).json({ success: false, message: 'School not set on user' });
  }

  let mentorId = null;
  if (Array.isArray(req.user.mentorId) && req.user.mentorId.length > 0) {
    mentorId = req.user.mentorId[0];
  } else if (typeof req.user.mentorId === 'number') {
    mentorId = req.user.mentorId;
  }

  // Use database transaction to prevent race conditions
  const result = await sequelize.transaction(async (t) => {
    // Check if enrollment already exists with pessimistic locking
    let enrollment = await Enrollment.findOne({ 
      where: { userId, schoolYear },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!enrollment) {
      // Create new enrollment if not exists
      enrollment = await Enrollment.create({
        userId,
        schoolId: effectiveSchoolId,
        programId: programId || null,
        mentorId: mentorId || null,
        schoolYear,
        agreementAccepted: true,
        agreementAcceptedAt: new Date(),
        agreementTextSnapshot: agreementText,
        active: true
      }, { transaction: t });
    } else if (!enrollment.agreementAccepted) {
      // Update existing enrollment only if not already accepted
      enrollment.agreementAccepted = true;
      enrollment.agreementAcceptedAt = new Date();
      enrollment.agreementTextSnapshot = agreementText;
      enrollment.active = true;
      await enrollment.save({ transaction: t });
    } else {
      // Enrollment already accepted - return existing data
      return { success: true, enrollment, alreadyAccepted: true };
    }

    return { success: true, enrollment, alreadyAccepted: false };
  });

  res.json(result);
});

// 3. Admin: List/filter enrollments for a school year  
exports.listEnrollments = asyncWrapper(async (req, res) => {
  
  const { schoolYear, active, search } = req.query;
  // Use the provided schoolYear or default to current school year
  const targetYear = schoolYear || getCurrentSchoolYear();
  
  try {
    // First, let's see ALL enrollments to debug
    const allEnrollments = await Enrollment.findAll({
      include: [
        { model: User, as: 'user' },
        { model: School, as: 'school' },
        { model: Program, as: 'program' },
        { model: Mentor, as: 'mentor' }
      ]
    });
    
    
    // Now the filtered query
    const enrollments = await Enrollment.findAll({
      where: { 
        schoolYear: targetYear,
        ...(active !== undefined && { active: active === 'true' })
      },
      include: [
        { model: User, as: 'user' },
        { model: School, as: 'school' },
        { model: Program, as: 'program' },
        { model: Mentor, as: 'mentor' }
      ]
    });
    
    res.json({ enrollments });
  } catch (error) {
    console.error('📋 Error in listEnrollments:', error);
    throw error;
  }
});

// 4. Get agreement text (static or from DB)
exports.getAgreementText = asyncWrapper(async (req, res) => {
  // For now, return a static agreement text. You can load from DB or file if needed.
  const agreementText = `
    <h2>Ugovor i Suglasnost</h2>
    <p>Prihvaćanjem ove suglasnosti potvrđujete upis u školsku godinu i prihvaćate sve uvjete.</p>
    <ul>
      <li>Podaci su točni i potpuni.</li>
      <li>Prihvaćate pravila škole i GDPR uvjete.</li>
      <li>Ova potvrda ima pravnu snagu.</li>
    </ul>
  `;
  res.json({ agreementText });
}); 