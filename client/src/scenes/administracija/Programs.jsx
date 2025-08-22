import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';
import DodajProgram from './DodajProgram';
import ApiConfig from '../../components/apiConfig';
import ProgramDetalji from './ProgramDetalji';
import Notification from '../../components/Notifikacija';
import LoadingShell from '../../components/LoadingShell.jsx';

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [odabranoDodajProgram, setOdabranoDodajProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showDetalji, setShowDetalji] = useState(false);
  const otvoreno = 'programi';
  const [user, setUser] = useState(null);
  const [deleteProgram, setDeleteProgram] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
      // First get user
      const userRes = await ApiConfig.api.get('/api/user');
      if (!userRes.data?.user) {
        throw new Error('No user data received');
      }
      setUser(userRes.data.user);

      // Then get programs with user's school
      const programsRes = await ApiConfig.api.get('/api/programs');
      console.log('Programs response:', programsRes.data);

      setPrograms(Array.isArray(programsRes.data) ? programsRes.data : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri dohvaćanju programa: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleDeleteProgram = async (programId) => {
    try {
      await ApiConfig.api.delete(`/api/programs/${programId}`);
      setPrograms(programs.filter((program) => program.id !== programId));
      setNotification({
        type: 'success',
        message: 'Program uspješno obrisan!'
      });
      setDeleteProgram(null);
    } catch (err) {
      console.error('Error deleting program:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri brisanju programa'
      });
    }
  };

  const handleEditProgram = (program) => {
    setSelectedProgram(program);
    setShowDetalji(true);
  };

  const handleUpdateProgram = (updatedProgram) => {
    setPrograms(programs.map(p =>
      p.id === updatedProgram.id ? updatedProgram : p
    ));
    setShowDetalji(false);
    setSelectedProgram(null);
  };

  if (isLoading) {
    return (
    <>
    <NavigacijaAdmin otvoreno={otvoreno} />
    <NavTopAdministracija naslov={'Administracija - Programi'} />
      <LoadingShell />
    </>);
  }

  return (
    <>
      <NavigacijaAdmin otvoreno={otvoreno} />
      <NavTopAdministracija naslov={'Administracija - Programi'} />
      {showDetalji && selectedProgram && (
        <ProgramDetalji
          program={selectedProgram}
          onClose={() => {
            setShowDetalji(false);
            setSelectedProgram(null);
          }}
          onUpdate={handleUpdateProgram}
        />
      )}
      {odabranoDodajProgram && user && (
        <DodajProgram
          onDodajProgram={() => {
            fetchPrograms();
            setOdabranoDodajProgram(false);
            setSelectedProgram(null);
          }}
          onCancel={() => {
            setOdabranoDodajProgram(false);
            setSelectedProgram(null);
          }}
          programToEdit={selectedProgram}
          user={user}
        />
      )}
      {deleteProgram && (
        <div className="popup">
          <div className="karticaZadatka">
            <h3>Potvrda brisanja</h3>
            <p>Jeste li sigurni da želite obrisati ovaj program?</p>
            <div className="div-radio">
              <button
                className="gumb action-btn zatvoriBtn"
                onClick={() => setDeleteProgram(null)}
              >
                Odustani
              </button>
              <button
                className="gumb action-btn abDelete"
                onClick={() => handleDeleteProgram(deleteProgram.id)}
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="main">
        <div className="sbtwn">
          <div style={{
            fontSize: '0.7rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span>Ukupno programa: {programs?.length || 0}</span>
          </div>
          <div
            className="gumb action-btn abEdit"
            onClick={() => setOdabranoDodajProgram(true)}
          >
            <Icon icon="solar:add-circle-broken" fontSize="large" /> Dodaj program
          </div>
        </div>
        <div className="tablica">
          <div className="tr naziv" key="header">
            <div className="th">Naziv programa</div>
            <div className="th"></div>
          </div>
          {programs.map((program) => (
            <div key={program.id} className="tr redak">
              <div className="th">{program.naziv}</div>
              <div className="th">
                <button
                  className="action-btn abEdit"
                  onClick={() => handleEditProgram(program)}
                >
                  <Icon icon="solar:pen-broken" />
                </button>
                <button
                  className="action-btn abDelete"
                  onClick={() => setDeleteProgram(program)}
                >
                  <Icon icon="solar:trash-bin-trash-broken" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
        />
      )}
    </>
  );
};

export default Programs;
