const { Document, Mentor, User, School, Sequelize } = require('../models');
const { Op } = Sequelize;
const asyncWrapper = require('../middleware/asyncWrapper');
const { createDocumentShareNotification } = require('./notification-controller');
const GoogleDriveService = require('../services/google-drive-service');

// Ensure Documents table exists
const ensureDocumentsTable = async () => {
  try {
    await Document.sync(); // Simple sync, won't modify existing table
    console.log('Documents table is ready');
  } catch (error) {
    console.error('Error ensuring Documents table:', error);
  }
};

// Call it when the controller is loaded
ensureDocumentsTable();

// Get documents (with folder structure)
const getDocuments = asyncWrapper(async (req, res) => {
  const { view, folderId, excludeOwn, search } = req.query;
  const currentUser = req.user;

  let where = {};
  
  if (view === 'my') {
    // My documents view - show owned and shared documents
    where = {
      [Op.and]: [
        {
          [Op.or]: [
            { creatorId: currentUser.id },
            { sharedToIds: { [Op.contains]: [currentUser.id.toString()] } }
          ]
        },
        { parentId: folderId || null }
      ]
    };
  } else {
    // All documents view
    where = {
      [Op.and]: [
        {
          [Op.or]: [
            { isPublic: true },
            { sharedToIds: { [Op.contains]: [currentUser.id.toString()] } }
          ]
        },
        { parentId: folderId || null }
      ]
    };

    // Exclude user's own documents if requested
    if (excludeOwn === 'true') {
      where[Op.and].push({
        creatorId: { [Op.ne]: currentUser.id }
      });
    }
  }

  // Add search condition if search term is provided
  if (search) {
    const searchTerm = search.toLowerCase();
    where[Op.and].push({
      [Op.or]: [
        // Exact match (case insensitive)
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          searchTerm
        ),
        // Starts with search term
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          { [Op.like]: `${searchTerm}%` }
        ),
        // Contains search term
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          { [Op.like]: `%${searchTerm}%` }
        )
      ]
    });
  }

  const documents = await Document.findAll({
    where,
    order: [
      ['type', 'ASC'], // Folders first
      ['name', 'ASC']
    ],
    include: [
      {
        model: Mentor,
        as: 'mentorCreator',
        attributes: ['id', 'ime', 'prezime'],
        required: false
      },
      {
        model: User,
        as: 'userCreator',
        attributes: ['id', 'ime', 'prezime'],
        required: false
      },
      {
        model: School,
        as: 'school',
        attributes: ['id', 'name'],
        required: false
      }
    ]
  });

  // Process documents from our database
  let processedDocuments = documents.map(doc => {
    const docData = doc.toJSON();

    // Combine creator info from either mentor or user
    docData.creatorName = doc.mentorCreator ? 
      `${doc.mentorCreator.ime} ${doc.mentorCreator.prezime}` : 
      doc.userCreator ? 
        `${doc.userCreator.ime} ${doc.userCreator.prezime}` : 
        doc.creatorName;

    // Add access level information
    docData.accessLevel = doc.creatorId === currentUser.id ? 'owner' :
                         doc.sharedToIds?.includes(currentUser.id.toString()) ? 'shared' :
                         doc.isPublic ? 'public' : 'none';

    // Calculate search relevance score if searching
    if (search) {
      const searchTerm = search.toLowerCase();
      const name = doc.name.toLowerCase();
      
      if (name === searchTerm) {
        docData.relevanceScore = 100; // Exact match
      } else if (name.startsWith(searchTerm)) {
        docData.relevanceScore = 75; // Starts with
      } else if (name.includes(searchTerm)) {
        docData.relevanceScore = 50; // Contains
      } else {
        docData.relevanceScore = 0;
      }
      
      // Boost score for documents owned by the current user
      if (doc.creatorId === currentUser.id) {
        docData.relevanceScore += 10;
      }
      
      // Boost score for recently updated documents
      const daysSinceUpdate = (new Date() - new Date(doc.updatedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        docData.relevanceScore += 5;
      }
    }

    return docData;
  });

  // Check if we should include external Google Drive files
  try {
    // Get the school
    const school = await School.findByPk(currentUser.schoolId);
    
    // If Google Drive is enabled and showExternalFiles is turned on
    if (school && school.driveEnabled && 
        school.driveSettings?.showExternalFiles && 
        view === 'all') { // Only for "all" view
      
      // Add external Google Drive files
      const driveService = new GoogleDriveService(currentUser.schoolId);
      
      // Determine which folder to use
      const driveFolderId = folderId 
        ? (await Document.findByPk(folderId))?.driveFileId // If we're in a folder, get its Drive ID
        : school.driveRootFolderId; // Otherwise use the root folder
      
      if (driveFolderId) {
        try {
          // List all files in the folder
          const driveFiles = await driveService.listAllFiles(driveFolderId);
          
          // Get IDs of documents we already have in our database
          const existingDriveIds = new Set(
            documents
              .filter(doc => doc.driveFileId)
              .map(doc => doc.driveFileId)
          );
          
          // Add external files that aren't already in our database
          const externalDriveFiles = driveFiles
            .filter(file => !existingDriveIds.has(file.id))
            .map(file => ({
              id: `drive-${file.id}`, // Use a prefix to avoid ID conflicts
              name: file.name,
              type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 
                   file.mimeType.includes('pdf') ? 'pdf' : 
                   file.mimeType.includes('text') ? 'text' : 'file',
              driveFileId: file.id,
              driveUrl: file.webViewLink,
              webViewLink: file.webViewLink,
              driveIntegrated: true,
              external: true, // Mark as external
              isPublic: true, // Treat as public since it's in the shared Drive folder
              creatorName: 'Google Drive', // Default creator name
              createdAt: new Date(),
              updatedAt: new Date(),
              accessLevel: 'public',
              relevanceScore: search ? 40 : 0 // Lower relevance for external files when searching
            }));
          
          // Combine with our database documents
          processedDocuments = [...processedDocuments, ...externalDriveFiles];
        } catch (error) {
          console.error('Error fetching external Google Drive files:', error);
          // Continue with just our database documents
        }
      }
    }
  } catch (error) {
    console.error('Error checking for external Google Drive files:', error);
    // Continue with just our database documents
  }

  // Sort by type (folders first), then relevance if searching, otherwise by name
  const sortedDocuments = processedDocuments.sort((a, b) => {
    // Folders always come first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    
    // Then by relevance if searching
    if (search) return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    
    // Otherwise by name
    return a.name.localeCompare(b.name);
  });

  res.json(sortedDocuments);
});

