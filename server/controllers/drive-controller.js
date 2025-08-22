const asyncWrapper = require('../middleware/asyncWrapper');
const GoogleDriveService = require('../services/google-drive-service');
const { School, Document } = require('../models');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get Google Drive status for a school
const getDriveStatus = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to access this school drive information' });
  }
  
  const school = await School.findByPk(schoolId);
  
  if (!school) {
    return res.status(404).json({ message: 'School not found' });
  }
  
  // Return drive status (without sensitive credentials)
  return res.json({
    driveEnabled: school.driveEnabled,
    driveRootFolderId: school.driveRootFolderId,
    driveSettings: school.driveSettings,
    hasCredentials: !!school.driveCredentials
  });
});

// Initialize Google Drive setup
const initDriveSetup = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { clientId, clientSecret, redirectUri } = req.body;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to initialize drive for this school' });
  }
  
  const school = await School.findByPk(schoolId);
  
  if (!school) {
    return res.status(404).json({ message: 'School not found' });
  }
  
  // Generate OAuth URL with PKCE
  try {
    // Validate input
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ 
        message: 'Missing required parameters',
        details: 'Client ID, Client Secret, and Redirect URI are required'
      });
    }

    const { authUrl, codeVerifier } = await GoogleDriveService.generateAuthUrl(clientId, clientSecret, redirectUri);
    
    // Store client ID, secret, and code verifier temporarily
    await school.update({
      driveSettings: {
        ...school.driveSettings,
        temp: {
          clientId,
          clientSecret,
          redirectUri,
          codeVerifier,
          setupInProgress: true
        }
      }
    });
    
    return res.json({
      authUrl,
      codeVerifier,
      nextStep: 'redirect_user_to_auth_url'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    
    // Handle specific errors
    if (error.message.includes('invalid_client')) {
      return res.status(401).json({
        message: 'Invalid OAuth client credentials',
        details: 'Please check your Client ID and Client Secret in Google Cloud Console. Make sure the OAuth consent screen is configured and the redirect URIs are properly set.',
        technicalDetails: error.message
      });
    }
    
    return res.status(500).json({ 
      message: 'Error initializing Google Drive setup', 
      error: error.message,
      details: 'Please verify your Google Cloud Console configuration and try again.'
    });
  }
});

// Complete Google Drive setup after OAuth
const completeDriveSetup = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { code, codeVerifier } = req.body;
  const currentUser = req.user;

  // Log received values for debugging
  console.log('Drive setup: received from frontend:', { code, codeVerifier });
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to complete drive setup for this school' });
  }
  
  const school = await School.findByPk(schoolId);
  
  if (!school) {
    return res.status(404).json({ message: 'School not found' });
  }
  
  if (!school.driveSettings?.temp?.setupInProgress) {
    return res.status(400).json({ 
      message: 'Drive setup not initiated for this school',
      details: 'Please start the setup process again from the beginning.'
    });
  }
  
  // Exchange code for tokens using PKCE
  try {
    const { clientId, clientSecret, redirectUri } = school.driveSettings.temp;
    
    // Validate required parameters
    if (!code) {
      return res.status(400).json({ 
        message: 'Missing authorization code',
        details: 'Authorization code is required to complete the setup.'
      });
    }
    
    if (!codeVerifier) {
      return res.status(400).json({ 
        message: 'Missing code verifier',
        details: 'Code verifier is required for PKCE flow. Please start the setup process again.'
      });
    }
    
    // Get tokens from Google
    const tokens = await GoogleDriveService.exchangeCodeForTokens(
      clientId, 
      clientSecret, 
      redirectUri,
      code,
      codeVerifier
    );
    
    // Setup drive for school
    const driveService = new GoogleDriveService(schoolId);
    const setupResult = await driveService.setupSchoolDrive(
      schoolId,
      {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        ...tokens
      }
    );
    
    // Setup was successful, remove temp data
    const updatedSettings = { ...school.driveSettings };
    delete updatedSettings.temp;
    
    await school.update({
      driveEnabled: true,
      driveSettings: updatedSettings,
      driveRootFolderId: setupResult.rootFolder.id,
      driveCredentials: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        ...tokens
      }
    });
    
    return res.json(setupResult);
  } catch (error) {
    console.error('Error completing Google Drive setup:', error);
    
    // Handle specific errors
    if (error.message.includes('invalid_client')) {
      return res.status(401).json({
        message: 'Invalid OAuth client credentials',
        details: 'Please check your Client ID and Client Secret in Google Cloud Console.',
        technicalDetails: error.message
      });
    } else if (error.message.includes('invalid_grant')) {
      return res.status(400).json({
        message: 'Invalid or expired authorization code',
        details: 'The authorization code may have expired or been used already. Please try the authorization process again.',
        technicalDetails: error.message
      });
    } else if (error.message.includes('code verifier')) {
      return res.status(400).json({
        message: 'Invalid code verifier',
        details: 'The code verifier is missing or invalid. Please start the setup process again.',
        technicalDetails: error.message
      });
    }
    
    return res.status(500).json({ 
      message: 'Error completing Google Drive setup', 
      error: error.message,
      details: 'Please verify your configuration and try again.'
    });
  }
});

