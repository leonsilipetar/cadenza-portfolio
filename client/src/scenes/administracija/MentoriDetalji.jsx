import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ApiConfig from '../../components/apiConfig.js';
import { Icon } from '@iconify/react';
import { showNotification } from '../../components/Notifikacija';

const MentorDetalji = ({ korisnikId, onCancel }) => {
  const [inputs, setInputs] = useState({
    korisnickoIme: '',
    email: '',
    ime: '',
    prezime: '',
    isAdmin: false,
    isMentor: true,
    isStudent: false,
    oib: '',
    programs: [],
    brojMobitela: '',
    datumRodjenja: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: '',
    },
    napomene: '',
    studentId: [],
    removedStudents: [],
    schoolId: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [schools, setSchools] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [programInput, setProgramInput] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [programToRemove, setProgramToRemove] = useState(null);

  const fetchMentorDetails = async () => {
    try {
      const res = await ApiConfig.api.get(`/api/mentori/${korisnikId}`);
      const data = res.data;

      // Format date if exists
      const formattedDate = data.datumRodjenja ?
        new Date(data.datumRodjenja).toISOString().split('T')[0] :
        '';

      // Set the main inputs
      setInputs({
        ...data,
        datumRodjenja: formattedDate,
        adresa: data.adresa || { ulica: '', kucniBroj: '', mjesto: '' },
        napomene: data.napomene || '',
        studentId: data.studentId || [],
        removedStudents: [] // Initialize empty array for removedStudents
      });

      // Set programs if they exist
      if (data.programs && Array.isArray(data.programs)) {
        setSelectedPrograms(data.programs);
      }

      // Fetch and set students if studentId array exists
      if (data.studentId && Array.isArray(data.studentId) && data.studentId.length > 0) {
        const studentPromises = data.studentId.map(id =>
          ApiConfig.api.get(`/api/korisnik/${id}`)
            .then(response => ({ status: 'fulfilled', value: response.data.user, id }))
            .catch(error => ({ status: 'rejected', reason: error, id }))
        );

        const settledStudentResults = await Promise.all(studentPromises);

        const studentDetails = settledStudentResults.map(result => {
          if (result.status === 'fulfilled') {
            return result.value; // This is the user object
          } else {
            console.error(`Error fetching student details for ID ${result.id}:`, result.reason);
            // Return a placeholder object for display
            return {
              id: result.id,
              error: true,
              korisnickoIme: `Greška pri učitavanju (ID: ${result.id})`, // Main display for error
              ime: 'N/A', // Placeholder if 'ime' is expected by rendering logic
              prezime: '',  // Placeholder if 'prezime' is expected
              brojMobitela: '-',
              email: '-',
            };
          }
        });

        setSelectedStudents(studentDetails);

        if (settledStudentResults.some(r => r.status === 'rejected')) {
          showNotification('warning', 'Neki podaci učenika nisu mogli biti učitani. Prikazani su s greškom.');
        }
      } else if (data.studentId && Array.isArray(data.studentId) && data.studentId.length === 0) {
        // Ensure selectedStudents is empty if there are no student IDs
        setSelectedStudents([]);
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Greška pri dohvaćanju detalja mentora');
    }
  };

  const handleDelete = async () => {
    try {
      await ApiConfig.api.delete(`/api/mentori/${korisnikId}`);
      onCancel(); // Close details view
      showNotification('success', 'Mentor uspješno obrisan');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Greška pri brisanju mentora');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setInputs(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value || ''
        }
      }));
    } else {
      setInputs(prev => ({
        ...prev,
        [name]: value || ''
      }));
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await ApiConfig.api.get('/api/all-students');
      setAllStudents(res.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      showNotification('error', 'Greška pri dohvaćanju učenika');
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value || '';
    setStudentInput(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await ApiConfig.api.get('/api/users', {
        params: { searchTerm: query }
      });

      if (res.data) {
        const students = Array.isArray(res.data) ? res.data : res.data || [];
        const mappedResults = students
          .filter(student => student && student.isStudent)
          .map(student => ({
            ...student,
            isAssigned: selectedStudents.some(s => s.id === student.id)
          }));
        setSearchResults(mappedResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleAddStudent = async (studentId) => {
    try {
      const student = searchResults.find(s => s.id === studentId);
      if (!student) return;

      // Check if student is already in selectedStudents
      const isDuplicate = selectedStudents.some(s => s.id === studentId);
      if (isDuplicate) {
        showNotification('warning', 'Učenik je već dodan');
        return;
      }

      setSelectedStudents(prev => [...prev, student]);
      setInputs(prev => ({
        ...prev,
        studentId: [...(prev.studentId || []), studentId],
        removedStudents: (prev.removedStudents || []).filter(id => id !== studentId)
      }));
      setSearchResults(prev =>
        prev.map(s => s.id === studentId ? { ...s, isAssigned: true } : s)
      );
      setStudentInput('');
      showNotification('success', 'Učenik uspješno dodan');
    } catch (error) {
      console.error('Error adding student:', error);
      showNotification('error', 'Greška pri dodavanju učenika');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      console.log('Removing student:', studentId); // Debug log

      setSelectedStudents(prev => prev.filter(student => student.id !== studentId));
      setInputs(prev => {
        console.log('Previous inputs:', prev); // Debug log
        const newInputs = {
          ...prev,
          studentId: prev.studentId.filter(id => id !== studentId),
          removedStudents: [...(prev.removedStudents || []), studentId]
        };
        console.log('New inputs:', newInputs); // Debug log
        return newInputs;
      });

      setSearchResults(prev =>
        prev.map(s => s.id === studentId ? { ...s, isAssigned: false } : s)
      );
      setStudentToRemove(null);
      showNotification('success', 'Učenik uspješno uklonjen');
    } catch (error) {
      console.error('Error removing student:', error);
      showNotification('error', 'Greška pri uklanjanju učenika');
    }
  };

  const handleAddProgram = async (programId) => {
    try {
      const program = programs.find(p => p.id === programId);
      if (!program) return;

      // Check if program is already added
      const isDuplicate = selectedPrograms.some(p => p.id === programId);
      if (isDuplicate) {
        showNotification('warning', 'Program je već dodan');
        return;
      }

      // Add to selected programs
      setSelectedPrograms(prev => [...prev, program]);

      // Update inputs state with new program IDs
      setInputs(prev => ({
        ...prev,
        programs: [...selectedPrograms.map(p => p.id), programId]
      }));

      setProgramInput('');
      showNotification('success', 'Program uspješno dodan');
    } catch (err) {
      console.error('Error adding program:', err);
      showNotification('error', 'Greška pri dodavanju programa');
    }
  };

  const handleRemoveProgram = async (programId) => {
    try {
      setSelectedPrograms(prev => prev.filter(program => program.id !== programId));
      showNotification('success', 'Program uspješno uklonjen');
    } catch (err) {
      console.error('Error removing program:', err);
      showNotification('error', 'Greška pri uklanjanju programa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('Current inputs:', inputs); // Debug log

      // Format the data for update
      const updateData = {
        ...inputs,
        programs: selectedPrograms?.map(program => program.id) || [],
        studentId: selectedStudents?.map(student => student.id) || [],
        removedStudents: inputs.removedStudents || [],
        napomene: Array.isArray(inputs.napomene) ? inputs.napomene : [],
        adresa: inputs.adresa || {
          ulica: '',
          kucniBroj: '',
          mjesto: ''
        },
        isAdmin: Boolean(inputs.isAdmin),
        isMentor: true,
        isStudent: Boolean(inputs.isStudent)
      };

      console.log('Sending update data:', updateData); // Debug log

      const response = await ApiConfig.api.put(`/api/mentori/${korisnikId}`, updateData);
      console.log('Server response:', response.data); // Debug log

      showNotification('success', 'Uspješno spremljene promjene');

      // Reset removedStudents after successful save
      setInputs(prev => ({ ...prev, removedStudents: [] }));
    } catch (error) {
      console.error('Error updating mentor:', error);
      showNotification('error', error.response?.data?.message || 'Greška pri ažuriranju mentora.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setIsResetting(true);
      await ApiConfig.api.post('/api/reset-password', {
        userId: korisnikId,
        userType: 'mentor',
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

  const fetchPrograms = async () => {
    try {
      const userRes = await ApiConfig.api.get('/api/user');
      const programsRes = await ApiConfig.api.get(`/api/programs?school=${userRes.data.user.school}`);
      setPrograms(Array.isArray(programsRes.data) ? programsRes.data : []);
    } catch (err) {
      console.error('Error fetching programs:', err);
      showNotification('error', 'Greška pri dohvaćanju programa');
    }
  };

  useEffect(() => {
    fetchMentorDetails();
    fetchAllStudents();
    fetchPrograms();
  }, [korisnikId]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await ApiConfig.api.get('/api/schools');
        setSchools(res.data);
      } catch (error) {
        console.error('Error fetching schools:', error);
        showNotification('error', 'Greška pri učitavanju škola');
      }
    };

    fetchSchools();
  }, []);

  return (
    <>
    <div className="popup">
      <form onSubmit={handleSubmit}>
        <div className="div">

        <label>Korisničko ime:</label>
          <input
            className="input-login-signup"
            type="text"
            name="korisnickoIme"
            value={inputs.korisnickoIme || ''}
            onChange={handleChange}
            placeholder="Korisničko ime"
          />

          <label>Email:</label>
          <input
            className="input-login-signup"
            type="email"
            name="email"
            value={inputs.email || ''}
            onChange={handleChange}
            placeholder="Email"
          />

          <label>OIB:</label>
          <input
            className="input-login-signup"
            type="text"
            name="oib"
            value={inputs.oib || ''}
            onChange={handleChange}
            placeholder="OIB"
          />

        </div>

        <div className="div">
        <label>Ime:</label>
          <input
            className="input-login-signup"
            type="text"
            name="ime"
            value={inputs.ime || ''}
            onChange={handleChange}
            placeholder="Ime"
          />

          <label>Prezime:</label>
          <input
            className="input-login-signup"
            type="text"
            name="prezime"
            value={inputs.prezime || ''}
            onChange={handleChange}
            placeholder="Prezime"
          />
          <label>Broj mobitela:</label>
          <input
            className="input-login-signup"
            type="text"
            name="brojMobitela"
            value={inputs.brojMobitela || ''}
            onChange={handleChange}
            placeholder="Broj mobitela"
          />
          <label>Datum rođenja:</label>
          <input
            className="input-login-signup"
            type="date"
            name="datumRodjenja"
            value={inputs.datumRodjenja || ''}
            onChange={handleChange}
            placeholder="Datum rođenja"
          />
        </div>

        <div className='div'>
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

        <div className="div div-clmn">
          <label>Programi:</label>
          <input
            className="input-login-signup"
            type="text"
            value={programInput}
            onChange={(e) => setProgramInput(e.target.value)}
            placeholder="Pretraži programe..."
          />

          {/* Program search results */}
          {programs.length > 0 && programInput.length > 0 && (
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Rezultati pretrage</div>
                <div className="th"></div>
              </div>
              {programs
                .filter(program =>
                  program.naziv.toLowerCase().includes(programInput.toLowerCase()) &&
                  !selectedPrograms.some(p => p.id === program.id)
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
              <div className="th"></div>
            </div>
            {selectedPrograms
              .map((program) => (
                <div key={program.id} className="tr redak">
                  <div className="th">{program.naziv}</div>
                  <div className="th">
                    <button
                      className="action-btn abDelete"
                      onClick={() => handleRemoveProgram(program.id)}
                      type="button"
                    >
                      Ukloni
                    </button>
                  </div>
                </div>
              ))}
            {(!selectedPrograms || selectedPrograms.length === 0) && (
              <div className="tr redak">
                <div className="th" colSpan="2">
                  Nema dodanih programa
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="div">
          <label>Adresa:</label>
          <input
            className="input-login-signup"
            type="text"
            name="adresa.ulica"
            value={inputs.adresa?.ulica || ''}
            onChange={handleChange}
            placeholder="Ulica"
          />
          <input
            className="input-login-signup"
            type="text"
            name="adresa.kucniBroj"
            value={inputs.adresa?.kucniBroj || ''}
            onChange={handleChange}
            placeholder="Kućni broj"
          />
          <input
            className="input-login-signup"
            type="text"
            name="adresa.mjesto"
            value={inputs.adresa?.mjesto || ''}
            onChange={handleChange}
            placeholder="Mjesto"
          />
        </div>

        {/* Add admin toggle */}
        <div className="div-radio">
          <div
            className={`radio-item ${inputs.isAdmin ? 'checked' : ''}`}
            onClick={() => setInputs(prev => ({ ...prev, isAdmin: !prev.isAdmin }))}
          >
            <input
              type="radio"
              id="isAdmin"
              checked={inputs.isAdmin}
              onChange={() => setInputs(prev => ({ ...prev, isAdmin: !prev.isAdmin }))}
              style={{ display: 'none' }}
            />
            {inputs.isAdmin ? 'Administrator' : 'Nije administrator'}
          </div>
        </div>

        {/* Add napomene textarea */}
        <div className="div">
          <label htmlFor="kor-napomene">Napomene:</label>
          <textarea
            className="input-login-signup"
            value={inputs.napomene || ''}
            onChange={(e) => setInputs(prev => ({ ...prev, napomene: e.target.value || '' }))}
            name="napomene"
            id="kor-napomene"
            placeholder="Unesite napomene o korisniku"
            maxLength={5000}
          />
        </div>

        {/* Students Section */}
        <div className="div div-clmn">
          <label>Učenici:</label>
          <input
            className="input-login-signup"
            type="text"
            value={studentInput}
            onChange={handleSearch}
            placeholder="Pretraži učenike"
          />

          {searchResults?.length > 0 && (
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Rezultati pretrage</div>
                <div className="th"></div>
              </div>
              {searchResults.map((student) => {
  console.log("Rendering student:", searchResults);
  return (
    <div key={student.id} className="tr redak">
      <div className="th">{student.ime} {student.prezime}</div>
      <div className="th">
        {student.isAssigned ? (
          <button
            className="gumb action-btn abDelete"
            type="button"
            onClick={() => handleRemoveStudent(student.id)}
          >
            Ukloni
          </button>
        ) : (
          <button
            className="action-btn abEdit"
            onClick={() => handleAddStudent(student.id)}
            type="button"
          >
            Dodaj
          </button>
        )}
      </div>
    </div>
  );
})}

            </div>
          )}

          {/* Added students */}
          <div className="tablica">
            <div className="tr naziv">
              <div className="th">Ime i prezime</div>
              <div className="th">Broj mobitela</div>
              <div className="th">Email</div>
              <div className="th"></div>
            </div>
            {selectedStudents.map((student) => (
              <div key={student.id} className="tr redak">
                {student.error ? (
                  <>
                    <div className="th" colSpan="3" style={{ color: 'red', fontStyle: 'italic' }}>
                      {student.korisnickoIme} {/* Displays "Greška pri učitavanju (ID: ...)" */}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="th">
                      {student.ime && student.prezime
                        ? `${student.ime} ${student.prezime}`
                        : student.korisnickoIme}
                    </div>
                    <div className="th">{student.brojMobitela || '-'}</div>
                    <div className="th">{student.email || '-'}</div>
                  </>
                )}
                {/* Action button column - always present */}
                <div className="th">
                  <button
                    className="action-btn abDelete"
                    onClick={() => handleRemoveStudent(student.id)}
                    type="button"
                  >
                    Ukloni
                  </button>
                </div>
              </div>
            ))}
            {(!selectedStudents || selectedStudents.length === 0) && (
              <div className="tr redak">
                <div className="th" colSpan="4">
                  Nema dodanih učenika
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit and password reset buttons */}
        <div className="div-radio div-sticky">
          <button
            className="gumb action-btn zatvoriBtn"
            onClick={() => onCancel()}
            type="button"
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

    </>
  );
};

export default MentorDetalji;