// Get single document by ID
const getDocumentById = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  const document = await Document.findOne({
    where: {
      id,
      [Op.or]: [
        { isPublic: true },
        { creatorId: currentUser.id },
        { sharedToIds: { [Op.contains]: [currentUser.id] } }
      ]
    },
    include: [
      {
        model: Mentor,
        as: 'mentorCreator',
        attributes: ['id', 'ime', 'prezime'],
        required: false
      },
      {
        model: User,
        as: 'userCreator',
        attributes: ['id', 'ime', 'prezime'],
        required: false
      }
    ]
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found or unauthorized' });
  }

  // Combine creator info
  document.dataValues.creator = document.mentorCreator || document.userCreator;

  // If document has shared users, fetch their details
  if (document.sharedToIds && document.sharedToIds.length > 0) {
    const [sharedMentors, sharedUsers] = await Promise.all([
      Mentor.findAll({
        where: { id: { [Op.in]: document.sharedToIds } },
        attributes: ['id', 'ime', 'prezime']
      }),
      User.findAll({
        where: { id: { [Op.in]: document.sharedToIds } },
        attributes: ['id', 'ime', 'prezime']
      })
    ]);
    document.dataValues.sharedWith = [...sharedMentors, ...sharedUsers];
  }

  // If it's a PDF, parse the pdfData
  if (document.type === 'pdf' && document.pdfData) {
    try {
      document.pdfData = JSON.parse(document.pdfData);
    } catch (error) {
      console.error('Error parsing PDF data:', error);
      document.pdfData = null;
    }
  }

  res.json(document);
});

// Helper function to check document limits
const checkDocumentLimits = async (userId, type, isMentor) => {
  const limits = {
    folder: 5,  // max 5 folders for everyone
    document: {
      mentor: 50, // max 50 documents for mentors
      student: 10 // max 10 documents for students
    }
  };

  const count = await Document.count({
    where: {
      creatorId: userId,
      type: type === 'folder' ? 'folder' : { [Op.ne]: 'folder' }
    }
  });

  if (type === 'folder') {
    if (count >= limits.folder) {
      throw new Error(`You have reached the maximum limit of ${limits.folder} folders`);
    }
  } else {
    const documentLimit = isMentor ? limits.document.mentor : limits.document.student;
    if (count >= documentLimit) {
      throw new Error(`You have reached the maximum limit of ${documentLimit} documents`);
    }
  }
};

