const { Mentor, User, Program, Schedule, School, Raspored, RasporedTeorija, Classroom } = require('../models');
const asyncWrapper = require("../middleware/asyncWrapper.js");
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const Notification = require('../models/notification');
const { sequelize } = require('../models');
const { createRasporedNotification } = require('./notification-controller');

// Controller for mentor signup
const signupMentor = asyncWrapper(async (req, res) => {
  try {
    const {
      korisnickoIme,
      email,
      programs,
      program,
      isAdmin,
      isMentor = true,
      isStudent = false,
      oib,
      ime,
      prezime,
      brojMobitela,
      datumRodjenja,
      adresa,
      napomene,
      students,
      school: schoolData,
    } = req.body;

    // Check if mentor already exists
    const existingMentor = await Mentor.findOne({
      where: { email }
    });

    if (existingMentor) {
      return res.status(400).json({ message: 'Mentor već postoji!' });
    }

    // Generate random password
    const passwordLength = 8;
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPassword = Array.from({ length: passwordLength }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Get school - handle both ID and name like DodajMentora
    let school;
    if (schoolData) {
      // Try to find by ID first (if it's a number)
      if (!isNaN(schoolData)) {
        school = await School.findByPk(schoolData);
      }
      // If not found by ID or schoolData is not a number, try to find by name
      if (!school) {
        school = await School.findOne({
          where: { name: schoolData }
        });
      }
    }

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Create mentor with transaction
    const mentor = await sequelize.transaction(async (t) => {
      const newMentor = await Mentor.create({
        korisnickoIme: korisnickoIme || `${ime.toLowerCase()}.${prezime.toLowerCase()}`,
        email,
        password: hashedPassword,
        ime,
        prezime,
        oib: oib || null,
        brojMobitela: brojMobitela || null,
        datumRodjenja: datumRodjenja || null,
        adresa: adresa || {
          ulica: null,
          kucniBroj: null,
          mjesto: null
        },
        isAdmin: isAdmin || false,
        isMentor: true,
        isStudent: false,
        napomene: napomene || [],
        schoolId: school.id,
        studentId: students || [],
      }, { transaction: t });

      // Handle programs - support both arrays and single program
      let programsToAssociate = [];
      if (programs && Array.isArray(programs) && programs.length > 0) {
        programsToAssociate = programs;
      } else if (program) {
        programsToAssociate = [program];
      }

      if (programsToAssociate.length > 0) {
        const programInstances = await Program.findAll({
          where: { id: programsToAssociate },
          transaction: t
        });

        if (programInstances.length > 0) {
          await newMentor.setPrograms(programInstances, { transaction: t });
        }
      }

      return newMentor;
    });

    // Fetch mentor with all associations
    const mentorWithAssociations = await Mentor.findByPk(mentor.id, {
      include: [
        {
          model: School,
          as: 'school'
        },
        {
          model: Program,
          as: 'programs'
        }
      ]
    });

    // Send password email
    await sendPasswordEmail(email, randomPassword);

    res.status(201).json({
      message: 'Mentor created successfully, password sent to email.',
      mentor: mentorWithAssociations
    });

  } catch (error) {
    console.error('Error creating mentor:', error);
    res.status(500).json({
      message: 'Error creating mentor',
      error: error.message
    });
  }
});


const sendPasswordEmail = async (email, password) => {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER, // Use environment variable
        pass: process.env.EMAIL_PASS, // Use environment variable
      },
      secureOptions: 'TLSv1_2',
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Use environment variable
      to: email,
      subject: 'Dobrodošli u MAI - Cadenza platformu - Detalji vašeg računa',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
        <!-- Header section with logo -->
        <div style="text-align: center;">
          <img src="https://cadenza.com.hr/logo512.png" alt="MAI - Cadenza Logo" style="max-width: 150px;" />
          <h1 style="color: rgb(252, 163, 17); font-size: 24px;">Dobrodošli u MAI - Cadenza!</h1>
        </div>

        <!-- Email introduction -->
        <p>Poštovani,</p>
        <p>Radujemo se što vas možemo pozdraviti na Cadenza platformi. Vaš korisnički račun je uspješno stvoren, a ovdje su vaši podaci za prijavu:</p>

        <!-- Highlighted user details -->
        <div style="border: 1px solid #ddd; padding: 10px; background-color: #fff8e6; margin-bottom: 20px;">
          <p><strong>E-mail adresa:</strong> ${email}</p>
          <p><strong>Lozinka:</strong> ${password}</p>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; background-color: #fff8e6; margin-bottom: 20px;">
        <p><strong>Za najbolje iskustvo korištenja preporučujemo prijavu preko Google Chrome preglednika te instaliranje aplikacije klikom na gumb instaliraj!</strong></p>
      </div>

        <!-- Call to action button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://cadenza.com.hr/login" style="
            background-color: rgb(252, 163, 17);
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            transition: background-color 0.3s ease;
            ">Posjetite našu aplikaciju</a>
        </div>

        <!-- Support and closing -->
          <p>Molimo vas da čuvate ove informacije i ne dijelite lozinku. Ako imate bilo kakvih pitanja ili nedoumica, slobodno se obratite na adresu za podršku: <a href="mailto:app.info.cadenza@gmail.com">app.info.cadenza@gmail.com</a>.</p>

        <p>S poštovanjem,<br />MAI - Cadenza</p>
      </div>

      <!-- Styling for hover effect -->
      <style>
        a:hover {
          background-color: rgba(252, 163, 17, 0.8);
        }
      </style>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

// Get all mentors
const getMentori = asyncWrapper(async (req, res) => {
    const { schoolId } = req.query;

    // Base where clause to ensure we get mentors
    const where = {
        isMentor: true
    };

    // Add schoolId filter if provided
    if (schoolId) {
        where.schoolId = schoolId;
    }

    const mentors = await Mentor.findAll({
        where,
        attributes: ['id', 'korisnickoIme', 'email', 'isAdmin', 'isMentor', 'isStudent', 'oib'],
        limit: 30
    });

    res.json(mentors);
});

// Update mentor details
const updateDetaljiMentora = async (req, res) => {
  try {
    const mentorId = parseInt(req.params.korisnikId);
    const updateData = req.body;
    const mentor = await Mentor.findByPk(mentorId);

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Extract and validate IDs
    const programIds = Array.isArray(updateData.programs)
      ? updateData.programs
          .map(p => typeof p === 'object' && p.id ? parseInt(p.id) : parseInt(p))
          .filter(id => !isNaN(id))
      : [];

    const newStudentIds = Array.isArray(updateData.studentId)
      ? updateData.studentId
          .map(id => parseInt(id))
          .filter(id => !isNaN(id))
      : [];

    await sequelize.transaction(async (t) => {
      // Update basic mentor fields
      await mentor.update({
        korisnickoIme: updateData.korisnickoIme,
        email: updateData.email,
        ime: updateData.ime,
        prezime: updateData.prezime,
        oib: updateData.oib,
        brojMobitela: updateData.brojMobitela,
        datumRodjenja: updateData.datumRodjenja && updateData.datumRodjenja !== 'Invalid date' ? updateData.datumRodjenja : null,
        adresa: typeof updateData.adresa === 'string'
          ? JSON.parse(updateData.adresa)
          : updateData.adresa || {},
        isAdmin: Boolean(updateData.isAdmin),
        isMentor: true,
        isStudent: Boolean(updateData.isStudent),
        napomene: typeof updateData.napomene === 'string'
          ? updateData.napomene.split(',').filter(Boolean)
          : Array.isArray(updateData.napomene)
            ? updateData.napomene
            : [],
        schoolId: updateData.schoolId || mentor.schoolId, // Keep existing schoolId if not provided
        studentId: newStudentIds
      }, { transaction: t });

      // Update programs
      if (programIds.length > 0) {
        await mentor.setPrograms(programIds, { transaction: t });
      }

      // Get all students that currently have this mentor in their mentorId array
      const studentsWithMentor = await User.findAll({
        where: {
          mentorId: {
            [Op.contains]: [mentorId]
          }
        },
        transaction: t
      });

      // Remove this mentor from students that shouldn't have it
      for (const student of studentsWithMentor) {
        if (!newStudentIds.includes(student.id)) {
          const updatedMentorIds = (student.mentorId || []).filter(id => id !== mentorId);
          await student.update({
            mentorId: updatedMentorIds
          }, { transaction: t });
        }
      }

      // Add mentor to new students
      for (const studentId of newStudentIds) {
        const student = await User.findByPk(studentId, { transaction: t });
        if (student) {
          const currentMentorIds = Array.isArray(student.mentorId) ? student.mentorId : [];
          if (!currentMentorIds.includes(mentorId)) {
            await student.update({
              mentorId: [...currentMentorIds, mentorId]
            }, { transaction: t });
          }
        }
      }
    });

    // Fetch updated mentor with associations
    const updatedMentor = await Mentor.findByPk(mentorId, {
      include: [
        { model: School, as: 'school' },
        { model: Program, as: 'programs' }
      ]
    });

    res.json(updatedMentor);
  } catch (error) {
    console.error('Error updating mentor details:', error);
    res.status(500).json({
      message: 'Error updating mentor details',
      error: error.message
    });
  }
};

// Get mentor's students
const getMentorStudents = asyncWrapper(async (req, res) => {
  const mentorId = req.params.id;

  const mentor = await Mentor.findByPk(mentorId);
  if (!mentor) {
    return res.status(404).json({ message: 'Mentor not found' });
  }

  // Get students associated with this mentor through MentorStudent table
  const students = await User.findAll({
    include: [{
      model: Mentor,
      as: 'mentors',
      where: { id: mentorId },
      attributes: []
    }],
    attributes: ['id', 'ime', 'prezime', 'adresa', 'oib', 'email']
  });

  const formattedStudents = students.map(student => ({
    ucenikId: student.id,
    ime: student.ime,
    prezime: student.prezime,
    adresa: student.adresa,
    oib: student.oib,
    email: student.email
  }));

  res.json({ students: formattedStudents });
});

// Get schedules for all mentor's students
const getStudentsRaspored = asyncWrapper(async (req, res) => {
  const mentorId = req.params.id;

  try {
    // First get the mentor to get their studentId array
    const mentor = await Mentor.findByPk(mentorId);
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Get students using the studentId array from mentor
    const students = await User.findAll({
      where: {
        id: mentor.studentId
      },
      attributes: ['id', 'ime', 'prezime']
    });

    if (!students.length) {
      return res.json({ students: [], schedule: {} });
    }

    // Get all schedules for these students
    const schedules = await Raspored.findAll({
      where: {
        ucenikId: mentor.studentId
      }
    });

    // Format students list
    const formattedStudents = students.map(student => ({
      ucenikId: student.id,
      ime: student.ime,
      prezime: student.prezime
    }));

    // Combine schedules
    const combinedSchedule = {
      pon: [], uto: [], sri: [], cet: [], pet: [], sub: []
    };

    schedules.forEach(schedule => {
      const student = students.find(s => s.id === schedule.ucenikId);
      const studentName = student ? `${student.ime} ${student.prezime}` : 'Unknown Student';

      ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].forEach(day => {
        if (schedule[day] && schedule[day].length > 0) {
          const slotsWithStudent = schedule[day].map(slot => ({
            ...slot,
            studentName
          }));
          combinedSchedule[day].push(...slotsWithStudent);
        }
      });
    });

    res.json({
      students: formattedStudents,
      schedule: combinedSchedule
    });

  } catch (error) {
    console.error('Error fetching students schedules:', error);
    res.status(500).json({ message: 'Error fetching schedules', error: error.message });
  }
});

