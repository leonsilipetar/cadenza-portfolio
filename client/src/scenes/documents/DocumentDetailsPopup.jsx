import React from 'react';
import { Icon } from '@iconify/react';
import styles from './DocumentDetailsPopup.module.css';

const DocumentDetailsPopup = ({ document, onClose }) => {
  if (!document) return null;

  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'notation':
        return 'Notacija';
      case 'text':
        return 'Tekst';
      case 'folder':
        return 'Mapa';
      default:
        return 'Dokument';
    }
  };

  const getCreatorName = () => {
    if (document.mentorCreator) {
      return `${document.mentorCreator.ime} ${document.mentorCreator.prezime}`;
    }
    if (document.userCreator) {
      return `${document.userCreator.ime} ${document.userCreator.prezime}`;
    }
    return document.creatorName || 'Nepoznat';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <Icon icon="solar:close-circle-broken" />
        </button>

        <div className={styles.header}>
          <Icon 
            icon={document.type === 'notation' ? "solar:music-notes-broken" : "solar:document-broken"} 
            className={styles.icon} 
          />
          <h2 className={styles.title}>{document.name}</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Tip:</span>
            <span className={styles.value}>{getDocumentTypeLabel(document.type)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Kreirao:</span>
            <span className={styles.value}>{getCreatorName()}</span>
          </div>

          {document.description && (
            <div className={styles.description}>
              <h3>Opis</h3>
              <p>{document.description}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              className={styles.actionButton}
              onClick={() => window.open(`/documents/${document.id}`, '_blank')}
            >
              <Icon icon="solar:eye-broken" />
              Otvori dokument
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailsPopup; 