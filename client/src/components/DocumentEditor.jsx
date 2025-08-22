import React, { useState, useEffect, useCallback } from 'react';
import ABCJS from 'abcjs';
import './DocumentEditor.css';

const DocumentEditor = ({ 
  content, 
  type, 
  onChange, 
  readOnly = false,
  showControls = true 
}) => {
  const [editMode, setEditMode] = useState('text'); // 'text' or 'keyboard'
  const [currentContent, setCurrentContent] = useState(content || '');
  const [previewError, setPreviewError] = useState(null);

  // Initialize notation editor
  useEffect(() => {
    if (type === 'notation' && currentContent) {
      try {
        ABCJS.renderAbc('notation-preview-edit', currentContent, {
          responsive: 'resize',
          add_classes: true,
          paddingbottom: 0,
          paddingleft: 0,
          paddingright: 0,
          paddingtop: 0,
          staffwidth: 800,
          scale: 1.5
        });
        setPreviewError(null);
      } catch (error) {
        console.error('ABC Notation rendering error:', error);
        setPreviewError('Error rendering notation. Please check your ABC notation syntax.');
      }
    }
  }, [currentContent, type]);

  // Handle content changes
  const handleContentChange = useCallback((newContent) => {
    setCurrentContent(newContent);
    onChange?.(newContent);
  }, [onChange]);

  // Handle keyboard input for notation
  const handleNotationInput = useCallback((input) => {
    const newContent = currentContent + input;
    handleContentChange(newContent);
  }, [currentContent, handleContentChange]);

  // Notation keyboard controls
  const renderNotationControls = () => {
    if (!showControls || type !== 'notation') return null;

    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const accidentals = ['^', '_', '='];
    const durations = ['1', '2', '4', '8', '16'];
    const barLines = ['|', '||', '|]'];

    return (
      <div className="notation-controls">
        <div className="control-group">
          <div className="mode-switcher">
            <button 
              className={editMode === 'text' ? 'active' : ''} 
              onClick={() => setEditMode('text')}
            >
              Text
            </button>
            <button 
              className={editMode === 'keyboard' ? 'active' : ''} 
              onClick={() => setEditMode('keyboard')}
            >
              Keyboard
            </button>
          </div>
        </div>

        {editMode === 'keyboard' && (
          <>
            <div className="control-group">
              <h4>Notes</h4>
              {notes.map(note => (
                <button key={note} onClick={() => handleNotationInput(note)}>
                  {note}
                </button>
              ))}
            </div>

            <div className="control-group">
              <h4>Accidentals</h4>
              {accidentals.map(acc => (
                <button key={acc} onClick={() => handleNotationInput(acc)}>
                  {acc === '^' ? '♯' : acc === '_' ? '♭' : '♮'}
                </button>
              ))}
            </div>

            <div className="control-group">
              <h4>Duration</h4>
              {durations.map(dur => (
                <button key={dur} onClick={() => handleNotationInput(dur)}>
                  {dur}
                </button>
              ))}
            </div>

            <div className="control-group">
              <h4>Bar Lines</h4>
              {barLines.map(bar => (
                <button key={bar} onClick={() => handleNotationInput(bar)}>
                  {bar}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="document-editor">
      {type === 'notation' && (
        <div className="notation-preview" id="notation-preview-edit">
          {previewError && <div className="error-message">{previewError}</div>}
        </div>
      )}

      <div className={`editor-container ${editMode}`}>
        {(!readOnly || editMode === 'text') && (
          <textarea
            value={currentContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={type === 'notation' ? 
              'Enter ABC notation here...' : 
              'Enter your text here...'
            }
            readOnly={readOnly}
            className={type === 'notation' ? 'notation-editor' : 'text-editor'}
          />
        )}
        {renderNotationControls()}
      </div>
    </div>
  );
};

export default DocumentEditor; 