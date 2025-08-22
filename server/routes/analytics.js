const express = require('express');
const router = express.Router();
const { Analytics, ErrorReport } = require('../models');
const { verifyToken } = require('../controllers/user-controller');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const { fn, col } = require('sequelize');

// Store analytics data
router.post('/analytics', async (req, res) => {
  try {
    console.log('Received analytics data:', req.body);

    const {
      deviceType,
      browser,
      platform,
      language,
      screenWidth,
      screenHeight,
      isPWA,
      isMobile,
      userAgent,
      timestamp
    } = req.body;

    console.log('Creating analytics record with:', {
      device_type: deviceType,
      browser,
      platform,
      language,
      screen_width: screenWidth,
      screen_height: screenHeight,
      is_pwa: isPWA,
      is_mobile: isMobile,
      user_agent: userAgent,
      createdAt: timestamp
    });

    const analyticsRecord = await Analytics.create({
      device_type: deviceType,
      browser,
      platform,
      language,
      screen_width: screenWidth,
      screen_height: screenHeight,
      is_pwa: isPWA,
      is_mobile: isMobile,
      user_agent: userAgent,
      createdAt: timestamp
    });

    console.log('Analytics record created successfully:', analyticsRecord);
    res.status(200).json({ message: 'Analytics data stored successfully' });
  } catch (error) {
    console.error('Detailed error storing analytics:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      error: 'Error storing analytics data',
      details: error.message
    });
  }
});

// Get analytics data (admin only)
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Get total users
    const totalUsers = await Analytics.count({
      distinct: true,
      col: 'user_agent'
    });

    // Get device types distribution
    const deviceTypes = await Analytics.findAll({
      attributes: [
        'device_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['device_type']
    });

    // Get browser distribution
    const browsers = await Analytics.findAll({
      attributes: [
        'browser',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['browser']
    });

    // Get PWA usage
    const pwaUsage = await Analytics.findAll({
      attributes: [
        'is_pwa',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['is_pwa']
    });

    // Get mobile vs desktop
    const mobileUsage = await Analytics.findAll({
      attributes: [
        'is_mobile',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['is_mobile']
    });

    // Get daily usage for last 30 days
    const dailyUsage = await Analytics.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: sequelize.literal("NOW() - INTERVAL '30 days'")
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']]
    });

    // Get error report statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total count of error reports
    const totalErrorReports = await ErrorReport.count();

    // Get counts by category
    const errorsByCategory = await ErrorReport.findAll({
      attributes: [
        'category',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['category']
    });

    // Get counts by role
    const errorsByRole = await ErrorReport.findAll({
      attributes: [
        'userRole',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['userRole']
    });

    // Get timeline data for error reports
    const errorsTimeline = await ErrorReport.findAll({
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
      totalUsers,
      deviceTypes,
      browsers,
      pwaUsage,
      mobileUsage,
      dailyUsage,
      errorReports: {
        total: totalErrorReports,
        byCategory: errorsByCategory.map(cat => ({
          category: cat.category,
          label: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
          count: parseInt(cat.get('count'))
        })),
        byRole: errorsByRole.map(role => ({
          role: role.userRole,
          count: parseInt(role.get('count'))
        })),
        timeline: errorsTimeline.map(day => ({
          date: day.get('date'),
          count: parseInt(day.get('count'))
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error fetching analytics data' });
  }
});

module.exports = router;