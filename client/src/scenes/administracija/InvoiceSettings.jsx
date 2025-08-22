import React, { useState, useEffect } from 'react';
import ApiConfig from '../../components/apiConfig';
import { Icon } from '@iconify/react';
import Notifikacija from '../../components/Notifikacija';

const InvoiceSettings = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nazivObrta: '',
    oib: '',
    iban: '',
    brojRacuna: '',
    dodatneInformacije: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: '',
      postanskiBroj: ''
    }
  });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log('Fetching invoice settings...');
        const response = await ApiConfig.api.get('/api/invoice-settings');
        console.log('Response:', response.data);
        if (response.data) {
          // Split the address into components
          const [ulica, kucniBroj] = (response.data.address || '').split(/(?<=\D)\s*(\d.*)/).filter(Boolean);

          setFormData(prevData => ({
            ...prevData,
            ...response.data,
            adresa: {
              ulica: ulica || '',
              kucniBroj: kucniBroj || '',
              mjesto: response.data.city || '',
              postanskiBroj: response.data.postalCode || ''
            }
          }));
        }
      } catch (err) {
        console.error('Full error:', err);
        console.error('Error fetching invoice settings:', err);
        setNotification({
          type: 'error',
          message: `Greška pri dohvaćanju postavki računa: ${err.response?.data?.error || err.message}`
        });
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);

    // Format OIB and IBAN before sending
    const formattedData = {
      ...formData,
      oib: formData.oib.replace(/[^0-9]/g, '').slice(0, 11),
      iban: formData.iban.replace(/\s/g, '').slice(0, 22),
      // Transform address components back to the format expected by the server
      address: `${formData.adresa.ulica} ${formData.adresa.kucniBroj}`,
      city: formData.adresa.mjesto,
      postalCode: formData.adresa.postanskiBroj,
      // Remove the nested adresa object as we're sending flattened data
      adresa: undefined
    };

    try {
      const response = await ApiConfig.api.post('/api/invoice-settings', formattedData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        onSave(response.data);
        setNotification({
          type: 'success',
          message: 'Postavke računa uspješno spremljene'
        });
      }
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.details?.[0] || err.response?.data?.error || 'Greška pri spremanju postavki računa'
      });
    }
  };

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>

        <div className="div">
          <label>Naziv obrta:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.nazivObrta}
            onChange={(e) => setFormData({ ...formData, nazivObrta: e.target.value })}
            required
          />
        </div>

        <div className="div">
          <label>OIB:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.oib}
            onChange={(e) => setFormData({ ...formData, oib: e.target.value })}
            required
          />
        </div>

        <div className="div">
          <label>IBAN:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.iban}
            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            required
          />
        </div>

        <div className="div">
          <label>Adresa:</label>
          <input
            className="input-login-signup"
            type="text"
            placeholder="Ulica"
            value={formData.adresa.ulica}
            onChange={(e) => setFormData({
              ...formData,
              adresa: { ...formData.adresa, ulica: e.target.value }
            })}
            required
          />
        </div>

        <div className="div">
          <label>Kućni broj:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.adresa.kucniBroj}
            onChange={(e) => setFormData({
              ...formData,
              adresa: { ...formData.adresa, kucniBroj: e.target.value }
            })}
            required
          />
        </div>

        <div className="div">
          <label>Mjesto:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.adresa.mjesto}
            onChange={(e) => setFormData({
              ...formData,
              adresa: { ...formData.adresa, mjesto: e.target.value }
            })}
            required
          />
        </div>

        <div className="div">
          <label>Poštanski broj:</label>
          <input
            className="input-login-signup"
            type="text"
            value={formData.adresa.postanskiBroj}
            onChange={(e) => setFormData({
              ...formData,
              adresa: { ...formData.adresa, postanskiBroj: e.target.value }
            })}
            required
          />
        </div>

        <div className="div">
          <label>Dodatne informacije:</label>
          <textarea
            className="input-login-signup"
            value={formData.dodatneInformacije}
            onChange={(e) => setFormData({ ...formData, dodatneInformacije: e.target.value })}
            rows={4}
            placeholder="Npr. Način plaćanja, rok plaćanja, napomene..."
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
        <Notifikacija
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default InvoiceSettings;