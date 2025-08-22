const { google } = require('googleapis');
const { School } = require('../models');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class GoogleDriveService {
  constructor(schoolId) {
    this.schoolId = schoolId;
    this.driveClient = null;
  }

  // Initialize the Google Drive client with service account
  async initialize() {
    try {
      const school = await School.findByPk(this.schoolId);
      if (!school || !school.driveEnabled || !school.driveRootFolderId) {
        throw new Error('Google Drive is not enabled for this school or root folder ID is missing');
      }

      // Load service account credentials from file or env
      let credentials;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        // Fix private_key newlines if needed
        if (credentials.private_key && credentials.private_key.includes('\\n')) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
      } else if (process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        credentials = JSON.parse(process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL);
        if (credentials.private_key && credentials.private_key.includes('\\n')) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
      } else {
        const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../config/service-account.json');
        credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
      const authClient = await auth.getClient();
      this.driveClient = google.drive({ version: 'v3', auth: authClient });
      this.school = school;
      return this.driveClient;
    } catch (error) {
      console.error('Error initializing Google Drive client (service account):', error);
      throw error;
    }
  }

  // Create a new folder in Google Drive
  async createFolder(folderName, parentFolderId = null) {
    if (!this.driveClient) {
      await this.initialize();
    }
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : [this.school.driveRootFolderId],
    };
    try {
      const response = await this.driveClient.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink, webContentLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw error;
    }
  }

  // Upload a file to Google Drive
  async uploadFile(fileName, fileContent, mimeType, folderId = null) {
    if (!this.driveClient) {
      await this.initialize();
    }
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [this.school.driveRootFolderId],
    };
    // Always use a Readable stream for the body
    let body;
    if (typeof fileContent === 'string') {
      body = Readable.from(Buffer.from(fileContent, 'utf8'));
    } else if (Buffer.isBuffer(fileContent)) {
      body = Readable.from(fileContent);
    } else {
      throw new Error('File content must be a Buffer or string');
    }
    const media = {
      mimeType,
      body,
    };
    try {
      const response = await this.driveClient.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  // Get info about a file in Google Drive
  async getFileInfo(fileId) {
    if (!this.driveClient) {
      await this.initialize();
    }
    try {
      const response = await this.driveClient.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents',
      });
      return response.data;
    } catch (error) {
      console.error('Error getting file info from Google Drive:', error);
      throw error;
    }
  }

  // List files in a folder
  async listFiles(folderId = null) {
    if (!this.driveClient) {
      await this.initialize();
    }
    const query = folderId
      ? `'${folderId}' in parents and trashed = false`
      : `'${this.school.driveRootFolderId}' in parents and trashed = false`;
    try {
      const response = await this.driveClient.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink)',
      });
      return response.data.files;
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      throw error;
    }
  }

  // List all files in a folder (including those not created by the app)
  async listAllFiles(folderId = 'root') {
    if (!this.driveClient) {
      await this.initialize();
    }
    try {
      const query = folderId === 'root'
        ? `mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
        : `'${folderId}' in parents and trashed = false`;
      const response = await this.driveClient.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents)',
      });
      return response.data.files;
    } catch (error) {
      console.error('Error listing all files from Google Drive:', error);
      throw error;
    }
  }

  // Delete a file from Google Drive
  async deleteFile(fileId) {
    if (!this.driveClient) {
      await this.initialize();
    }
    try {
      await this.driveClient.files.delete({ fileId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }
}

module.exports = GoogleDriveService; 