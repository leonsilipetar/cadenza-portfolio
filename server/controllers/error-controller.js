const nodemailer = require('nodemailer');
const { ErrorReport, User, Mentor } = require('../models');
const { Op, fn, col } = require('sequelize');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendErrorReport = async (req, res) => {
  try {
    const { errorData } = req.body;

    // Determine which ID to use based on role
    const reportData = {
      category: errorData.category,
      subcategory: errorData.subcategory,
      description: errorData.description,
      steps: errorData.steps,
      userRole: errorData.userRole,
      userEmail: errorData.userEmail,
      deviceInfo: {
        userAgent: errorData.userAgent,
        url: errorData.url,
        previousUrl: errorData.previousUrl
      }
    };

    // Set the appropriate ID based on role
    if (errorData.userRole === 'Mentor' || errorData.userRole === 'Mentor-Admin') {
      reportData.mentorId = errorData.userId;
    } else {
      reportData.userId = errorData.userId;
    }

    // Store in database
    await ErrorReport.create(reportData);

    const htmlContent = `
      <h2>Cadenza Error Report</h2>
      <p><strong>Category:</strong> ${errorData.category}</p>
      <p><strong>Subcategory:</strong> ${errorData.subcategory}</p>
      <p><strong>Description:</strong> ${errorData.description}</p>
      <p><strong>Steps:</strong> ${errorData.steps || 'N/A'}</p>
      <p><strong>User Role:</strong> ${errorData.userRole}</p>
      <p><strong>User ID:</strong> ${errorData.userId}</p>
      <p><strong>User Email:</strong> ${errorData.userEmail}</p>
      <p><strong>URL:</strong> ${errorData.url}</p>
      <p><strong>Previous URL:</strong> ${errorData.previousUrl}</p>
      <p><strong>User Agent:</strong> ${errorData.userAgent}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ERR_EMAIL_TO,
      subject: 'Cadenza App Error Report',
      html: htmlContent
    });

    res.status(200).json({ message: 'Error report sent successfully' });
  } catch (error) {
    console.error('Error handling error report:', error);
    res.status(500).json({ message: 'Failed to process error report' });
  }
};

const getErrorReportStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total count
    const total = await ErrorReport.count();

    // Get counts by category
    const byCategory = await ErrorReport.findAll({
      attributes: [
        'category',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['category']
    });

    // Get counts by role
    const byRole = await ErrorReport.findAll({
      attributes: [
        'userRole',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['userRole']
    });

    // Get timeline data
    const timeline = await ErrorReport.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    });

    res.json({
      total,
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        label: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
        count: parseInt(cat.get('count'))
      })),
      byRole: byRole.map(role => ({
        role: role.userRole,
        count: parseInt(role.get('count'))
      })),
      timeline: timeline.map(day => ({
        date: day.get('date'),
        count: parseInt(day.get('count'))
      }))
    });
  } catch (error) {
    console.error('Error fetching error report stats:', error);
    res.status(500).json({ message: 'Failed to fetch error report statistics' });
  }
};

module.exports = {
  sendErrorReport,
  getErrorReportStats
};