// Create document
const createDocument = asyncWrapper(async (req, res) => {
  try {
    const { name, type, content, parentId, isPublic, sharedToIds = [] } = req.body;
    const creator = req.user;

    // Check document limits before creation
    await checkDocumentLimits(creator.id, type, creator.isMentor);

    // Validate parent folder if specified
    if (parentId) {
      const parentFolder = await Document.findByPk(parentId);
      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder not found' });
      }
      if (parentFolder.type !== 'folder') {
        return res.status(400).json({ message: 'Invalid parent: not a folder' });
      }
      const hasAccess = parentFolder.creatorId === creator.id || 
                       (parentFolder.sharedToIds && parentFolder.sharedToIds.includes(creator.id));
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to create in this folder' });
      }
    }

    // Get school info for Drive integration
    const school = await School.findByPk(creator.schoolId);
    let driveFileId = null;
    let driveUrl = null;
    let driveIntegrated = false;
    let driveThumbnailUrl = null;
    let documentContent = content;

    if (school && school.driveEnabled && school.driveRootFolderId) {
      try {
        const driveService = new GoogleDriveService(school.id);
        let mimeType = 'text/plain';
        let fileContent = content || '';
        let fileName = name;
        if (type === 'notation') {
          mimeType = 'application/json';
          fileContent = JSON.stringify({ content });
          if (!fileName.endsWith('.json')) fileName += '.json';
        } else if (type === 'text') {
          mimeType = 'text/plain';
          if (!fileName.endsWith('.txt')) fileName += '.txt';
        } else if (type === 'url') {
          mimeType = 'text/uri-list';
          fileContent = content;
          if (!fileName.endsWith('.url')) fileName += '.url';
        }
        // Upload to Drive
        const driveRes = await driveService.uploadFile(fileName, fileContent, mimeType, parentId ? undefined : null);
        driveFileId = driveRes.id;
        driveUrl = driveRes.webViewLink;
        driveThumbnailUrl = driveRes.thumbnailLink;
        driveIntegrated = true;
        documentContent = null; // Do not save content in DB if uploaded to Drive
      } catch (err) {
        console.error('Error uploading document to Google Drive:', err);
        // Fallback: continue with DB-only save
      }
    }

    // Create document with all fields
    const document = await Document.create({
      name,
      type,
      content: documentContent,
      creatorId: creator.id,
      creatorName: `${creator.ime} ${creator.prezime}`,
      isPublic: isPublic || false,
      parentId: parentId || null,
      sharedToIds: sharedToIds || [],
      driveFileId,
      driveUrl,
      driveIntegrated,
      driveThumbnailUrl,
      schoolId: creator.schoolId
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      message: 'Error creating document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update document
const updateDocument = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { name, content, isPublic, sharedToIds, type } = req.body;
  const currentUser = req.user;

  const document = await Document.findByPk(id);

  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }

  // Check if user has edit permissions
  const canEdit = document.creatorId === currentUser.id || 
                 (document.sharedToIds && document.sharedToIds.includes(currentUser.id));

  if (!canEdit) {
    return res.status(403).json({ message: 'You do not have permission to edit this document' });
  }

  // If document is public but not shared with anyone, only creator can edit
  if (document.isPublic && (!document.sharedToIds || document.sharedToIds.length === 0) && 
      document.creatorId !== currentUser.id) {
    return res.status(403).json({ message: 'Public documents can only be edited by their creator' });
  }

  // If sharing a folder, apply sharing to all contents recursively
  if (document.type === 'folder' && (isPublic !== undefined || sharedToIds)) {
    await updateFolderSharing(document.id, {
      isPublic: isPublic !== undefined ? isPublic : document.isPublic,
      sharedToIds: sharedToIds || document.sharedToIds
    });
  }

  // Update document
  const updatedDocument = await document.update({
    name: name || document.name,
    content: content !== undefined ? content : document.content,
    type: type || document.type,
    isPublic: isPublic !== undefined ? isPublic : document.isPublic,
    sharedToIds: sharedToIds || document.sharedToIds
  });

  // If sharing was updated, create notifications for both users and mentors
  if (sharedToIds && !arrayEquals(sharedToIds, document.sharedToIds)) {
    const newShares = sharedToIds.filter(id => !document.sharedToIds.includes(id));
    for (const userId of newShares) {
      await createDocumentShareNotification(userId, document);
    }
  }

  res.json(updatedDocument);
});

// Helper function to recursively update folder sharing
const updateFolderSharing = async (folderId, { isPublic, sharedToIds }) => {
  const children = await Document.findAll({
    where: { parentId: folderId }
  });

  for (const child of children) {
    // Update child's sharing settings
    await child.update({
      isPublic: isPublic,
      sharedToIds: sharedToIds
    });

    // If child is a folder, recursively update its contents
    if (child.type === 'folder') {
      await updateFolderSharing(child.id, { isPublic, sharedToIds });
    }
  }
};

