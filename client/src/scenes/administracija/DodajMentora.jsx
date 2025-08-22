import React, { useState, useEffect } from 'react';
import ApiConfig from '../../components/apiConfig';
import Notifikacija from '../../components/Notifikacija';

const DodajMentora = ({ onDodajKorisnika, onCancel }) => {
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState('');
  const [schools, setSchools] = useState([]);
  const [isDodajMentoraDisabled, setIsDodajMentoraDisabled] = useState(false);
  const [notification, setNotification] = useState(null);
  const [inputs, setInputs] = useState({
    korisnickoIme: '',
    email: '',
    ime: '',
    prezime: '',
    isAdmin: false,
    isMentor: true,
    isStudent: false,
    oib: '',
    program: '',
    brojMobitela: '',
    datumRodjenja: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: '',
    },
    napomene: [],
    students: [],
    school: '',
  });

  const handleChange = (e) => {
    setInputs((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const dodajMentora = async () => {
    try {
      const res = await ApiConfig.api.post('/api/signup-mentori', inputs);
      return res.data;
    } catch (err) {
      console.error('Error adding mentor:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Greška pri dodavanju mentora'
      });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsDodajMentoraDisabled(true);
    const result = await dodajMentora();

    if (result) {
      console.log('User registered successfully:', result);
      setStatus('Mentor je uspješno dodan!');
      setNotification({
        type: 'success',
        message: 'Mentor je uspješno dodan!'
      });
      if (typeof onDodajKorisnika === 'function') {
        onDodajKorisnika();
      }
    } else {
      console.log('User registration failed.');
      setStatus('Došlo je do greške prilikom dodavanja mentora!');
      setTimeout(() => {
        setIsDodajMentoraDisabled(false);
        setStatus('Probajte ponovno!');
      }, 3000);
    }
  };

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await ApiConfig.api.get('/api/schools');
        setSchools(res.data);
      } catch (err) {
        console.error('Error fetching schools:', err);
        setNotification({
          type: 'error',
          message: 'Greška pri dohvaćanju škola'
        });
      }
    };

    fetchSchools();
  }, []);

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div">
          <label htmlFor="kor-Korime">Korisničko ime:</label>
          <input
            className="input-login-signup"
            value={inputs.korisnickoIme}
            onChange={handleChange}
            type="text"
            name="korisnickoIme"
            id="kor-Korime"
            placeholder="korisničko ime"
          />
          <label htmlFor="kor-email">Email:</label>
          <input
            className="input-login-signup"
            value={inputs.email}
            onChange={handleChange}
            type="email"
            name="email"
            id="kor-email"
            placeholder="e-mail adresa"
          />
          <label htmlFor="kor-oib">OIB:</label>
          <input
            className="input-login-signup"
            value={inputs.oib}
            onChange={(e) => setInputs({ ...inputs, oib: e.target.value })}
            type="text"
            name="oib"
            id="kor-oib"
            placeholder="OIB"
            maxLength={11}
            pattern="\d{11}"
          />
        </div>

        <div className="div">
          <label htmlFor="kor-ime">Ime:</label>
          <input
            className="input-login-signup"
            value={inputs.ime}
            onChange={handleChange}
            type="text"
            name="ime"
            id="kor-ime"
            placeholder="ime"
          />
          <label htmlFor="kor-prezime">Prezime:</label>
          <input
            className="input-login-signup"
            value={inputs.prezime}
            onChange={handleChange}
            type="text"
            name="prezime"
            id="kor-prezime"
            placeholder="prezime"
          />
          <label htmlFor="kor-datum-rodjenja">Datum rođenja:</label>
          <input
            className="input-login-signup"
            value={inputs.datumRodjenja}
            onChange={(e) => setInputs({ ...inputs, datumRodjenja: e.target.value })}
            type="date"
            name="datumRodjenja"
            id="kor-datum-rodjenja"
            placeholder="datum rođenja"
          />
          <label htmlFor="kor-brojMobitela">Broj mobitela:</label>
          <input
            className="input-login-signup"
            value={inputs.brojMobitela}
            onChange={handleChange}
            type="text"
            name="brojMobitela"
            id="kor-brojMobitela"
            placeholder="broj mobitela"
          />
        </div>
        <div className="div">
          <label htmlFor="kor-skola">Škola:</label>
          <select
            className="input-login-signup"
            value={inputs.school}
            onChange={handleChange}
            name="school"
            id="kor-skola"
          >
            <option key="default" value="">Odaberi školu</option>
            {schools.map((school) => (
              <option key={school._id} value={school._id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className='div'>
          <label htmlFor="kor-ulica">Ulica:</label>
          <input
            className="input-login-signup"
            onChange={(e) => setInputs({ ...inputs, adresa: { ...inputs.adresa, ulica: e.target.value } })}
            type="text"
            name="ulica"
            id="kor-ulica"
            placeholder="ulica"
            value={inputs.adresa.ulica}
          />
          <label htmlFor="kor-kucni-broj">Kućni broj:</label>
          <input
            className="input-login-signup"
            onChange={(e) => setInputs({ ...inputs, adresa: { ...inputs.adresa, kucniBroj: e.target.value } })}
            type="text"
            name="kucniBroj"
            id="kor-kucni-broj"
            placeholder="kućni broj"
            value={inputs.adresa.kucniBroj}
          />
          <label htmlFor="kor-mjesto">Mjesto:</label>
          <input
            className="input-login-signup"
            onChange={(e) => setInputs({ ...inputs, adresa: { ...inputs.adresa, mjesto: e.target.value } })}
            type="text"
            name="mjesto"
            id="kor-mjesto"
            placeholder="mjesto"
            value={inputs.adresa.mjesto}
          />
        </div>

        <div className="div-radio">
          <div
            className={`radio-item ${inputs.isAdmin ? 'checked' : ''}`}
            onClick={() => setInputs({ ...inputs, isAdmin: !inputs.isAdmin })}
          >
            <input
              type="radio"
              id="isAdmin"
              checked={inputs.isAdmin}
              onChange={() => setInputs({ ...inputs, isAdmin: !inputs.isAdmin })}
              style={{ display: 'none' }}
            />
            {inputs.isAdmin ? 'Administrator' : 'Nije administrator'}
          </div>
        </div>

        <div className="div">
          <label htmlFor="kor-napomene">Napomene:</label>
          <textarea
            className="input-login-signup"
            value={inputs.napomene}
            onChange={(e) => setInputs({ ...inputs, napomene: e.target.value })}
            name="napomene"
            id="kor-napomene"
            placeholder="Unesite napomene o korisniku "
            maxLength={5000}
          />
        </div>

        <div className='div-radio'>
          <button
            className="gumb action-btn zatvoriBtn primary-btn"
            onClick={() => onCancel()}
            type="button"
          >
            Zatvori
          </button>
          <button
            className={`gumb action-btn spremiBtn ${isDodajMentoraDisabled ? 'disabledSpremiBtn' : ''}`}
            type="submit"
            disabled={isDodajMentoraDisabled}
          >
            {isDodajMentoraDisabled ? 'Spremanje' : 'Dodaj mentora'}
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

export default DodajMentora;