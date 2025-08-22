import React, { useState } from 'react';
import { Icon } from '@iconify/react';

const UploadInvoiceModal = ({ onUpload, onCancel, student }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      // Decode the filename
      const decodedName = decodeURIComponent(escape(file.name));
      const newFile = new File([file], decodedName, { type: file.type });
      setSelectedFile(newFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="popup">
      <div className="div div-racun">
        <h3>Učitaj račun za {student?.ime} {student?.prezime}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            required
          />
          <div className="button-group">

          <button type="button" className="gumb cancel" onClick={onCancel}>
              Zatvori
            </button>

            <button type="submit" className="gumb" disabled={!selectedFile}>
              <Icon icon="solar:upload-broken" /> Učitaj
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadInvoiceModal; 