// Helper function to compare arrays
const arrayEquals = (a, b) => {
  return Array.isArray(a) && 
         Array.isArray(b) && 
         a.length === b.length && 
         a.every((val, index) => val === b[index]);
};

// Delete document
const deleteDocument = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const document = await Document.findOne({
    where: {
      id,
      creatorId: userId
    }
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found or unauthorized' });
  }

  // If it's a folder, delete all children recursively
  if (document.type === 'folder') {
    await deleteFolder(document.id);
  }

  await document.destroy();
  res.json({ message: 'Document deleted successfully' });
});

// Helper function to recursively delete folders
const deleteFolder = async (folderId) => {
  const children = await Document.findAll({
    where: { parentId: folderId }
  });

  for (const child of children) {
    if (child.type === 'folder') {
      await deleteFolder(child.id);
    }
    await child.destroy();
  }
};

// Upload PDF document
const uploadPdf = asyncWrapper(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { name, parentId, isPublic } = req.body;
    const creator = req.user;

    // Check document limits before uploading
    await checkDocumentLimits(creator.id, 'pdf', creator.isMentor);

    // Format PDF data to match invoice format
    const pdfData = JSON.stringify({
      data: {
        type: 'Buffer',
        data: Array.from(req.file.buffer)
      },
      contentType: req.file.mimetype,
      originalName: req.file.originalname
    });

    // Create document with proper parentId handling
    const document = await Document.create({
      name: name || req.file.originalname,
      type: 'pdf',
      pdfData,
      parentId: parentId === 'null' ? null : (parentId ? parseInt(parentId) : null),
      creatorId: creator.id,
      creatorName: `${creator.ime} ${creator.prezime}`,
      isPublic: isPublic === 'true',
      sharedToIds: [],
      metadata: {}
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ 
      message: 'Error uploading PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Share document
const shareDocument = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;
  const currentUser = req.user;

  const document = await Document.findOne({
    where: {
      id,
      creatorId: currentUser.id
    }
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found or unauthorized' });
  }

  // Get users to share with
  const users = await Mentor.findAll({
    where: {
      id: userIds
    },
    attributes: ['id', 'ime', 'prezime']
  });

  // Update document with new shared users
  const sharedToIds = [...new Set([...(document.sharedToIds || []), ...userIds])];
  await document.update({ sharedToIds });

  // Create notifications for shared users
  await createDocumentShareNotification(document, currentUser, users);

  res.json(document);
});

// Download document
const downloadDocument = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  const document = await Document.findOne({
    where: {
      id,
      [Op.or]: [
        { isPublic: true },
        { creatorId: currentUser.id },
        { sharedToIds: { [Op.contains]: [currentUser.id.toString()] } }
      ]
    }
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found or unauthorized' });
  }

  try {
    // Set appropriate headers based on document type
    if (document.type === 'notation') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${document.name}.abc"`);
      return res.send(document.content);
    } else if (document.type === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${document.name}.txt"`);
      return res.send(document.content);
    } else if (document.type === 'pdf' && document.pdfData) {
      const pdfData = typeof document.pdfData === 'string' ? 
        JSON.parse(document.pdfData) : document.pdfData;
      
      if (pdfData.data) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.name}.pdf"`);
        return res.send(Buffer.from(pdfData.data.data));
      }
    }
    
    return res.status(400).json({ message: 'Document type not supported for download or invalid data' });
  } catch (error) {
    console.error('Error processing download:', error);
    return res.status(500).json({ message: 'Error processing document for download' });
  }
});

// Create document with Drive file link
const createDriveDocument = asyncWrapper(async (req, res) => {
  try {
    const { name, type, driveFileId, driveUrl, driveThumbnailUrl, parentId, isPublic, sharedToIds = [] } = req.body;
    const creator = req.user;

    // Check document limits before creation
    await checkDocumentLimits(creator.id, type, creator.isMentor);
    
    // Create document with drive fields
    const document = await Document.create({
      name,
      type,
      driveFileId,
      driveUrl,
      driveThumbnailUrl,
      driveIntegrated: true,
      creatorId: creator.id,
      creatorName: `${creator.ime} ${creator.prezime}`,
      isPublic: isPublic || false,
      parentId: parentId || null,
      sharedToIds: sharedToIds || [],
      schoolId: creator.schoolId
    });

    console.log('Drive document created successfully:', document.id);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating drive document:', error);
    res.status(500).json({
      message: 'Error creating drive document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadPdf,
  shareDocument,
  downloadDocument,
  createDriveDocument,
}; 