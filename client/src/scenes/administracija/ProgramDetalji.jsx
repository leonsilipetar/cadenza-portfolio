import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';
import Notification from '../../components/Notifikacija';

const ProgramDetalji = ({ program, onClose, onUpdate }) => {
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

  useEffect(() => {
    if (program) {
      const transformedTipovi = {};
      if (Array.isArray(program.tipovi)) {
        program.tipovi.forEach(({ tip, cijena }) => {
          transformedTipovi[tip] = cijena.toString();
        });
      }

      setFormData({
        naziv: program.naziv,
        tipovi: {
          grupno: transformedTipovi.grupno || '',
          individualno1: transformedTipovi.individualno1 || '',
          individualno2: transformedTipovi.individualno2 || '',
          none: transformedTipovi.none || ''
        }
      });
    }
  }, [program]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const transformedData = {
        naziv: formData.naziv,
        tipovi: Object.entries(formData.tipovi)
          .filter(([_, cijena]) => cijena !== '' && parseFloat(cijena) > 0)
          .map(([tip, cijena]) => ({
            tip,
            cijena: parseFloat(cijena)
          }))
      };

      const response = await ApiConfig.api.put(
        `/api/programs/${program.id}`,
        transformedData
      );

      setNotification({
        type: 'success',
        message: 'Program uspješno ažuriran!'
      });

      setTimeout(() => {
        onUpdate(response.data);
      }, 1500);
    } catch (err) {
      console.error('Error updating program:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Greška pri ažuriranju programa'
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
        <h2>Uredi program</h2>

        <div className="div">
          <label>Naziv programa:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.naziv}
            onChange={(e) => setFormData({ ...formData, naziv: e.target.value })}
            required
          />
        </div>

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
          <button
            type="button"
            className="gumb action-btn zatvoriBtn"
            onClick={onClose}
          >
            <Icon icon="solar:close-circle-broken" /> Odustani
          </button>
          <button
            type="submit"
            className="gumb action-btn spremiBtn"
          >
            <Icon icon="solar:disk-circle-broken" /> Spremi
          </button>
        </div>
      </form>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
        />
      )}
    </div>
  );
};

export default ProgramDetalji;