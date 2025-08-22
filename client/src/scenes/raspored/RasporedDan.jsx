import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';

const RasporedDan = ({
  teorija,
  student,
  teorijaID,
  day,
  date,
  user,
  setSchedule,
  setNotification,
  isTeorija,
  activeWeek
}) => {
  console.log(`RasporedDan - day: ${day}, teorija:`, teorija);
  const [deleteTermId, setDeleteTermId] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sort the slots by time
  const sortedSlots = teorija ? [...teorija].sort((a, b) => {
    // Convert "HH:MM" to minutes for accurate sorting
    const getMinutes = (time) => {
      const [hours, minutes = 0] = time.split(':').map(Number);
      return hours * 60 + Number(minutes);
    };
    
    return getMinutes(a.vrijeme) - getMinutes(b.vrijeme);
  }) : [];
  
  console.log(`RasporedDan - sortedSlots for ${day}:`, sortedSlots);

  const obrisiTermin = async (term) => {
    try {
      // Get the term ID, handling both _id and id formats
      const termId = term._id || term.id;
      
      const deleteUrl = isTeorija
        ? `/api/deleteTermin/${termId}?day=${day}&teorijaID=${teorijaID}`
        : `/api/deleteUcenikTermin/${student.id}?day=${day}&terminId=${termId}`;

      console.log('Delete URL:', deleteUrl);
      console.log('Term:', term);
      console.log('Day:', day);
      console.log('TeorijaID:', teorijaID);
      console.log('Student:', student);

      await ApiConfig.api.delete(deleteUrl);

      setSchedule(prevSchedule => {
        if (Array.isArray(prevSchedule)) {
          // Update for theory
          return prevSchedule.filter(t => (t._id || t.id) !== termId);
        } else {
          // Update for student schedule
          const updatedDay = prevSchedule[day].filter(t => (t._id || t.id) !== termId);
          return { ...prevSchedule, [day]: updatedDay };
        }
      });

      setNotification?.({
        type: 'success',
        message: 'Termin obrisan!',
      });
    } catch (error) {
      console.error('Error deleting term:', error);
      setNotification?.({
        type: 'error',
        message: 'Došlo je do greške prilikom brisanja termina.',
      });
    } finally {
      setDeleteTermId(null);
      setShowResetConfirm(false);
    }
  };

  const handleDeleteConfirmation = (term) => {
    setDeleteTermId(term); // Store the entire term object
    setShowResetConfirm(true);
  };

  const dayNames = {
    pon: 'Ponedjeljak',
    uto: 'Utorak',
    sri: 'Srijeda',
    cet: 'Četvrtak',
    pet: 'Petak',
    sub: 'Subota'
  };

  return (
    <div className="dan">
      <div className="dan-header">
        <h3>{dayNames[day]}</h3>
        <span className="date">{date}</span>
      </div>
      <div className="termini">
        {teorija && teorija.length > 0 ? (
          teorija
            .filter(termin => !termin.week || termin.week === activeWeek)
            .sort((a, b) => {
              const timeA = a.vrijeme.split(':').map(Number);
              const timeB = b.vrijeme.split(':').map(Number);
              return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
            })
            .map((termin, index) => {
              const displayName = user?.isMentor
                ? termin.studentName
                : termin.mentor;

              return (
                <div
                  key={index}
                  className={`termin ${isTeorija ? 'boja-teorija' : ''}`}
                >
                  {user && user.isAdmin && !showResetConfirm && (
                    <div className='obrisiTermin action-btn abDelete' onClick={() => handleDeleteConfirmation(termin)}>
                      <Icon icon="solar:trash-bin-trash-broken" />
                    </div>
                  )}
                  {showResetConfirm && deleteTermId === termin ? (
                    <>
                      <p>Obriši?</p>
                      <div className="div">
                        <button 
                          className="gumb action-btn zatvoriBtn"
                          onClick={() => setShowResetConfirm(false)}
                        >
                          Odustani
                        </button>
                        <button 
                          className="gumb action-btn abDelete"
                          onClick={() => obrisiTermin(termin)}
                        >
                          Obriši
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="dvorana">{termin.dvorana}</div>
                      <div className="vrijeme">
                        {termin.vrijeme.includes(':') ? termin.vrijeme : `${termin.vrijeme}:00`}
                      </div>
                      {isTeorija ? (
                        <div className="rasporedMentor">{termin.mentor}</div>
                      ) : (
                        <div className="rasporedMentor">
                          {user && user.isStudent ? termin.mentor : displayName || user.korisnickoIme}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
        ) : (
          <p className="no-termini">Nema termina</p>
        )}
      </div>
    </div>
  );
};

export default RasporedDan;