// List files in Google Drive folder
const listFiles = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { folderId } = req.query;
  const currentUser = req.user;
  
  // Check if user belongs to the school
  if (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin) {
    return res.status(403).json({ message: 'Unauthorized to access this school drive' });
  }
  
  try {
    const driveService = new GoogleDriveService(schoolId);
    const files = await driveService.listFiles(folderId);

    // Merge with Document metadata
    const driveFileIds = files.map(f => f.id);
    const documents = await Document.findAll({
      where: { driveFileId: driveFileIds }
    });
    const docMap = {};
    documents.forEach(doc => { docMap[doc.driveFileId] = doc; });
    const mergedFiles = files.map(file => {
      const doc = docMap[file.id];
      return {
        ...file,
        ...(doc ? {
          creatorId: doc.creatorId,
          creatorName: doc.creatorName,
          createdAt: doc.createdAt,
          documentId: doc.id,
          // add more fields as needed
        } : {})
      };
    });
    return res.json(mergedFiles);
  } catch (error) {
    console.error('Error listing files:', error);
    if (error.message && error.message.includes('File not found: .')) {
      // Treat as Drive not connected
      return res.status(403).json({ error: 'drive_not_connected', message: 'Google Drive nije povezan za ovu školu.' });
    }
    return res.status(500).json({ message: 'Error listing files from Google Drive', error: error.message });
  }
});

// Upload file to Google Drive
const uploadFile = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const currentUser = req.user;
  let name, mimeType, folderId, fileBuffer;

  // Support both multipart/form-data and JSON
  if (req.file) {
    // Multer-parsed file
    name = req.body.name || req.file.originalname;
    mimeType = req.body.mimeType || req.file.mimetype;
    folderId = req.body.folderId || '';
    fileBuffer = req.file.buffer;
    console.log('fileBuffer type:', typeof fileBuffer, Buffer.isBuffer(fileBuffer));
  } else {
    // JSON body fallback
    name = req.body.name;
    mimeType = req.body.mimeType;
    folderId = req.body.folderId || '';
    const content = req.body.content;
    if (Array.isArray(content)) {
      fileBuffer = Buffer.from(content);
    } else if (typeof content === 'string') {
      fileBuffer = Buffer.from(content, 'utf8');
    } else {
      return res.status(400).json({ message: 'No file content provided' });
    }
  }

  // Check if user belongs to the school
  if (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin) {
    return res.status(403).json({ message: 'Unauthorized to upload to this school drive' });
  }

  try {
    const driveService = new GoogleDriveService(schoolId);
    const uploadResult = await driveService.uploadFile(name, fileBuffer, mimeType, folderId);

    // Create a document entry in our database
    const document = await Document.create({
      name,
      type: 'file',
      driveFileId: uploadResult.id,
      driveUrl: uploadResult.webViewLink,
      driveIntegrated: true,
      driveThumbnailUrl: uploadResult.thumbnailLink,
      creatorId: currentUser.id,
      creatorName: `${currentUser.ime} ${currentUser.prezime}`,
      schoolId
    });

    return res.json({
      ...uploadResult,
      documentId: document.id
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ message: 'Error uploading file to Google Drive', error: error.message });
  }
});

