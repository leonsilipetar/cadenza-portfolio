import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import abcjs from 'abcjs';
import 'abcjs/abcjs-audio.css';

const AddDocumentModal = ({ onAdd, onCancel, currentFolder }) => {
  const [type, setType] = useState('url');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [notationPreview, setNotationPreview] = useState(null);

  // Handle notation preview
  const handleNotationChange = (value) => {
    setContent(value);
    try {
      // Clear previous rendering
      document.getElementById('notation-preview').innerHTML = '';
      // Render new notation
      abcjs.renderAbc('notation-preview', value, {
        responsive: 'resize',
        paddingbottom: 20,
        paddingtop: 20,
      });
    } catch (error) {
      console.error('Error rendering notation:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      if (type === 'pdf' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('isPublic', isPublic);
        formData.append('type', type);
        if (currentFolder) {
          formData.append('parentId', currentFolder);
        }
        await onAdd(formData, 'pdf');
      } else {
        const documentData = {
          name: name.trim(),
          type,
          content: type === 'url' ? content : '',
          isPublic,
          parentId: currentFolder || null
        };
        await onAdd(documentData);
      }
    } catch (error) {
      console.error('Dosegnuli ste limit - imate 10 datoteka', error);
    }
  };

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div div-clmn">
          <div className="div">
            <h3>Novi dokument</h3>
          </div>

          {/* Document Type Selection */}
          <div className="div">
            <label>Tip dokumenta:</label>
            <div className="div-radio">
              <button
                type="button"
                className={`gumb action-btn  ${type === 'folder' ? 'active' : ''}`}
                onClick={() => setType('folder')}
              >
                <Icon icon="solar:folder-with-files-broken" /> Mapa
              </button>
              <button
                type="button"
                className={`gumb action-btn ${type === 'url' ? 'active' : ''}`}
                onClick={() => setType('url')}
              >
                <Icon icon="solar:link-circle-broken" /> URL
              </button>
              <button
                type="button"
                className={`gumb action-btn ${type === 'pdf' ? 'active' : ''}`}
                onClick={() => setType('pdf')}
              >
                <Icon icon="solar:file-favourite-broken" /> PDF
              </button>
              <button
                type="button"
                className={`gumb action-btn ${type === 'text' ? 'active' : ''}`}
                onClick={() => setType('text')}
              >
                <Icon icon="solar:file-text-broken" /> Tekst
              </button>
              <button
                type="button"
                className={`gumb action-btn  ${type === 'notation' ? 'active' : ''}`}
                onClick={() => setType('notation')}
              >
                <Icon icon="solar:music-note-broken" /> Notacija
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div className="div">
            <label>Naziv:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='input-login-signup'
              required
            />
          </div>

          {/* Content Field (for URL only) */}
          {type === 'url' && (
            <div className="div">
              <label>URL:</label>
              <input
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className='input-login-signup'
              />
            </div>
          )}

          {/* File Upload (for PDF) */}
          {type === 'pdf' && (
            <div className="div">
              <label>PDF datoteka:</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                required
                className='input-login-signup'
              />
            </div>
          )}

          {/* Public/Private Toggle */}
          <div className="div">
            <div className="checkbox-group">
              <div
                className={`checkbox-item ${isPublic ? 'checked' : ''}`}
                onClick={() => setIsPublic(!isPublic)}
              >
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                  style={{ display: 'none' }}
                />
                {isPublic ? 'Javno dostupno' : 'Privatno'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="div-radio">
            <button
              type="button"
              className="action-btn zatvoriBtn"
              onClick={onCancel}
            >
              Zatvori
            </button>
            <button
              type="submit"
              className="action-btn spremiBtn"
            >
              <Icon icon="solar:add-circle-broken" /> Dodaj
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddDocumentModal;