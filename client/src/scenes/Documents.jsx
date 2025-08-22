import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigacija from './navigacija/index';
import NavTop from './nav-top/index';
import ApiConfig from '../components/apiConfig';
import Notification from '../components/Notifikacija';
import LoadingShell from '../components/LoadingShell';
import AddDocumentModal from '../components/AddDocumentModal';
import ShareDocumentModal from '../components/ShareDocumentModal';
import DocumentEditor from '../components/DocumentEditor';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import abcjs from 'abcjs';
import 'abcjs/abcjs-audio.css';
import './Documents.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


// File type icons mapping
const FILE_ICONS = {
  url: 'solar:link-circle-broken',
  pdf: 'solar:file-favourite-broken',
  text: 'solar:file-text-broken',
  notation: 'solar:music-note-broken',
  folder: 'solar:folder-with-files-broken'
};

const Documents = ({ user, unreadChatsCount }) => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState('all'); // 'all' or 'my'
  const [files, setFiles] = useState([]);
  const [totalCounts, setTotalCounts] = useState({ total: 0, myDocuments: 0 });
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState(null);
  const [showNotationEditor, setShowNotationEditor] = useState(false);
  const [pendingAccidental, setPendingAccidental] = useState(null);
  const [pendingDuration, setPendingDuration] = useState(null);
  const textareaRef = useRef(null);
  const otvoreno = 'dokumenti';
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [abcEditor, setAbcEditor] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [synthControl, setSynthControl] = useState(null);
  const [visualObj, setVisualObj] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    } else {
      fetchFiles(true);
    }
  }, [view, currentFolder, documentId]);

  useEffect(() => {
    if (showNotationEditor && editedDocument?.type === 'notation') {
      try {
        // Initialize content if empty
        if (!editedDocument.content || editedDocument.content.trim() === '') {
          const defaultNotation = `X:1
T:Simple Scale
M:4/4
L:1/4
K:C
C D E F |G A B c|`;
          setEditedDocument({
            ...editedDocument,
            content: defaultNotation
          });
        }

        // Initialize abcjs editor
        const editor = new abcjs.Editor('abc-editor', {
          canvas_id: 'paper',
          warnings_id: 'abc-warnings',
          abcjsParams: {
            responsive: 'resize',
            add_classes: true,
            paddingbottom: 10,
            paddingtop: 10,
            staffwidth: document.getElementById('paper')?.offsetWidth - 40,
            wrap: {
              minSpacing: 1.8,
              maxSpacing: 2.7,
              preferredMeasuresPerLine: 4
            },
            format: {
              gchordfont: "Arial",
              wordsfont: "Arial",
              vocalfont: "Arial"
            }
          }
        });

        setAbcEditor(editor);

        // Initial render and audio setup
        if (editedDocument.content) {
          initializeAudio(editedDocument.content);
        }

        // Handle window resize
        const handleResize = () => {
          if (editor) {
            editor.paramChanged({
              staffwidth: document.getElementById('paper')?.offsetWidth - 40
            });
          }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          setAbcEditor(null);
          if (synthControl) {
            synthControl.pause();
            setSynthControl(null);
          }
        };
      } catch (error) {
        console.error('Error initializing ABC editor:', error);
      }
    }
  }, [showNotationEditor, editedDocument?.type]);

  useEffect(() => {
    if (showDocumentDetails && selectedDocument?.type === 'notation' && selectedDocument.content) {
      try {
        const previewElement = document.getElementById('notation-preview-view');
        if (previewElement) {
          previewElement.innerHTML = '';
          abcjs.renderAbc('notation-preview-view', selectedDocument.content, {
            responsive: 'resize',
            paddingbottom: 20,
            paddingtop: 20,
            add_classes: true,
            staffwidth: previewElement.offsetWidth - 40,
            wrap: {
              minSpacing: 1.8,
              maxSpacing: 2.7,
              preferredMeasuresPerLine: 4
            }
          });
        }
      } catch (error) {
        console.error('Error rendering notation preview:', error);
      }
    }
  }, [showDocumentDetails, selectedDocument]);

  // Add new effect for edit mode real-time rendering
  useEffect(() => {
    if (isEditing && editedDocument?.type === 'notation' && editedDocument.content) {
      try {
        const previewElement = document.getElementById('notation-preview-edit');
        if (previewElement) {
          previewElement.innerHTML = '';
          abcjs.renderAbc('notation-preview-edit', editedDocument.content, {
            responsive: 'resize',
            paddingbottom: 20,
            paddingtop: 20,
            add_classes: true,
            staffwidth: previewElement.offsetWidth - 40,
            wrap: {
              minSpacing: 1.8,
              maxSpacing: 2.7,
              preferredMeasuresPerLine: 4
            }
          });
        }
      } catch (error) {
        console.error('Error rendering notation preview in edit mode:', error);
      }
    }
  }, [isEditing, editedDocument?.content]);

  // Update the effect that handles audio initialization
  useEffect(() => {
    let timeoutId;
    if (editedDocument?.type === 'notation' && editedDocument.content && showNotationEditor) {
      // Add a delay to ensure DOM elements are ready
      timeoutId = setTimeout(() => {
        initializeAudio(editedDocument.content);
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Cleanup audio controls
      if (synthControl) {
        synthControl.pause();
        setSynthControl(null);
      }
    };
  }, [editedDocument?.content, showNotationEditor]);

  const fetchFiles = async (skipNotification = true) => {
    try {
      setIsLoading(true);
      // Fetch all documents (without folder filter for counting)
      const allDocsResponse = await ApiConfig.cachedApi.get('/api/documents', {
        params: {
          view,
          userId: user.id,
          excludeOwn: view === 'all'
        }
      });
      
      // Set total counts
      setTotalCounts({
        total: allDocsResponse.length,
        myDocuments: allDocsResponse.filter(doc => doc.creatorId === user.id).length
      });

      // If we're in a folder, fetch folder contents
      if (currentFolder) {
        const folderResponse = await ApiConfig.cachedApi.get('/api/documents', {
          params: {
            view,
            folderId: currentFolder,
            userId: user.id,
            excludeOwn: view === 'all'
          }
        });
        setFiles(folderResponse);
      } else {
        // If we're in root, use the all docs response
        setFiles(allDocsResponse);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      if (!skipNotification) {
        setNotification({
          type: 'error',
          message: 'Greška pri dohvaćanju datoteka'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocument = async (id) => {
    try {
      setIsLoading(true);
      const document = await ApiConfig.cachedApi.get(`/api/documents/${id}`);

      // If it's a folder, navigate to that folder
      if (document.type === 'folder') {
        setCurrentFolder(document.id);
        // Update folder path
        const path = [];
        let currentDoc = document;
        while (currentDoc.parentId) {
          const parentDoc = await ApiConfig.cachedApi.get(`/api/documents/${currentDoc.parentId}`);
          currentDoc = parentDoc;
          path.unshift(currentDoc);
        }
        path.push(document);
        setFolderPath(path);
        navigate('/documents'); // Remove ID from URL
      } else {
        // Handle the document based on its type
        handleDocumentClick(document);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri dohvaćanju dokumenta'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder.id);
    setFolderPath([...folderPath, folder]);
  };

  const handlePathClick = (index) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolder(newPath[newPath.length - 1]?.id || null);
  };

  const handleAddClick = () => {
    setShowAddModal(true);
  };

  const handleAddDocument = async (data, type = 'regular') => {
    try {
      let response;
      if (type === 'pdf') {
        response = await ApiConfig.api.post('/api/documents/upload', data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await ApiConfig.api.post('/api/documents', data);
      }

      setNotification({
        type: 'success',
        message: 'Dokument uspješno dodan'
      });
      setShowAddModal(false);
      // Invalidate cache before fetching new data
      ApiConfig.invalidateCache();
      fetchFiles();
    } catch (error) {
      console.error('Error adding document:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 
                (error.response?.data?.error === 'You have reached the maximum limit of 10 documents' 
                  ? `Dosegnuli ste limit - imate ${totalCounts.myDocuments}/10 datoteka`
                  : 'Greška pri dodavanju dokumenta')
      });
    }
  };

  const handleShare = async (document) => {
    setSelectedDocument(document);
    setShowShareModal(true);
  };

  const handleShareSubmit = async (shareData) => {
    try {
      await ApiConfig.api.post(`/api/documents/${selectedDocument.id}/share`, shareData);
      setNotification({
        type: 'success',
        message: 'Dokument uspješno podijeljen'
      });
      setShowShareModal(false);
      fetchFiles();
    } catch (error) {
      console.error('Error sharing document:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri dijeljenju dokumenta'
      });
    }
  };

  const handleDocumentClick = async (document) => {
    setNotification(null);
    setSelectedDocument(document);
    setShowDocumentDetails(true);
    setEditedDocument(null);
    setShowNotationEditor(false);
    setIsEditing(false);
    setHasUnsavedChanges(false);

    // Fetch shared users if document has sharedToIds
    if (document.sharedToIds && document.sharedToIds.length > 0 && (!document.sharedWith || document.sharedWith.length === 0)) {
      try {
        const sharedUserPromises = document.sharedToIds.map(async (userId) => {
          try {
            // Try to fetch user details
            const userResponse = await ApiConfig.api.get(`/api/korisnik-osnovno/${userId}`);
            return userResponse.data.user;
          } catch (userError) {
            try {
              // If user not found, try to fetch mentor details
              const mentorResponse = await ApiConfig.api.get(`/api/mentori-osnovno/${userId}`);
              return mentorResponse.data;
            } catch (mentorError) {
              console.error('Error fetching shared user details:', mentorError);
              return { id: userId, ime: 'Unknown', prezime: 'User' };
            }
          }
        });

        const sharedUsers = await Promise.all(sharedUserPromises);
        setSelectedDocument(prev => ({
          ...prev,
          sharedWith: sharedUsers
        }));
      } catch (error) {
        console.error('Error fetching shared users:', error);
      }
    }
  };

  const handleViewDocument = async (document) => {
    // Update URL without navigating
    if (!window.location.pathname.includes(document.id)) {
      window.history.pushState({}, '', `/documents/${document.id}`);
    }

    // Handle different document types
    switch (document.type) {
      case 'url':
        if (document.content) {
          window.open(document.content, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'pdf':
        try {
          if (document.pdfData) {
            let pdfData = document.pdfData;
            // Check if pdfData is a string and needs parsing
            if (typeof pdfData === 'string') {
              pdfData = JSON.parse(pdfData);
            }
            if (pdfData.data && pdfData.data.data) {
              const pdfBuffer = new Uint8Array(pdfData.data.data);
              const blob = new Blob([pdfBuffer], { type: pdfData.contentType || 'application/pdf' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              throw new Error('Invalid PDF data format');
            }
          } else {
            throw new Error('PDF data is missing');
          }
        } catch (error) {
          console.error('Error opening PDF:', error);
          setNotification({
            type: 'error',
            message: 'Greška pri otvaranju PDF-a: ' + error.message
          });
        }
        break;
      case 'text':
      case 'notation':
        // Show content in the details popup
        setSelectedDocument(document);
        setShowDocumentDetails(true);
        break;
      default:
        break;
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await ApiConfig.api.get(`/api/documents/${doc.id}/download`, {
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], {
        type: response.headers['content-type']
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri preuzimanju dokumenta'
      });
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovaj dokument?')) {
      return;
    }

    try {
      await ApiConfig.api.delete(`/api/documents/${document.id}`);
      setNotification({
        type: 'success',
        message: 'Dokument uspješno obrisan'
      });
      // Invalidate cache before fetching new data
      ApiConfig.invalidateCache();
      await fetchFiles(true);
    } catch (error) {
      console.error('Error deleting document:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri brisanju dokumenta'
      });
    }
  };

  const handleEdit = () => {
    setNotification(null);
    if (selectedDocument.type === 'url') {
      setIsEditing(true);
      setEditedDocument({
        ...selectedDocument,
        name: selectedDocument.name,
        content: selectedDocument.content
      });
    } else {
      setShowNotationEditor(true);
      setIsEditing(true);
      setEditedDocument({
        ...selectedDocument,
        name: selectedDocument.name,
        content: selectedDocument.content
      });
    }
    setHasUnsavedChanges(false);
  };

  const handleSaveEdit = async () => {
    if (!hasUnsavedChanges && selectedDocument.type === 'text') {
      return;
    }

    try {
      // For notation documents, just verify that it can be rendered
      if (editedDocument.type === 'notation') {
        try {
          abcjs.renderAbc('paper', editedDocument.content, {
            responsive: 'resize',
            add_classes: true,
            paddingbottom: 20,
            paddingtop: 20,
            staffwidth: document.getElementById('paper')?.offsetWidth - 40,
            wrap: {
              minSpacing: 1.8,
              maxSpacing: 2.7,
              preferredMeasuresPerLine: 4
            },
            format: {
              gchordfont: "Arial",
              wordsfont: "Arial",
              vocalfont: "Arial"
            }
          });
        } catch (error) {
          console.error('Error validating notation:', error);
          if (!window.confirm('The notation appears to be invalid. Would you like to save anyway?')) {
            return;
          }
        }
      }

      // Save the document
      const response = await ApiConfig.api.put(`/api/documents/${editedDocument.id}`, editedDocument);
      
      // Update local state with the response data
      setSelectedDocument(response.data);
      setIsEditing(false);
      setShowNotationEditor(false);
      setHasUnsavedChanges(false);

      // Update the document in the files list without fetching
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === response.data.id ? response.data : file
        )
      );

      // Show notification for successful save
      setNotification({
        type: 'success',
        message: 'Dokument uspješno ažuriran'
      });

      // Just invalidate the cache for next time
      ApiConfig.invalidateCache();

    } catch (error) {
      console.error('Error updating document:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri ažuriranju dokumenta'
      });
    }
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges && selectedDocument.type === 'text') {
      if (!window.confirm('Imate nespremljene promjene. Jeste li sigurni da želite odustati?')) {
        return;
      }
    }
    setNotification(null);
    setIsEditing(false);
    setEditedDocument(null);
    setShowNotationEditor(false);
    setHasUnsavedChanges(false);
  };

  // Add this effect to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Add a useEffect to clear notification after a timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000); // Clear after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const renderFileIcon = (type) => {
    return <Icon icon={FILE_ICONS[type] || 'solar:file-broken'} />;
  };

  const handleNoteClick = (note) => {
    const textarea = textareaRef.current;
    if (!textarea || !editedDocument) return;

    let textToInsert = '';

    // Add pending accidental if exists
    if (pendingAccidental) {
      textToInsert += pendingAccidental;
      setPendingAccidental(null);
    }

    // Add the note
    textToInsert += note;

    // Add pending duration if exists
    if (pendingDuration) {
      textToInsert += pendingDuration;
      setPendingDuration(null);
    }

    // If this is the first note or content is empty, add default header
    if (!editedDocument.content || !editedDocument.content.trim()) {
      const defaultNotation = `X:1
T:Simple Scale
M:4/4
L:1/4
K:C
${textToInsert}`;
      setEditedDocument({
        ...editedDocument,
        content: defaultNotation
      });
      return;
    }

    insertAtCursor(textToInsert, textarea);
  };

  const handleAccidentalClick = (value) => {
    setPendingAccidental(value);
  };

  const handleDurationClick = (value) => {
    setPendingDuration(value);
  };

  const moveCursor = (direction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = editedDocument.content.substring(0, start) + editedDocument.content.substring(end);
    const newStart = direction === 'left' ? start - 1 : start + 1;
    const newEnd = direction === 'left' ? end - 1 : end + 1;

    setEditedDocument({
      ...editedDocument,
      content: newContent.substring(0, newStart) + editedDocument.content.substring(end) + newContent.substring(newStart, end)
    });

    setTimeout(() => {
      textarea.selectionStart = newStart;
      textarea.selectionEnd = newEnd;
      textarea.focus();
    }, 0);
  };

  const insertAtCursor = (text, textarea) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = textarea.value;
    const newContent = content.substring(0, start) + text + content.substring(end);
    const newPosition = start + text.length;

    setEditedDocument({ ...editedDocument, content: newContent });

    // Set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleRenameFolder = async (folder) => {
    const newName = prompt('Enter new folder name:', folder.name);
    if (!newName || newName === folder.name) return;

    try {
      await ApiConfig.api.put(`/api/documents/${folder.id}`, {
        ...folder,
        name: newName
      });
      setNotification({
        type: 'success',
        message: 'Folder successfully renamed'
      });
      fetchFiles();
    } catch (error) {
      console.error('Error renaming folder:', error);
      setNotification({
        type: 'error',
        message: 'Error renaming folder'
      });
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) {
      return;
    }

    try {
      await ApiConfig.api.delete(`/api/documents/${folder.id}`);
      setNotification({
        type: 'success',
        message: 'Folder successfully deleted'
      });
      // If we're in the folder that was deleted, go back to root
      if (currentFolder === folder.id) {
        setCurrentFolder(null);
        setFolderPath([]);
      }
      fetchFiles();
    } catch (error) {
      console.error('Error deleting folder:', error);
      setNotification({
        type: 'error',
        message: 'Error deleting folder'
      });
    }
  };

  const renderFileRow = (file) => {
    // Get original name for PDF files
    const displayName = file.type === 'pdf' && file.pdfData ? 
      (() => {
        try {
          const pdfData = JSON.parse(file.pdfData);
          return pdfData.originalName || file.name;
        } catch (e) {
          return file.name;
        }
      })() : file.name;

    return (
      <div key={file.id} className="tr redak">
        <div className="th">
          <div className="file-title" style={{
            maxWidth: '300px',
            overflow: 'auto',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {renderFileIcon(file.type)}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
            {file.isPublic && (
              <Icon icon="solar:global-broken" style={{ color: 'rgb(var(--isticanje))', fontSize: '1.2rem' }} title="Public" />
            )}
            {file.sharedToIds?.length > 0 && (
              <>
                <Icon icon="solar:users-group-rounded-bold-duotone" style={{ color: 'rgb(var(--isticanje))', fontSize: '1.2rem'}} title="Shared with users" />
              </>
            )}
          </div>
        </div>
        <div className="th mobile-none">
          {file.creatorName}
        </div>
        <div className="th mobile-none">
          {new Date(file.createdAt).toLocaleDateString('hr-HR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="th">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {file.type === 'folder' ? (
              <>
                <div
                  className="action-btn btn abExpand"
                  onClick={() => handleFolderClick(file)}
                  style={{
                    backgroundColor: 'var(--isticanje-svijetlo)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  title="Open Folder"
                >
                  <Icon icon="solar:folder-open-broken" />
                </div>
                <div
                  className="action-btn btn"
                  onClick={() => handleDocumentClick(file)}
                  style={{
                    backgroundColor: 'var(--isticanje-svijetlo)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  title="Details"
                >
                  <Icon icon="solar:round-double-alt-arrow-down-broken" />
                </div>
              </>
            ) : (
              <div
                className="action-btn btn"
                onClick={() => handleDocumentClick(file)}
                style={{
                  backgroundColor: 'var(--isticanje-svijetlo)',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                title="Details"
              >
                <Icon icon="solar:round-double-alt-arrow-down-broken" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modify the initializeAudio function
  const initializeAudio = async (content) => {
    try {
      if (!content) return;

      // Wait for paper element to be available
      const paperElement = document.getElementById('paper');
      if (!paperElement) {
        console.warn('Paper element not found');
        return;
      }
      
      // First render the music to get the visualObj
      const renderResult = abcjs.renderAbc('paper', content, {
        responsive: 'resize',
        add_classes: true,
        paddingbottom: 20,
        paddingtop: 20,
        staffwidth: paperElement.offsetWidth - 40,
        wrap: {
          minSpacing: 1.8,
          maxSpacing: 2.7,
          preferredMeasuresPerLine: 4
        },
        format: {
          gchordfont: "Arial",
          wordsfont: "Arial",
          vocalfont: "Arial"
        }
      });

      if (!renderResult || !renderResult[0]) {
        console.warn('No render result available');
        return;
      }

      setVisualObj(renderResult[0]);

      // Wait for audio controls element to be available
      const audioControlsElement = document.getElementById('audio-controls');
      if (!audioControlsElement) {
        console.warn('Audio controls element not found');
        return;
      }

      // Clear existing content and controls
      audioControlsElement.innerHTML = '';
      if (synthControl) {
        synthControl.pause();
        setSynthControl(null);
      }

      const cursorControl = {
        beatSubdivisions: 2,
        extraMeasuresAtBeginning: 0,
        lineEndAnticipation: 0,
      };

      try {
        const newSynthControl = new abcjs.synth.SynthController();
        await newSynthControl.load("#audio-controls", cursorControl, {
          displayLoop: true,
          displayRestart: true,
          displayPlay: true,
          displayProgress: true,
          displayWarp: true
        });

        setSynthControl(newSynthControl);

        await newSynthControl.setTune(renderResult[0], false, {
          midiTranspose: 0,
          visualTranspose: 0,
          soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/abcjs/",
          program: 0
        });
      } catch (error) {
        console.error('Error initializing audio controls:', error);
      }
    } catch (error) {
      console.error('Error in initializeAudio:', error);
    }
  };

  const handlePrint = () => {
    // Elements to hide during printing
    const audioControls = document.getElementById('audio-controls');
    const controlsToggle = document.querySelector('.controls-toggle');
    const abcWarnings = document.getElementById('abc-warnings');
    const controlsPanel = document.querySelector('.controls-panel');
    const editorHeader = document.querySelector('.notation-editor-header');
    const elements = [audioControls, controlsToggle, abcWarnings, controlsPanel, editorHeader].filter(Boolean);

    // Add hidden class
    elements.forEach(el => el.classList.add('hidden'));

    // Wait for DOM to update
    setTimeout(() => {
      window.print();
      
      // Remove hidden class after printing dialog closes
      setTimeout(() => {
        elements.forEach(el => el.classList.remove('hidden'));
      }, 1000);
    }, 100);
  };

  return (
    <>
      <Navigacija user={user} otvoreno={otvoreno} unreadChatsCount={unreadChatsCount} />
      <NavTop user={user} naslov="Dokumenti" />

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="main">
        <div className="tabs">
          <button
            className={`tab ${view === 'all' ? 'active' : ''}`}
            onClick={() => setView('all')}
          >
            <Icon className="icon" icon="solar:documents-broken" />
          </button>
          <button
            className={`tab ${view === 'my' ? 'active' : ''}`}
            onClick={() => setView('my')}
          >
            <Icon className="icon" icon="solar:user-id-broken" />
          </button>
        </div>

        <button
          className="floating-action-btn"
          onClick={handleAddClick}
        >
          <Icon icon="solar:add-circle-broken" />
        </button>

        {folderPath.length > 0 && (
          <div className="folder-path">
            <button
              className="path-item"
              onClick={() => {
                setCurrentFolder(null);
                setFolderPath([]);
              }}
            >
              <Icon icon="solar:folder-broken" />
              Root
            </button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span className="path-separator">/</span>
                <button
                  className="path-item"
                  onClick={() => handlePathClick(index)}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
<div className="document-counter" style={{
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.7rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                {view === 'all' ? (
                  <span>Ukupno: {totalCounts.total}</span>
                ) : (
                  <>
                    <span style={{ marginRight: '1rem' }}>
                      Moji dokumenti: {totalCounts.myDocuments}
                    </span>
                    {user.isMentor && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Limit: {totalCounts.myDocuments}/10 dokumenata
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        <div className="karticaZadatka">
          {/* Document Counter */}
          

          {files.length > 0 ? (
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Naziv</div>
                <div className="th mobile-none">Kreirao</div>
                <div className="th mobile-none">Datum</div>
                <div className="th">Akcije</div>
              </div>
              {files.map(file => renderFileRow(file))}
            </div>
          ) : (
            <p className="no-posts">Nema dokumenata za prikaz.</p>
          )}
        </div>
      </div>

      {showDocumentDetails && selectedDocument && (
        <div className="popup">
          <div className="div div-clmn">
            <div className="div-radio">
              <h3>{selectedDocument.type === 'folder' ? 'Detalji mape' : 'Detalji dokumenta'} - {selectedDocument.name}</h3>
              <button
                className="gumb action-btn zatvoriBtn"
                onClick={() => {
                  setShowDocumentDetails(false);
                  setSelectedDocument(null);
                  setIsEditing(false);
                }}
              >
                <Icon icon="solar:close-circle-broken" /> Zatvori
              </button>
            </div>

            {isEditing ? (
              <div className="edit-container">
                <DocumentEditor
                  content={editedDocument.content}
                  type={selectedDocument.type}
                  onChange={(newContent) => setEditedDocument({ ...editedDocument, content: newContent })}
                  readOnly={false}
                  showControls={selectedDocument.type === 'notation'}
                />
                <div className="div-radio">
                  <button className="gumb action-btn" onClick={handleSaveEdit}>
                    <Icon icon="solar:disk-broken" /> Spremi
                  </button>
                  <button className="gumb action-btn" onClick={handleCancelEdit}>
                    <Icon icon="solar:close-circle-broken" /> Odustani
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="tablica">
                  <div className="tr naziv">
                    <div className="th">Informacije</div>
                    <div className="th">Vrijednost</div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Naziv</div>
                    <div className="th">
                      {selectedDocument.type === 'pdf' && selectedDocument.pdfData ? 
                        (() => {
                          try {
                            const pdfData = JSON.parse(selectedDocument.pdfData);
                            return pdfData.originalName || selectedDocument.name;
                          } catch (e) {
                            return selectedDocument.name;
                          }
                        })() : selectedDocument.name}
                    </div>
                  </div>
                  {selectedDocument.type === 'pdf' && selectedDocument.pdfData && (() => {
                    try {
                      const pdfData = JSON.parse(selectedDocument.pdfData);
                      if (pdfData.originalName && pdfData.originalName !== selectedDocument.name) {
                        return (
                          <div className="tr redak">
                            <div className="th">Sistemski naziv</div>
                            <div className="th">{selectedDocument.name}</div>
                          </div>
                        );
                      }
                    } catch (e) {}
                    return null;
                  })()}
                  <div className="tr redak">
                    <div className="th">Tip</div>
                    <div className="th">{selectedDocument.type}</div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Kreirao</div>
                    <div className="th">{selectedDocument.creatorName}</div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Datum kreiranja</div>
                    <div className="th">
                      {new Date(selectedDocument.createdAt).toLocaleDateString('hr-HR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Status</div>
                    <div className="th" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedDocument.creatorId === user.id ? (
                        <div className="toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            className={`toggle-switch ${selectedDocument.isPublic ? 'active' : ''}`}
                            onClick={async () => {
                              try {
                                await ApiConfig.api.put(`/api/documents/${selectedDocument.id}`, {
                                  ...selectedDocument,
                                  isPublic: !selectedDocument.isPublic
                                });
                                setSelectedDocument({
                                  ...selectedDocument,
                                  isPublic: !selectedDocument.isPublic
                                });
                                fetchFiles();
                                setNotification({
                                  type: 'success',
                                  message: `Dokument je sada ${!selectedDocument.isPublic ? 'javan' : 'privatan'}`
                                });
                              } catch (error) {
                                console.error('Error updating document visibility:', error);
                                setNotification({
                                  type: 'error',
                                  message: 'Greška pri promjeni vidljivosti dokumenta'
                                });
                              }
                            }}
                            style={{
                              width: '48px',
                              height: '24px',
                              backgroundColor: selectedDocument.isPublic ? 'rgb(var(--isticanje))' : 'rgba(var(--isticanje), 0.3)',
                              borderRadius: '12px',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'background-color 0.3s ease'
                            }}
                          >
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: selectedDocument.isPublic ? '26px' : '2px',
                                transition: 'left 0.3s ease',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                            {selectedDocument.isPublic ? 'Javno' : 'Privatno'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          color: selectedDocument.isPublic ? 'rgb(var(--isticanje))' : 'var(--text)'
                        }}>
                          <Icon 
                            icon={selectedDocument.isPublic ? "solar:global-broken" : "solar:lock-keyhole-minimalistic-linear"} 
                            style={{ fontSize: '1.2rem' }}
                          />
                          {selectedDocument.isPublic ? 'Javno' : 'Privatno'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Kreirao</div>
                    <div className="th">{selectedDocument.creatorName}</div>
                  </div>
                  <div className="tr redak">
                    <div className="th">Datum kreiranja</div>
                    <div className="th">
                      {new Date(selectedDocument.createdAt).toLocaleDateString('hr-HR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {selectedDocument.sharedToIds && selectedDocument.sharedToIds.length > 0 && (
                    <div className="tr redak">
                      <div className="th">Dijeljeno s</div>
                      <div className="th">
                        <div className="shared-users">
                          {selectedDocument.sharedToIds.map((userId, index) => (
                            <span key={userId} className="shared-user">
                              {selectedDocument.sharedWith?.[index]?.ime} {selectedDocument.sharedWith?.[index]?.prezime}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && selectedDocument.type === 'url' && (
                  <div className="content-preview">
                    <div style={{
                      padding: '1rem',
                      marginTop: '1rem',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--background)'
                    }}>
                      <a 
                        href={selectedDocument.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: 'rgb(var(--isticanje))',
                          textDecoration: 'none',
                          wordBreak: 'break-all'
                        }}
                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {selectedDocument.content}
                      </a>
                    </div>
                  </div>
                )}

                <div className="div-radio">
                  {selectedDocument.creatorId === user.id && (
                    <button
                      className="gumb action-btn"
                      onClick={() => {
                        setShowShareModal(true);
                        setShowDocumentDetails(false);
                      }}
                    >
                      <Icon icon="solar:share-broken" /> Dijeli
                    </button>
                  )}
                  
                  {selectedDocument.type !== 'folder' && (
                    <>
                      {/* Edit button - show for text and notation only */}
                      {(selectedDocument.type === 'text' || selectedDocument.type === 'notation' || selectedDocument.type === 'url') && 
                       (selectedDocument.creatorId === user.id || selectedDocument.sharedToIds?.includes(user.id)) && (
                        <button
                          className="gumb action-btn"
                          onClick={handleEdit}
                        >
                          <Icon icon="solar:pen-broken" /> Uredi
                        </button>
                      )}

                      {/* View button - show for all document types */}
                      {(selectedDocument.type === 'url' || selectedDocument.type === 'pdf' || 
                        ((selectedDocument.type === 'text' || selectedDocument.type === 'notation') && 
                         selectedDocument.isPublic && 
                         selectedDocument.creatorId !== user.id && 
                         !selectedDocument.sharedToIds?.includes(user.id))) && (
                        <button
                          className="gumb action-btn"
                          onClick={() => {
                            if (selectedDocument.type === 'text' || selectedDocument.type === 'notation') {
                              setShowNotationEditor(selectedDocument.type === 'notation');
                              setEditedDocument({
                                ...selectedDocument,
                                name: selectedDocument.name,
                                content: selectedDocument.content
                              });
                              setIsEditing(false);
                              setShowDocumentDetails(false);
                            } else {
                              handleViewDocument(selectedDocument);
                            }
                          }}
                        >
                          <Icon icon="solar:eye-broken" /> Pregledaj
                        </button>
                      )}

                      {/* Download button - show for PDF, text, and notation */}
                      {(selectedDocument.type === 'pdf' || selectedDocument.type === 'text' || selectedDocument.type === 'notation') && (
                        <button
                          className="gumb action-btn"
                          onClick={() => handleDownloadDocument(selectedDocument)}
                        >
                          <Icon icon="solar:file-download-broken" /> Preuzmi
                        </button>
                      )}
                    </>
                  )}

                  {selectedDocument.creatorId === user.id && (
                    <button
                      className="gumb action-btn abDelete"
                      onClick={() => {
                        if (selectedDocument.type === 'folder') {
                          handleDeleteFolder(selectedDocument);
                        } else {
                          handleDelete(selectedDocument);
                        }
                        setShowDocumentDetails(false);
                      }}
                    >
                      <Icon icon="solar:trash-bin-trash-broken" /> Obriši
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddDocumentModal
          onAdd={handleAddDocument}
          onCancel={() => setShowAddModal(false)}
          currentFolder={currentFolder}
        />
      )}

      {showShareModal && selectedDocument && (
        <ShareDocumentModal
          document={selectedDocument}
          onShare={handleShareSubmit}
          onCancel={() => setShowShareModal(false)}
        />
      )}

      {/* Full-screen editor popup */}
      {((isEditing || showNotationEditor || editedDocument) && editedDocument) && (
        <div className="notation-editor-fullscreen">
          <div className="notation-editor-header">
            <div className="header-buttons">
              <button className="gumb action-btn" onClick={handleCancelEdit}>
                <Icon icon="solar:arrow-left-broken" /> Back
              </button>
              {editedDocument?.type === 'notation' && (
                <button 
                  className="gumb action-btn" 
                  onClick={handlePrint}
                >
                  <Icon icon="solar:printer-broken" /> Print
                </button>
              )}
              {isEditing && (
                <button className="gumb action-btn spremiBtn" onClick={handleSaveEdit}>
                  <Icon icon="solar:disk-broken" /> Save
                </button>
              )}
            </div>
          </div>

          {editedDocument.type === 'notation' ? (
            <>
              {/* Main preview area */}
              <div id="paper" className="notation-preview-large"></div>
              <div id="abc-warnings" className="abc-warnings"></div>
              
              {/* Audio controls - moved before the toggle button */}
              <div id="audio-controls" className="audio-controls" style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '600px',
                padding: '10px 20px',
                backgroundColor: 'var(--iznad)',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000
              }}>
              </div>

              {/* Controls toggle button - only show in edit mode */}
              {isEditing && (
                <button
                  className={`action-btn controls-toggle ${showControls ? 'active' : ''}`}
                  onClick={() => setShowControls(!showControls)}
                >
                  <Icon icon={showControls ? "solar:close-circle-broken" : "solar:keyboard-broken"} />
                </button>
              )}

              {/* Controls panel - only show in edit mode */}
              {isEditing && (
                <div className={`controls-panel ${showControls ? 'visible' : ''}`}>
                  <div className="input-methods">
                    <div className="input-mode-tabs">
                      <button
                        className={`action-btn ${!isKeyboardMode ? 'active' : ''}`}
                        onClick={() => setIsKeyboardMode(false)}
                        title="Text Mode"
                      >
                        <Icon icon="solar:text-bold-broken" />
                        Text Mode
                      </button>
                      <button
                        className={`action-btn ${isKeyboardMode ? 'active' : ''}`}
                        onClick={() => setIsKeyboardMode(true)}
                        title="ABC Guide"
                      >
                        <Icon icon="solar:info-circle-broken" />
                        ABC Guide
                      </button>
                    </div>

                    {!isKeyboardMode ? (
                      <textarea
                        id="abc-editor"
                        className="notation-input-area"
                        value={editedDocument.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          setEditedDocument({ ...editedDocument, content: newContent });
                          // Update the ABC notation preview
                          try {
                            abcjs.renderAbc('paper', newContent, {
                              responsive: 'resize',
                              add_classes: true,
                              paddingbottom: 20,
                              paddingtop: 20,
                              staffwidth: document.getElementById('paper')?.offsetWidth - 40,
                              wrap: {
                                minSpacing: 1.8,
                                maxSpacing: 2.7,
                                preferredMeasuresPerLine: 4
                              },
                              format: {
                                gchordfont: "Arial",
                                wordsfont: "Arial",
                                vocalfont: "Arial"
                              }
                            });
                          } catch (error) {
                            console.error('Error rendering ABC notation:', error);
                          }
                        }}
                        placeholder="Enter ABC notation here..."
                        readOnly={!isEditing}
                      />
                    ) : (
                      <div className="abc-instructions">
                        <div className="instruction-section">
                          <h4>Basic Notes</h4>
                          <p>Use letters A-G for notes. Lowercase for higher octave:</p>
                          <pre>C D E F G A B c</pre>
                        </div>

                        <div className="instruction-section">
                          <h4>Note Lengths</h4>
                          <p>Add numbers after notes:</p>
                          <pre>
C2 (half note)<br />
C (quarter note)<br />
C/2 (eighth note)<br />
C/4 (sixteenth note)</pre>
                        </div>

                        <div className="instruction-section">
                          <h4>Accidentals</h4>
                          <p>Add before notes:</p>
                          <pre>
^C (sharp)<br />
_C (flat)<br />
=C (natural)</pre>
                        </div>

                        <div className="instruction-section">
                          <h4>Bar Lines</h4>
                          <p>Use | for bar lines:</p>
                          <pre>C D E F | G A B c |</pre>
                        </div>

                        <div className="instruction-section">
                          <h4>Required Header Fields</h4>
                          <pre> X:1 (reference number)
                            T:Title<br />
                            M:4/4 (time signature)<br />
                            L:1/4 (default note length)<br />
                            K:C (key signature)</pre>
                        </div>

                        <div className="instruction-section">
                          <h4>Example</h4>
                          <pre>
                            X:1<br />
                            T:Simple Scale<br />
                            M:4/4<br />
                            L:1/4<br />
                            K:C<br />
                            C D E F | G A B c |
</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : editedDocument.type === 'url' ? (
            <div className="text-editor-container">
              <div className="url-editor">
                <label htmlFor="urlInput">URL:</label>
                <input
                  id="urlInput"
                  type="url"
                  value={editedDocument.content || ''}
                  onChange={(e) => {
                    setEditedDocument({ ...editedDocument, content: e.target.value });
                  }}
                  placeholder="Enter URL..."
                  readOnly={!isEditing}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--background)'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-editor-container">
              <TiptapEditor
                content={editedDocument.content || ''}
                onUpdate={({ editor }) => {
                  if (isEditing && editedDocument.type === 'text') {
                    setEditedDocument({ 
                      ...editedDocument, 
                      content: editor.getHTML()
                    });
                    setHasUnsavedChanges(true);
                  }
                }}
                editable={isEditing && (editedDocument.creatorId === user.id || editedDocument.sharedToIds?.includes(user.id))}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Tiptap Editor Component
const TiptapEditor = ({ content, onUpdate, editable }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: onUpdate,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-container">
      <div className="tiptap-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`action-btn ${editor.isActive('bold') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:bold" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`action-btn ${editor.isActive('italic') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:italic" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`action-btn ${editor.isActive('strike') ? 'active' : ''}`}
        >
          <Icon icon="solar:text-cross-outline" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`action-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:heading-1" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`action-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:heading-2" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`action-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:list-ul" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`action-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:list-ol" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default Documents;