// Create folder in Google Drive
const createFolder = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { name, parentFolderId } = req.body;
  const currentUser = req.user;
  
  // Check if user belongs to the school
  if (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin) {
    return res.status(403).json({ message: 'Unauthorized to create folder in this school drive' });
  }
  
  try {
    const driveService = new GoogleDriveService(schoolId);
    const folderResult = await driveService.createFolder(name, parentFolderId);
    
    // Create a document entry in our database
    const document = await Document.create({
      name,
      type: 'folder',
      driveFileId: folderResult.id,
      driveUrl: folderResult.webViewLink,
      driveIntegrated: true,
      creatorId: currentUser.id,
      creatorName: `${currentUser.ime} ${currentUser.prezime}`,
      schoolId
    });
    
    return res.json({
      ...folderResult,
      documentId: document.id
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return res.status(500).json({ message: 'Error creating folder in Google Drive', error: error.message });
  }
});

// Get file from Google Drive
const getFile = asyncWrapper(async (req, res) => {
  const { schoolId, fileId } = req.params;
  const currentUser = req.user;
  
  // Check if user belongs to the school
  if (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin) {
    return res.status(403).json({ message: 'Unauthorized to access this school drive file' });
  }
  
  try {
    const driveService = new GoogleDriveService(schoolId);
    const fileInfo = await driveService.getFileInfo(fileId);
    
    return res.json(fileInfo);
  } catch (error) {
    console.error('Error getting file:', error);
    return res.status(500).json({ message: 'Error getting file from Google Drive', error: error.message });
  }
});

// Browse all folders in Drive (for folder selector)
const browseFolders = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { folderId = 'root' } = req.query;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to browse this school drive' });
  }
  
  try {
    const driveService = new GoogleDriveService(schoolId);
    const files = await driveService.listAllFiles(folderId);
    
    return res.json(files);
  } catch (error) {
    console.error('Error browsing folders:', error);
    return res.status(500).json({ message: 'Error browsing Google Drive folders', error: error.message });
  }
});

// Set a custom root folder for the app
const setRootFolder = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { folderId, folderName } = req.body;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to change root folder for this school' });
  }
  
  try {
    const school = await School.findByPk(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Update school with new root folder
    await school.update({
      driveRootFolderId: folderId,
      driveEnabled: true,
      driveSettings: {
        ...school.driveSettings,
        rootFolder: {
          id: folderId,
          name: folderName
        }
      }
    });
    
    return res.json({
      success: true,
      message: 'Root folder updated successfully',
      rootFolder: {
        id: folderId,
        name: folderName
      }
    });
  } catch (error) {
    console.error('Error setting root folder:', error);
    return res.status(500).json({ message: 'Error setting root folder', error: error.message });
  }
});

// Update Drive settings (like showing external files)
const updateDriveSettings = asyncWrapper(async (req, res) => {
  const { schoolId } = req.params;
  const { showExternalFiles } = req.body;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to update drive settings for this school' });
  }
  
  try {
    const school = await School.findByPk(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Update drive settings
    await school.update({
      driveSettings: {
        ...school.driveSettings,
        showExternalFiles: showExternalFiles
      }
    });
    
    return res.json({
      success: true,
      message: 'Drive settings updated successfully',
      showExternalFiles: showExternalFiles
    });
  } catch (error) {
    console.error('Error updating drive settings:', error);
    return res.status(500).json({ message: 'Error updating drive settings', error: error.message });
  }
});

// Delete file from Google Drive
const deleteFile = asyncWrapper(async (req, res) => {
  const { schoolId, fileId } = req.params;
  const currentUser = req.user;
  
  // Check if admin and belongs to the school
  if (!currentUser.isAdmin || (currentUser.schoolId !== parseInt(schoolId) && !currentUser.isSuperAdmin)) {
    return res.status(403).json({ message: 'Unauthorized to delete from this school drive' });
  }
  
  try {
    const driveService = new GoogleDriveService(schoolId);
    await driveService.deleteFile(fileId);
    
    // Find and delete the document entry if it exists
    await Document.destroy({
      where: { driveFileId: fileId }
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: 'Error deleting file from Google Drive', error: error.message });
  }
});

module.exports = {
  getDriveStatus,
  initDriveSetup,
  completeDriveSetup,
  listFiles,
  uploadFile,
  createFolder,
  getFile,
  deleteFile,
  browseFolders,
  setRootFolder,
  updateDriveSettings
}; 