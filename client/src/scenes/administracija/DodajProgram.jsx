import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';
import Notifikacija from '../../components/Notifikacija';

const DodajProgram = ({ onDodajProgram, onCancel, user }) => {
  const [formData, setFormData] = useState({
    naziv: '',
    tipovi: {
      grupno: '',
      individualno1: '',
      individualno2: '',
      none: ''
    }
  });
  const [notification, setNotification] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Transform data for API and include school
      const transformedData = {
        naziv: formData.naziv,
        tipovi: Object.entries(formData.tipovi)
          .filter(([_, cijena]) => cijena !== '' && parseFloat(cijena) > 0)
          .map(([tip, cijena]) => ({
            tip,
            cijena: parseFloat(cijena)
          })),
        schoolId: user.schoolId // Add school ID from user
      };

      await ApiConfig.api.post('/api/programs', transformedData);

      setNotification({
        type: 'success',
        message: 'Program uspješno dodan!'
      });

      setTimeout(() => {
        onDodajProgram();
      }, 1500);
    } catch (err) {
      console.error('Error adding program:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Greška pri dodavanju programa'
      });
    }
  };

  const handlePriceChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      tipovi: {
        ...prev.tipovi,
        [type]: value
      }
    }));
  };

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div">
          <label htmlFor='prog-Ime'>Naziv programa:</label>
          <input
            className="input-login-signup"
            type="text"
            id='prog-Ime'
            value={formData.naziv}
            onChange={(e) => setFormData({ ...formData, naziv: e.target.value })}
            required
          />
        </div>

        {/* Grupno */}
        <div className="div">
          <label>Grupno (EUR):</label>
          <input
            className="input-login-signup"
            type="number"
            min="0"
            step="0.01"
            value={formData.tipovi.grupno}
            onChange={(e) => handlePriceChange('grupno', e.target.value)}
            placeholder="Unesite cijenu za grupni program"
          />
        </div>

        {/* Individualno 1x */}
        <div className="div">
          <label>Individualno 1x tjedno (EUR):</label>
          <input
            className="input-login-signup"
            type="number"
            min="0"
            step="0.01"
            value={formData.tipovi.individualno1}
            onChange={(e) => handlePriceChange('individualno1', e.target.value)}
            placeholder="Unesite cijenu za individualni program 1x tjedno"
          />
        </div>

        {/* Individualno 2x */}
        <div className="div">
          <label>Individualno 2x tjedno (EUR):</label>
          <input
            className="input-login-signup"
            type="number"
            min="0"
            step="0.01"
            value={formData.tipovi.individualno2}
            onChange={(e) => handlePriceChange('individualno2', e.target.value)}
            placeholder="Unesite cijenu za individualni program 2x tjedno"
          />
        </div>

        {/* Poseban program */}
        <div className="div">
          <label>Poseban program (EUR):</label>
          <input
            className="input-login-signup"
            type="number"
            min="0"
            step="0.01"
            value={formData.tipovi.none}
            onChange={(e) => handlePriceChange('none', e.target.value)}
            placeholder="Unesite cijenu za poseban program"
          />
        </div>

        <div className="div-radio">
          <button type="button" className="gumb action-btn zatvoriBtn" onClick={onCancel}>
            Odustani
          </button>
          <button type="submit" className="gumb action-btn spremiBtn">Dodaj</button>
        </div>
      </form>
      {notification && (
          <Notifikacija
            type={notification.type}
            message={notification.message}
          />
        )}
    </div>
  );
};

export default DodajProgram;
