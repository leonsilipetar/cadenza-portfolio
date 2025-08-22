import React from 'react';
import { useSelector } from 'react-redux';

const RasporedTeorija = ({ teorija, date, activeWeek }) => {
  const { user } = useSelector((state) => state.auth);
  const isMentor = user?.tip === 'mentor';

  // Filter teorija based on activeWeek
  const filteredTeorija = teorija.filter(t => !t.week || t.week === activeWeek);
  
  // Sort by time
  const sortedTeorija = [...filteredTeorija].sort((a, b) => {
    const timeA = a.vrijeme.split(':').map(Number);
    const timeB = b.vrijeme.split(':').map(Number);
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
  });

  if (sortedTeorija.length === 0) {
    return (
      <div className="no-termini">
        Nema termina za ovaj dan
      </div>
    );
  }

  return (
    <div className="termini">
      {sortedTeorija.map((termin, index) => (
        <div key={index} className="termin">
          <div className="vrijeme">{termin.vrijeme}</div>
          <div className="info">
            <div className="predmet">{termin.predmet}</div>
            <div className="profesor">
              {isMentor ? termin.grupa : termin.profesor}
            </div>
            {termin.week && (
              <div className="tjedan">
                Tjedan {termin.week}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RasporedTeorija; 