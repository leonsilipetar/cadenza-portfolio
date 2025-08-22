import React, { useState, useEffect } from 'react';
import ApiConfig from '../../components/apiConfig';
import Notification from '../../components/Notifikacija';

const DodajClassroom = ({ onDodajClassroom, onCancel, schools }) => {
  const [inputs, setInputs] = useState({
    name: '',
    schoolId: '', // Change to schoolId
  });
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'schoolId' ? parseInt(value, 10) : value, // Parse schoolId as an integer
    }));
  };

  const dodajClassroom = async () => {
    try {
      const res = await ApiConfig.api.post('/api/classrooms', inputs);
      return res.data;
    } catch (err) {
      console.error('Error adding classroom:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Greška pri dodavanju učionice'
      });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dodajClassroom();
    if (result) {
      setNotification({
        type: 'success',
        message: 'Učionica uspješno dodana!',
      });
      if (typeof onDodajClassroom === 'function') {
        onDodajClassroom(); // Notify parent component if it's a function
      }
    } else {
      setNotification({
        type: 'error',
        message: 'Došlo je do greške! Pokušajte ponovno.',
      });
    }
  };

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div">
          <label htmlFor="classroom-name">Naziv učionice:</label>
          <input
            className="input-login-signup"
            value={inputs.name}
            onChange={handleChange}
            type="text"
            name="name"
            id="classroom-name"
            placeholder="Naziv učionice"
            required
          />
          <label htmlFor="classroom-school">Škola:</label>
          <select
            className="input-login-signup"
            value={inputs.schoolId}
            onChange={handleChange}
            name="schoolId"
            id="classroom-school"
            required
          >
            <option value="">Odaberi školu</option>
            {schools?.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div className="div-radio">
          <button className="gumb action-btn zatvoriBtn" type="button" onClick={onCancel}>
            Zatvori
          </button>
          <button className="gumb action-btn spremiBtn" type="submit">
            Dodaj učionicu
          </button>
        </div>
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </form>
    </div>
  );
};

export default DodajClassroom;
