const express = require('express');
const multer = require('multer');
const {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadPdf,
  shareDocument,
  downloadDocument
} = require('../controllers/document-controller');
const { verifyToken } = require('../controllers/user-controller');

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Document routes
router.get('/', verifyToken, getDocuments);
router.get('/:id', verifyToken, getDocumentById);
router.get('/:id/download', verifyToken, downloadDocument);
router.post('/', verifyToken, createDocument);
router.put('/:id', verifyToken, updateDocument);
router.delete('/:id', verifyToken, deleteDocument);

// PDF upload route
router.post('/upload', verifyToken, upload.single('pdfFile'), uploadPdf);

// Sharing route
router.post('/:id/share', verifyToken, shareDocument);

module.exports = router; 