// Get a single student's schedule
const getStudentRaspored = asyncWrapper(async (req, res) => {
  const studentId = req.params.id;

  try {
    // Get student with their schedule in a single query
    const student = await User.findByPk(studentId, {
      attributes: ['id', 'ime', 'prezime', 'rasporedId', 'hasUnpaidInvoice'],
      include: [{
        model: Raspored,
        as: 'raspored'
      }]
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    let schedule = student.raspored;

    if (!schedule) {
      // Create empty schedule and associate it with student
      schedule = await sequelize.transaction(async (t) => {
        const newSchedule = await Raspored.create({
          ucenikId: studentId,
          pon: [],
          uto: [],
          sri: [],
          cet: [],
          pet: [],
          sub: []
        }, { transaction: t });

        // Important: Update the student's rasporedId
        await student.update({
          rasporedId: newSchedule.id
        }, { transaction: t });

        return newSchedule;
      });
    }

    // Ensure schedule days are arrays
    const formattedSchedule = {
      pon: Array.isArray(schedule.pon) ? schedule.pon : [],
      uto: Array.isArray(schedule.uto) ? schedule.uto : [],
      sri: Array.isArray(schedule.sri) ? schedule.sri : [],
      cet: Array.isArray(schedule.cet) ? schedule.cet : [],
      pet: Array.isArray(schedule.pet) ? schedule.pet : [],
      sub: Array.isArray(schedule.sub) ? schedule.sub : []
    };

    res.json({
      student: {
        id: student.id,
        ime: student.ime,
        prezime: student.prezime,
        hasUnpaidInvoice: student.hasUnpaidInvoice
      },
      schedule: formattedSchedule
    });

  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({
      message: 'Error fetching student schedule',
      error: error.message
    });
  }
});

const getDetaljiMentora= async (req, res) => {
  try {
    const userId = req.params.korisnikId;
    const user =  await Mentor.findByPk(userId, {
      include: [
        {
          model: School,
          as: 'school'
        },
        {
          model: Program,
          as: 'programs',
          through: { attributes: [] }
        }
      ]
    });


    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
};


const getOsnovniDetaljiMentora = async (req, res) => {
  try {
    const userId = req.params.korisnikId;
    const user = await Mentor.findByPk(userId, {
      attributes: ['id', 'ime', 'prezime', 'profilePicture']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add hasProfilePicture flag based on whether profilePicture exists
    const hasProfilePicture = user.profilePicture !== null;

    res.status(200).json({
      id: user.id,
      ime: user.ime,
      prezime: user.prezime,
      hasProfilePicture
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
};

const getOsnovniDetaljiJednogMentora = async (req, res) => {
  try {
    const userId = req.params.korisnikId;
    const user = await Mentor.findByPk(userId, {
      attributes: ['id', 'ime', 'prezime', 'hasProfilePicture']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      message: 'Error fetching user details',
      error: error.message
    });
  }
};
// Add schedule slots to student
const addScheduleToStudent = asyncWrapper(async (req, res) => {
  try {
    const { raspored} = req.body;
    const studentId = req.params.id;
    const mentorId = req.user.id;

    if (!studentId || !raspored || !Array.isArray(raspored) || !mentorId) {
      return res.status(400).json({
        message: 'Missing required fields or invalid format',
        received: { studentId, raspored, mentorId }
      });
    }

    // Use transaction to ensure data consistency
    await sequelize.transaction(async (t) => {
      // First find the user and their schedule in a single query
      const user = await User.findByPk(studentId, {
        include: [{
          model: Raspored,
          as: 'raspored'
        }],
        transaction: t
      });

      if (!user) {
        return res.status(404).json({
          message: 'Student not found'
        });
      }

      let schedule;

      if (user.raspored) {
        // Use existing schedule
        schedule = user.raspored;
        // Update schoolId if not set
        if (!schedule.schoolId) {
          schedule.schoolId = user.schoolId;
          await schedule.save({ transaction: t });
        }
      } else {
        // Create new schedule
        schedule = await Raspored.create({
          ucenikId: studentId,
          schoolId: user.schoolId, // Use student's schoolId
          pon: [], uto: [], sri: [], cet: [], pet: [], sub: []
        }, { transaction: t });

        // Update user with new schedule ID
        await user.update({
          rasporedId: schedule.id
        }, { transaction: t });
      }

      // Update the schedule for each day with generated IDs
      const updatedDays = {};
      raspored.forEach(termin => {
        const day = termin.day;
        if (!updatedDays[day]) {
          updatedDays[day] = [];
        }
        // Ensure each term has an id and required fields
        const termWithId = {
          ...termin,
          id: termin.id || Date.now() + Math.floor(Math.random() * 10000),
          vrijeme: termin.vrijeme,
          dvorana: termin.dvorana,
          mentor: termin.mentor || '',
          duration: termin.duration || 45
        };
        updatedDays[day].push(termWithId);
      });

      // Update only the days that have new terms
      for (const [day, terms] of Object.entries(updatedDays)) {
        const existingTerms = schedule[day] || [];
        // Combine existing and new terms, preserving existing IDs
        const combinedTerms = [...existingTerms];

        terms.forEach(newTerm => {
          // Check if there's already a term at this time and dvorana
          const existingIndex = combinedTerms.findIndex(
            et => et.vrijeme === newTerm.vrijeme && et.dvorana === newTerm.dvorana
          );

          if (existingIndex >= 0) {
            // Update existing term but preserve its id
            combinedTerms[existingIndex] = {
              ...newTerm,
              id: combinedTerms[existingIndex].id
            };
          } else {
            // Add new term with its generated id
            combinedTerms.push(newTerm);
          }
        });

        schedule[day] = combinedTerms;
      }

      await schedule.save({ transaction: t });

      // Get the mentor's name for the notification
      const mentor = await Mentor.findByPk(mentorId, {
        attributes: ['ime', 'prezime'],
        transaction: t
      });

      // Create notification for schedule update
      await createRasporedNotification(schedule, mentor, [user]);

      // Format response to match teorija format
      const dayTerms = raspored[0]?.day ? schedule[raspored[0].day] : [];

      res.status(200).json({
        message: 'Schedule updated successfully',
        raspored: {
          ...schedule.toJSON(),
          pon: schedule.pon || [],
          uto: schedule.uto || [],
          sri: schedule.sri || [],
          cet: schedule.cet || [],
          pet: schedule.pet || [],
          sub: schedule.sub || []
        },
        terms: dayTerms
      });
    });

  } catch (error) {
    console.error('Error adding schedule to student:', error);
    res.status(500).json({
      message: 'Error adding schedule to student',
      error: error.message
    });
  }
});

// Delete schedule slot
const deleteRaspored = asyncWrapper(async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { day, terminId } = req.query;

    console.log('Delete params:', { studentId, day, terminId });

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        message: 'Invalid student ID'
      });
    }

    // Find the student's schedule
    const schedule = await Raspored.findOne({
      where: { ucenikId: studentId }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Get current day's schedule
    let daySchedule = schedule[day] || [];

    if (!Array.isArray(daySchedule)) {
      return res.status(400).json({ message: `Invalid schedule format for ${day}` });
    }

    // Remove the specific term
    const updatedDaySchedule = daySchedule.filter(term =>
      term._id?.toString() !== terminId?.toString() &&
      term.id?.toString() !== terminId?.toString()
    );

    // Update the specific day's schedule using Sequelize's JSONB update
    await Raspored.update(
      { [day]: updatedDaySchedule },
      {
        where: { ucenikId: studentId },
        returning: true
      }
    );

    // Get the updated schedule
    const updatedSchedule = await Raspored.findOne({
      where: { ucenikId: studentId }
    });

    res.json({
      message: 'Termin deleted successfully',
      schedule: updatedSchedule[day]
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      message: 'Error deleting schedule',
      error: error.message
    });
  }
});

// Function to create a notification
const createNotification = async (userId, mentorId, message) => {
  const notification = new Notification({
    userId,
    mentorId,
    message,
    date: new Date(),
    unread: true, // Set as unread by default
  });

  await notification.save();
};

// Example usage in the update schedule function
const updateSchedule = async (req, res) => {
  // ... existing code to update the schedule

  // Create a notification for the student
  await createNotification(studentId, mentorId, `Mentor ${mentorName} has updated your schedule to ${newTime}.`);

  res.status(200).json({ message: 'Schedule updated successfully' });
};

// Get classroom schedule for a specific day
const getClassroomSchedule = asyncWrapper(async (req, res) => {
  try {
    const { day, classroomId } = req.params;
    const { week } = req.query;
    const schoolId = req.user.schoolId;

    // Get classroom and verify it belongs to user's school
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        schoolId: schoolId
      }
    });

    if (!classroom) {
      return res.status(404).json({
        message: 'Classroom not found or unauthorized'
      });
    }

    // Validate day parameter
    const validDays = ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'];
    if (!validDays.includes(day)) {
      return res.status(400).json({
        message: 'Invalid day parameter'
      });
    }

    // Get all schedules and teoria schedules for this school
    const [schedules, teoriaSchedules] = await Promise.all([
      Raspored.findAll({
        where: { schoolId }
      }),
      RasporedTeorija.findAll({
        where: { schoolId }
      })
    ]);

    const classroomSlots = [];

    // Process regular schedules
    schedules.forEach(schedule => {
      if (schedule[day] && Array.isArray(schedule[day])) {
        schedule[day].forEach(slot => {
          if (slot.dvorana === classroom.name) {
            // Only include slots that match the week type or have null week type
            if (!week || !slot.week || slot.week === week) {
              classroomSlots.push({
                id: slot._id || slot.id || Date.now() + Math.random(),
                vrijeme: slot.vrijeme,
                duration: slot.duration || 45,
                dvorana: slot.dvorana,
                type: 'učenik',
                mentor: slot.mentor || '',
                schoolId: schoolId,
                week: slot.week
              });
            }
          }
        });
      }
    });

    // Process teoria schedules
    teoriaSchedules.forEach(teoriaSchedule => {
      if (teoriaSchedule[day] && Array.isArray(teoriaSchedule[day])) {
        teoriaSchedule[day].forEach(slot => {
          if (slot.dvorana === classroom.name) {
            // Only include slots that match the week type or have null week type
            if (!week || !slot.week || slot.week === week) {
              classroomSlots.push({
                id: slot.id || slot._id || Date.now() + Math.random(),
                vrijeme: slot.vrijeme,
                duration: slot.duration || 45,
                dvorana: slot.dvorana,
                type: 'teorija',
                mentor: slot.mentor || '',
                schoolId: schoolId,
                week: slot.week
              });
            }
          }
        });
      }
    });

    // Sort slots by time
    classroomSlots.sort((a, b) => {
      const timeA = parseInt(a.vrijeme.split(':')[0]);
      const timeB = parseInt(b.vrijeme.split(':')[0]);
      if (timeA === timeB) {
        const minsA = parseInt(a.vrijeme.split(':')[1]);
        const minsB = parseInt(b.vrijeme.split(':')[1]);
        return minsA - minsB;
      }
      return timeA - timeB;
    });

    res.json(classroomSlots);

  } catch (error) {
    console.error('Error fetching classroom schedule:', error);
    res.status(500).json({
      message: 'Error fetching classroom schedule',
      error: error.message
    });
  }
});

// Update mentor programs
const updateMentorPrograms = asyncWrapper(async (req, res) => {
  try {
    const { id } = req.params;
    const { programIds } = req.body;

    const mentor = await Mentor.findByPk(id);
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    await sequelize.transaction(async (t) => {
      // Find all programs
      const programs = await Program.findAll({
        where: { id: programIds },
        transaction: t
      });

      // Set the programs (this will remove old associations and create new ones)
      await mentor.setPrograms(programs, { transaction: t });
    });

    // Fetch updated mentor with associations
    const updatedMentor = await Mentor.findByPk(id, {
      include: [
        {
          model: Program,
          as: 'programs'
        }
      ]
    });

    res.json({
      message: 'Mentor programs updated successfully',
      mentor: updatedMentor
    });

  } catch (error) {
    console.error('Error updating mentor programs:', error);
    res.status(500).json({
      message: 'Error updating mentor programs',
      error: error.message
    });
  }
});

// Add this function to clean up duplicate schedules
const cleanupDuplicateSchedules = asyncWrapper(async (req, res) => {
  try {
    const duplicates = await Raspored.findAll({
      attributes: ['userId', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['userId'],
      having: sequelize.literal('COUNT(*) > 1')
    });

    for (const duplicate of duplicates) {
      const schedules = await Raspored.findAll({
        where: { userId: duplicate.userId },
        order: [['createdAt', 'DESC']] // Keep the most recent one
      });

      // Merge all schedules into the most recent one
      const mergedSchedule = schedules[0];
      for (let i = 1; i < schedules.length; i++) {
        const oldSchedule = schedules[i];
        ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].forEach(day => {
          if (oldSchedule[day] && oldSchedule[day].length > 0) {
            mergedSchedule[day] = [...(mergedSchedule[day] || []), ...oldSchedule[day]];
          }
        });
        await oldSchedule.destroy(); // Delete the duplicate
      }

      // Sort each day's schedule by time
      ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].forEach(day => {
        if (mergedSchedule[day]) {
          mergedSchedule[day].sort((a, b) => {
            const timeA = parseInt(a.vrijeme);
            const timeB = parseInt(b.vrijeme);
            return timeA - timeB;
          });
        }
      });

      await mergedSchedule.save();
    }

    res.json({ message: 'Duplicate schedules cleaned up successfully' });
  } catch (error) {
    console.error('Error cleaning up duplicate schedules:', error);
    res.status(500).json({
      message: 'Error cleaning up duplicate schedules',
      error: error.message
    });
  }
});

// Get all student schedules
const getAllStudentSchedules = asyncWrapper(async (req, res) => {
  try {
    // Get all students
    const students = await User.findAll({
      where: {
        isStudent: true
      },
      attributes: ['id', 'ime', 'prezime']
    });

    if (!students.length) {
      return res.json([]);
    }

    // Get all schedules
    const schedules = await Raspored.findAll();

    // Format the schedules with student names
    const formattedSchedules = schedules.map(schedule => {
      const student = students.find(s => s.id === schedule.ucenikId);
      const studentName = student ? `${student.ime} ${student.prezime}` : 'Unknown Student';

      return {
        id: schedule.id,
        ucenikId: schedule.ucenikId,
        ucenik_ime: student?.ime,
        ucenik_prezime: student?.prezime,
        pon: schedule.pon || [],
        uto: schedule.uto || [],
        sri: schedule.sri || [],
        cet: schedule.cet || [],
        pet: schedule.pet || [],
        sub: schedule.sub || []
      };
    });

    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching all student schedules:', error);
    res.status(500).json({ message: 'Error fetching schedules', error: error.message });
  }
});

const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const mentor = await Mentor.findOne({ where: { email } });
    res.json({ exists: !!mentor });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ message: 'Error checking email' });
  }
};

// Export the controller
module.exports = {
    signupMentor,
    getMentori,
    updateDetaljiMentora,
    getMentorStudents,
    getStudentsRaspored,
    getStudentRaspored,
    addScheduleToStudent,
    deleteRaspored,
    getDetaljiMentora,
    getClassroomSchedule,
    updateMentorPrograms,
    cleanupDuplicateSchedules,
    getOsnovniDetaljiMentora,
    getAllStudentSchedules,
    getOsnovniDetaljiJednogMentora,
    checkEmail
};