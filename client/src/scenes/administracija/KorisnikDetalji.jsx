import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ApiConfig from '../../components/apiConfig';
import { Icon } from '@iconify/react';
import { showNotification } from '../../components/Notifikacija';

axios.defaults.withCredentials = true;

const KorisnikDetalji = ({ korisnikId, onCancel }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [mentorPrograms, setMentorPrograms] = useState([]);
  const [inputs, setInputs] = useState({
    korisnickoIme: '',
    email: '',
    ime: '',
    prezime: '',
    isAdmin: false,
    isMentor: false,
    isStudent: true,
    oib: '',
    programId: [{}],
    brojMobitela: '',
    mentorId: [],
    schoolId: '',
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
      brojMobitela: '',
    },
    roditelj2: {
      ime: '',
      prezime: '',
      brojMobitela: '',
    },
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [programInput, setProgramInput] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [programToRemove, setProgramToRemove] = useState(null);
  const [programTypes, setProgramTypes] = useState({});

  const fetchMentors = async () => {
    try {
      const res = await ApiConfig.api.get('/api/mentori');
      setMentors(res.data);
    } catch (err) {
      console.error('Error fetching mentors:', err);
      showNotification('error', 'Greška pri učitavanju mentora');
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await ApiConfig.api.get('/api/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Error fetching schools:', err);
      showNotification('error', 'Greška pri učitavanju škola');
    }
  };

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
      showNotification('error', 'Greška pri učitavanju programa');
      setPrograms([]);
    }
  };

  const getDetaljiKorisnika = async (korisnikId) => {
    try {
      const res = await ApiConfig.api.get(`/api/korisnik/${korisnikId}`);
      return res.data.user;
    } catch (err) {
      console.error('Error fetching user details:', err);
      showNotification('error', 'Greška pri učitavanju detalja korisnika');
      throw err;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === 'checkbox') {
      setInputs((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    // Handle address fields
    if (inputs.adresa && Object.keys(inputs.adresa).includes(name)) {
      setInputs((prev) => ({
        ...prev,
        adresa: { ...prev.adresa, [name]: value || '' },
      }));
      return;
    }

    // Handle parent fields
    if (name.startsWith('roditelj1.')) {
      const field = name.split('.')[1];
      setInputs(prev => ({
        ...prev,
        roditelj1: { ...prev.roditelj1, [field]: value || '' }
      }));
      return;
    }

    if (name.startsWith('roditelj2.')) {
      const field = name.split('.')[1];
      setInputs(prev => ({
        ...prev,
        roditelj2: { ...prev.roditelj2, [field]: value || '' }
      }));
      return;
    }

    // Handle schoolId
    if (name === 'schoolId') {
      const newValue = value ? Number(value) : '';
      setInputs((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      // Clear selected programs when school changes
      setSelectedPrograms([]);
      setProgramTypes({});

      // Fetch new programs for the selected school
      if (newValue) {
        fetchPrograms(newValue);
      } else {
        setPrograms([]); // Clear programs if no school selected
      }
      return;
    }

    // Handle all other fields
    setInputs((prev) => ({
      ...prev,
      [name]: value || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const cleanedInputs = {
        ...inputs,
        napomene: typeof inputs.napomene === 'string' ? [inputs.napomene] : (inputs.napomene || []),
        programs: selectedPrograms.map(program => program.id),
        schoolId: inputs.schoolId || null,
        adresa: inputs.adresa || {},
        datumRodjenja: inputs.datumRodjenja || null,
        brojMobitela: inputs.brojMobitela || '',
        programType: Object.keys(programTypes).length > 0 ? programTypes : undefined
      };

      console.log('Submitting with schoolId:', cleanedInputs.schoolId); // Debug log

      const res = await ApiConfig.api.put(
        `/api/update-korisnik/${korisnikId}`,
        cleanedInputs
      );

      if (res.data) {
        showNotification('success', 'Korisnik uspješno ažuriran');

        // Refetch user data
        const userData = await getDetaljiKorisnika(korisnikId);
        setInputs(prevInputs => ({
          ...prevInputs,
          ...userData,
          mentor: userData.mentorId || '',
          datumRodjenja: userData.datumRodjenja ?
            new Date(userData.datumRodjenja).toISOString().split('T')[0] : '',
          adresa: userData.adresa || { ulica: '', kucniBroj: '', mjesto: '' },
          roditelj1: userData.roditelj1 || { ime: '', prezime: '', brojMobitela: '' },
          roditelj2: userData.roditelj2 || { ime: '', prezime: '', brojMobitela: '' }
        }));
        onCancel();
      }
    } catch (err) {
      console.error('Update error:', err.response?.data || err);
      showNotification('error', err.response?.data?.message || 'Greška pri ažuriranju korisnika');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setIsResetting(true);
      await ApiConfig.api.post('/api/reset-password', {
        userId: korisnikId,
        userType: 'student',
        email: inputs.email
      });
      showNotification('success', 'Nova lozinka je poslana na email.');
      setShowResetConfirm(false);
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Greška pri resetiranju lozinke.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddProgram = async (programId) => {
    try {
      // Find program in either mentorPrograms or regular programs array
      const program = programs.find(p => p.id === programId) || mentorPrograms.find(p => p.id === programId);
      if (!program) return;

      // Check for duplicate
      const isDuplicate = selectedPrograms.some(p => p.id === programId);
      if (isDuplicate) {
        showNotification('warning', 'Program je već dodan');
        return;
      }

      setSelectedPrograms(prev => [...prev, program]);
      setProgramInput('');
      showNotification('success', 'Program uspješno dodan');
    } catch (error) {
      console.error('Error adding program:', error);
      showNotification('error', 'Greška pri dodavanju programa');
    }
  };

  const handleRemoveProgram = async (programId) => {
    try {
      setSelectedPrograms(prev => prev.filter(program => program.id !== programId));
      showNotification('success', 'Program uspješno uklonjen');
    } catch (error) {
      console.error('Error removing program:', error);
      showNotification('error', 'Greška pri uklanjanju programa');
    }
  };

  const handleProgramTypeChange = (programId, newType) => {
    setProgramTypes(prev => ({
      ...prev,
      [programId]: newType
    }));

    setInputs(prev => ({
      ...prev,
      programType: {
        ...prev.programType,
        [programId]: newType
      }
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDetaljiKorisnika(korisnikId);
        if (data) {
          const formattedDate = data.datumRodjenja ?
            new Date(data.datumRodjenja).toISOString().split('T')[0] :
            '';

          // Convert schoolId to number if it exists
          const schoolId = data.school?.id ? Number(data.school.id) : '';

          // Ensure all fields have default values
          setInputs({
            korisnickoIme: data.korisnickoIme || '',
            email: data.email || '',
            ime: data.ime || '',
            prezime: data.prezime || '',
            isAdmin: data.isAdmin || false,
            isMentor: data.isMentor || false,
            isStudent: data.isStudent || true,
            oib: data.oib || '',
            programId: data.programId || [],
            brojMobitela: data.brojMobitela || '',
            mentorId: data.mentorId || [],
            schoolId: schoolId,
            datumRodjenja: formattedDate,
            adresa: {
              ulica: data.adresa?.ulica || '',
              kucniBroj: data.adresa?.kucniBroj || '',
              mjesto: data.adresa?.mjesto || '',
            },
            pohadjaTeoriju: data.pohadjaTeoriju || false,
            napomene: data.napomene || '',
            maloljetniClan: data.maloljetniClan || false,
            roditelj1: {
              ime: data.roditelj1?.ime || '',
              prezime: data.roditelj1?.prezime || '',
              brojMobitela: data.roditelj1?.brojMobitela || '',
            },
            roditelj2: {
              ime: data.roditelj2?.ime || '',
              prezime: data.roditelj2?.prezime || '',
              brojMobitela: data.roditelj2?.brojMobitela || '',
            },
          });

          // Set selected programs if user has any
          setSelectedPrograms(data.programs && Array.isArray(data.programs) ? data.programs : []);

          // Update program types
          setProgramTypes(data.programType || {});

          // Fetch mentor details and their programs if mentorId exists
          if (data.mentorId?.length > 0) {
            try {
              const mentorPromises = data.mentorId.map(id =>
                ApiConfig.api.get(`/api/mentori/${id}`)
              );
              const mentorResponses = await Promise.all(mentorPromises);
              const mentorDetails = mentorResponses.map(res => res.data);

              // Get all unique programs from mentors
              const allMentorPrograms = mentorDetails
                .flatMap(mentor => mentor.programs || [])
                .filter((program, index, self) =>
                  index === self.findIndex(p => p.id === program.id)
                );

              setMentorPrograms(allMentorPrograms);
            } catch (err) {
              console.error('Error fetching mentor programs:', err);
              showNotification('error', 'Greška pri učitavanju programa mentora');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        showNotification('error', 'Greška pri učitavanju detalja korisnika');
      }
    };

    fetchData();
    fetchMentors();
    fetchSchools();
  }, [korisnikId]);

  // Add this useEffect to log state updates
  useEffect(() => {
    console.log('Current inputs state:', inputs);
  }, [inputs]);

  // Modify the useEffect for fetching programs
  useEffect(() => {
    if (inputs.schoolId) {
      fetchPrograms(inputs.schoolId);
    }
  }, [inputs.schoolId]);

  // Fetch programs when school changes
  useEffect(() => {
    if (inputs.schoolId) {
      fetchSchoolPrograms();
    } else {
      setPrograms([]);
    }
  }, [inputs.schoolId]);

  const fetchSchoolPrograms = async () => {
    try {
      const response = await ApiConfig.api.get(`/api/programs`);
      setPrograms(response.data);
    } catch (error) {
      console.error('Error fetching school programs:', error);
      showNotification('error', 'Greška pri dohvaćanju programa škole');
    }
  };

  // Fetch mentor programs when mentors change
  useEffect(() => {
    if (inputs.mentorId?.length > 0) {
      fetchMentorPrograms();
    } else {
      setMentorPrograms([]);
    }
  }, [inputs.mentorId]);

  const fetchMentorPrograms = async () => {
    try {
      const mentorPromises = inputs.mentorId.map(id =>
        ApiConfig.api.get(`/api/mentori/${id}`)
      );
      const mentorResponses = await Promise.all(mentorPromises);
      const allMentorPrograms = mentorResponses.flatMap(response => 
        response.data.programs || []
      );
      // Remove duplicates
      const uniquePrograms = [...new Map(allMentorPrograms.map(item =>
        [item.id, item]
      )).values()];
      setMentorPrograms(uniquePrograms);
    } catch (error) {
      console.error('Error fetching mentor programs:', error);
      showNotification('error', 'Greška pri dohvaćanju programa mentora');
    }
  };

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
                <div className="th">Izvor</div>
                <div className="th"></div>
              </div>
              {[
                ...programs.map(p => ({ ...p, source: 'Škola' })),
                ...mentorPrograms.map(p => ({ ...p, source: 'Mentor' }))
              ]
                .filter(program =>
                  program.naziv.toLowerCase().includes(programInput.toLowerCase()) &&
                  !selectedPrograms.some(sp => sp.id === program.id)
                )
                .map(program => (
                  <div key={program.id} className="tr redak">
                    <div className="th">{program.naziv}</div>
                    <div className="th">{program.source}</div>
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

        <div className="div">
          <label>Dodijeljeni mentori:</label>
          <div className="tablica">
            <div className="tr naziv">
              <div className="th">Korisničko ime</div>
              <div className="th">Email</div>
            </div>
            {inputs.mentorId?.length > 0 ? (
              mentors
                .filter(mentor => inputs.mentorId.includes(mentor.id))
                .map((mentor) => (
                  <div key={mentor.id} className="tr redak">
                    <div className="th">{mentor.korisnickoIme}</div>
                    <div className="th">{mentor.email}</div>
                  </div>
                ))
            ) : (
              <div className="tr redak">
                <div className="th" colSpan="2">
                  Nema dodijeljenih mentora
                </div>
              </div>
            )}
          </div>
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
            <div
              className={`checkbox-item ${inputs.pohadjaTeoriju ? 'checked' : ''}`}
              onClick={() => setInputs((prev) => ({ ...prev, pohadjaTeoriju: !prev.pohadjaTeoriju }))}>
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

        <div className="div-radio div-sticky">
          <button
            className="gumb action-btn zatvoriBtn"
            onClick={() => onCancel()}
          >
            Zatvori
          </button>
          <button
            className="gumb action-btn spremiBtn"
            type="submit"
          >
            {isSaving ? 'Spremanje...' : 'Spremi promjene'}
          </button>
          {!showResetConfirm ? (
            <button
              className="gumb action-btn abExpand"
              type="button"
              onClick={() => setShowResetConfirm(true)}
            >
              Resetiraj lozinku
            </button>
          ) : (
            <>
              <button
                className="gumb action-btn abDelete"
                type="button"
                onClick={() => setShowResetConfirm(false)}
              >
                Odustani
              </button>
              <button
                className="gumb action-btn abEdit"
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
              >
                {isResetting ? 'Resetiranje...' : 'Resetiraj'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default KorisnikDetalji;
