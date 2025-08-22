const express = require('express');
const router = express.Router();
const websiteController = require('../controllers/website-controller');
const { verifyToken } = require('../controllers/user-controller');

// Public routes - no authentication required
// Get public content for a school's website
router.get('/public/:schoolId', websiteController.getPublicContent);

// Protected routes - authentication required
// Get all website content for admin panel
router.get('/admin/:schoolId', verifyToken, websiteController.getWebsiteAdminContent);

// Update school website settings
router.put('/admin/school/:schoolId', verifyToken, websiteController.updateSchoolWebSettings);

// Update mentor website content
router.put('/admin/mentor/:mentorId', verifyToken, websiteController.updateMentorWebContent);

// Update program website content
router.put('/admin/program/:programId', verifyToken, websiteController.updateProgramWebContent);

module.exports = router; 