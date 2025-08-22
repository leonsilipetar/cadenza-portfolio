import React, { useState } from 'react';

const DeleteConfirmModal = ({ user, onConfirm, onClose }) => {
  const [oibConfirmation, setOibConfirmation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (oibConfirmation === user.oib) {
      onConfirm(oibConfirmation);
    } else {
      setError('Uneseni OIB ne odgovara OIB-u korisnika');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Potvrda brisanja korisnika</h2>
        <p>Jeste li sigurni da želite obrisati korisnika:</p>
        <p><strong>{user.ime} {user.prezime}</strong></p>
        <p>OIB: {user.oib}</p>
        
        <p className="warning">
          Ova akcija je nepovratna. Svi podaci vezani uz korisnika će biti obrisani.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Za potvrdu unesite OIB korisnika:</label>
            <input
              type="text"
              value={oibConfirmation}
              onChange={(e) => setOibConfirmation(e.target.value)}
              placeholder="Unesite OIB"
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Odustani
            </button>
            <button type="submit" className="btn-delete">
              Obriši
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 