import React, { useState, useEffect } from 'react';
import ApiConfig from '../../components/apiConfig';
import Notification from '../../components/Notifikacija';
import { Icon } from '@iconify/react';

const DodajKorisnika = ({ onDodajKorisnika, onCancel }) => {
  const [mentors, setMentors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [notification, setNotification] = useState(null);
  const [programInput, setProgramInput] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [programToRemove, setProgramToRemove] = useState(null);
  const [programTypes, setProgramTypes] = useState({});
  const [inputs, setInputs] = useState({
    email: '',
    ime: '',
    prezime: '',
    isAdmin: false,
    isMentor: false,
    isStudent: true,
    oib: '',
    brojMobitela: '',
    datumRodjenja: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: '',
    },
    pohadjaTeoriju: false,
    napomene: '',
    maloljetniClan: false,
    roditelj1: {
      ime: '',
      prezime: '',
      brojMobitela: ''
    },
    roditelj2: {
      ime: '',
      prezime: '',
      brojMobitela: '',
    },
    schoolId: '',
  });

  const fetchPrograms = async (schoolId) => {
    try {
      if (!schoolId) {
        setPrograms([]);
        return;
      }

      const programsRes = await ApiConfig.api.get('/api/programs', {
        params: { schoolId }
      });

      if (Array.isArray(programsRes.data)) {
        setPrograms(programsRes.data);
      } else {
        console.error('Invalid programs data format:', programsRes.data);
        setPrograms([]);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri učitavanju programa'
      });
      setPrograms([]);
    }
  };

  const handleAddProgram = async (programId) => {
    try {
      const program = programs.find(p => p.id === programId);
      if (!program) return;

      // Check for duplicate
      const isDuplicate = selectedPrograms.some(p => p.id === programId);
      if (isDuplicate) {
        setNotification({
          type: 'warning',
          message: 'Program je već dodan'
        });
        return;
      }

      setSelectedPrograms(prev => [...prev, program]);
      setProgramInput('');
      setNotification({
        type: 'success',
        message: 'Program uspješno dodan'
      });
    } catch (error) {
      console.error('Error adding program:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri dodavanju programa'
      });
    }
  };

  const handleRemoveProgram = async (programId) => {
    try {
      setSelectedPrograms(prev => prev.filter(program => program.id !== programId));
      setNotification({
        type: 'success',
        message: 'Program uspješno uklonjen'
      });
    } catch (error) {
      console.error('Error removing program:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri uklanjanju programa'
      });
    }
  };

  const handleProgramTypeChange = (programId, newType) => {
    setProgramTypes(prev => ({
      ...prev,
      [programId]: newType
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in inputs.adresa) {
      setInputs((prev) => ({
        ...prev,
        adresa: { ...prev.adresa, [name]: value },
      }));
    } else if (name.startsWith('roditelj1.')) {
      const field = name.split('.')[1];
      setInputs(prev => ({
        ...prev,
        roditelj1: { ...prev.roditelj1, [field]: value }
      }));
    } else if (name.startsWith('roditelj2.')) {
      const field = name.split('.')[1];
      setInputs(prev => ({
        ...prev,
        roditelj2: { ...prev.roditelj2, [field]: value }
      }));
    } else if (name === 'schoolId') {
      const newValue = value ? Number(value) : null;
      setInputs((prev) => ({
        ...prev,
        [name]: newValue,
      }));
      // Clear selected programs when school changes
      setSelectedPrograms([]);
      setProgramTypes({});
      if (newValue) {
        fetchPrograms(newValue);
      } else {
        setPrograms([]);
      }
    } else {
      setInputs((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const dodajKorisnika = async () => {
    try {
      const cleanedInputs = {
        ...inputs,
        schoolId: inputs.schoolId || null,
        adresa: inputs.adresa || {},
        datumRodjenja: inputs.datumRodjenja || null,
        brojMobitela: inputs.brojMobitela || '',
        roditelj1: inputs.roditelj1 || {},
        roditelj2: inputs.roditelj2 || {},
        programs: selectedPrograms.map(program => program.id),
        programType: programTypes
      };

      const res = await ApiConfig.api.post('/api/signup', cleanedInputs);
      return res.data;
    } catch (err) {
      console.error('Error adding student:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Greška pri dodavanju učenika'
      });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dodajKorisnika();
    if (result) {
      setNotification({
        type: 'success',
        message: 'Učenik uspješno dodan!',
      });
      if (typeof onDodajKorisnika === 'function') {
        onDodajKorisnika();
      }
    } else {
      setNotification({
        type: 'error',
        message: 'Došlo je do greške! Pokušajte ponovno.',
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mentorsRes, schoolsRes] = await Promise.all([
          ApiConfig.api.get('/api/mentori'),
          ApiConfig.api.get('/api/schools')
        ]);

        setMentors(mentorsRes.data);
        setSchools(schoolsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setNotification({
          type: 'error',
          message: 'Greška pri dohvaćanju podataka'
        });
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (inputs.schoolId) {
      fetchPrograms(inputs.schoolId);
    }
  }, [inputs.schoolId]);

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div">
          <label htmlFor="kor-email">Email:</label>
          <input
            className="input-login-signup"
            value={inputs.email}
            onChange={handleChange}
            type="email"
            name="email"
            id="kor-email"
            placeholder="e-mail adresa"
            required
          />
          <label htmlFor="kor-oib">OIB:</label>
          <input
            className="input-login-signup"
            value={inputs.oib}
            onChange={handleChange}
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
            onChange={handleChange}
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
            value={inputs.schoolId || ''}
            onChange={handleChange}
            name="schoolId"
            id="kor-skola"
          >
            <option value="">Odaberi školu</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="div">
          <label htmlFor="kor-ulica">Ulica:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="ulica"
            id="kor-ulica"
            placeholder="ulica"
            value={inputs.adresa.ulica}
          />
          <label htmlFor="kor-kucni-broj">Kućni broj:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="kucniBroj"
            id="kor-kucni-broj"
            placeholder="kućni broj"
            value={inputs.adresa.kucniBroj}
          />
          <label htmlFor="kor-mjesto">Mjesto:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="mjesto"
            id="kor-mjesto"
            placeholder="mjesto"
            value={inputs.adresa.mjesto}
          />
        </div>

        <div className="div">
          <h3>Roditelj/Skrbnik 1</h3>
          <label htmlFor="roditelj1-ime">Ime:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj1.ime"
            id="roditelj1-ime"
            placeholder="ime roditelja/skrbnika"
            value={inputs.roditelj1.ime || ''}
          />
          <label htmlFor="roditelj1-prezime">Prezime:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj1.prezime"
            id="roditelj1-prezime"
            placeholder="prezime roditelja/skrbnika"
            value={inputs.roditelj1.prezime || ''}
          />
          <label htmlFor="roditelj1-brojMobitela">Broj mobitela:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj1.brojMobitela"
            id="roditelj1-brojMobitela"
            placeholder="broj mobitela roditelja/skrbnika"
            value={inputs.roditelj1.brojMobitela || ''}
          />
        </div>

        <div className="div">
          <h3>Roditelj/Skrbnik 2</h3>
          <label htmlFor="roditelj2-ime">Ime:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj2.ime"
            id="roditelj2-ime"
            placeholder="ime roditelja/skrbnika"
            value={inputs.roditelj2.ime || ''}
          />
          <label htmlFor="roditelj2-prezime">Prezime:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj2.prezime"
            id="roditelj2-prezime"
            placeholder="prezime roditelja/skrbnika"
            value={inputs.roditelj2.prezime || ''}
          />
          <label htmlFor="roditelj2-brojMobitela">Broj mobitela:</label>
          <input
            className="input-login-signup"
            onChange={handleChange}
            type="text"
            name="roditelj2.brojMobitela"
            id="roditelj2-brojMobitela"
            placeholder="broj mobitela roditelja/skrbnika"
            value={inputs.roditelj2.brojMobitela || ''}
          />
        </div>

        <div className="div-radio">
          <div className="checkbox-group">
            <label>Teorija:</label>
            <div className={`checkbox-item ${inputs.pohadjaTeoriju ? 'checked' : ''}`} onClick={() => setInputs((prev) => ({ ...prev, pohadjaTeoriju: !prev.pohadjaTeoriju }))}>
              <input
                type="checkbox"
                id="pohadjaTeoriju"
                checked={inputs.pohadjaTeoriju}
                onChange={() => setInputs((prev) => ({ ...prev, pohadjaTeoriju: !prev.pohadjaTeoriju }))}
                style={{ display: 'none' }}
              />
              {inputs.pohadjaTeoriju ? 'Pohađa teoriju' : 'Ne pohađa teoriju'}
            </div>
          </div>
        </div>

        <div className="div">
          <label htmlFor="kor-napomene">Napomene:</label>
          <textarea
            className="input-login-signup"
            value={inputs.napomene}
            onChange={handleChange}
            name="napomene"
            id="kor-napomene"
            placeholder="Unesite napomene o korisniku"
            maxLength={5000}
          />
        </div>

        <div className="div">
          <label htmlFor="kor-program">Program:</label>
          <input
            className="input-login-signup"
            type="text"
            value={programInput}
            onChange={(e) => setProgramInput(e.target.value)}
            placeholder="Pretraži programe..."
          />

          {/* Program search results */}
          {programInput.length > 0 && (
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Rezultati pretrage</div>
                <div className="th"></div>
              </div>
              {programs
                .filter(program =>
                  program.naziv.toLowerCase().includes(programInput.toLowerCase()) &&
                  !selectedPrograms.some(sp => sp.id === program.id)
                )
                .map(program => (
                  <div key={program.id} className="tr redak">
                    <div className="th">{program.naziv}</div>
                    <div className="th">
                      <button
                        className="action-btn abEdit"
                        onClick={() => handleAddProgram(program.id)}
                        type="button"
                      >
                        Dodaj
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Selected programs */}
          <div className="tablica">
            <div className="tr naziv">
              <div className="th">Dodani programi</div>
              <div className="th">Tip programa</div>
              <div className="th"></div>
            </div>
            {selectedPrograms.map((program) => (
              <div key={program.id} className="tr redak">
                <div className="th">{program.naziv}</div>
                <div className="th">
                  <select
                    value={programTypes[program.id] || ''}
                    onChange={(e) => handleProgramTypeChange(program.id, e.target.value)}
                    className="input-login-signup"
                    style={{ width: 'auto', minWidth: '200px' }}
                  >
                    <option value="">Odaberi tip</option>
                    {program.tipovi?.map(tip => (
                      <option key={tip.tip} value={tip.tip}>
                        {tip.tip === 'grupno' ? 'Grupno' :
                         tip.tip === 'individualno1' ? 'Individualno 1x tjedno' :
                         tip.tip === 'individualno2' ? 'Individualno 2x tjedno' :
                         'Poseban program'} - {tip.cijena} EUR
                      </option>
                    ))}
                  </select>
                </div>
                <div className="th">
                  {programToRemove?.id === program.id ? (
                    <>
                      <button
                        className="gumb action-btn abDelete"
                        type="button"
                        onClick={() => handleRemoveProgram(program.id)}
                      >
                        Ukloni
                      </button>
                      <button
                        className="gumb action-btn abEdit"
                        type="button"
                        onClick={() => setProgramToRemove(null)}
                      >
                        Odustani
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-btn abDelete"
                      onClick={() => setProgramToRemove(program)}
                      type="button"
                    >
                      <Icon icon="solar:trash-bin-trash-broken" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="div-radio">
          <button
            className="gumb action-btn zatvoriBtn"
            onClick={onCancel}
            type="button"
          >
            Zatvori
          </button>
          <button
            className="gumb action-btn spremiBtn"
            type="submit"
          >
            Dodaj učenika
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

export default DodajKorisnika;
