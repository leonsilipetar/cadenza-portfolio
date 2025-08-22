import React, { useEffect } from 'react';
import '../App.css';

const SpecialOccasionPopup = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  image
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus trap
      const popup = document.querySelector('.special-occasion-popup');
      if (popup) {
        popup.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="popup" role="dialog" aria-labelledby="popup-title" aria-describedby="popup-message">
      <div className="div special-occasion-popup" style={{ textAlign: 'center', position: 'relative', maxWidth: '500px' }} tabIndex="-1">
        <button 
          className="zatvoriBtn" 
          onClick={onClose}
          aria-label="Zatvori popup"
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px',
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
        
        {title && <h2 id="popup-title" style={{ marginBottom: '1rem' }}>{title}</h2>}
        
        {image && (
          <div style={{ margin: '1rem auto', maxWidth: '300px' }}>
            <img 
              src={image} 
              alt={title || "Posebna prigoda"} 
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }} 
            />
          </div>
        )}
        
        {message && <p id="popup-message" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>
    </div>
  );
};

export default SpecialOccasionPopup; 