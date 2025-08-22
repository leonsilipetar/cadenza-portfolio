import React from 'react';
import { Icon } from '@iconify/react';

const NavSideRaspored = ({ students, onStudentClick, onCombinedScheduleClick, onFullScheduleClick, biljeske, setShowFullSchedulePopup, onSettingsClick, user }) => {
  console.log("NavSideRaspored students:", students);

  if (!Array.isArray(students)) {
    console.warn('Students prop is not an array:', students);
    return null;
  }

  return (
    <div className="raspored-lista">
      <div className="rl-items">
        <div className="rl moj-raspored" onClick={onCombinedScheduleClick}>
          {biljeske ? "Bilješke" : "Moj raspored"}
        </div>
        <div className="rl kompletan-raspored" onClick={() => setShowFullSchedulePopup(true)}>
          Kompletan raspored
        </div>
        {user && (user.isAdmin || user.isMentor) && (
          <div className="rl settings" onClick={onSettingsClick}>
            <Icon icon="solar:settings-broken" /> Postavke rasporeda
          </div>
        )}
        {!students || students.length === 0 ? (
          <div className="rl">Nema dodanih učenika</div>
        ) : (
          students.map((student) => (
            <div
              className="rl"
              key={student.id}
              onClick={() => onStudentClick(student.id)}
            >
              {student.ime} {student.prezime}
              {student.hasUnpaidInvoice && (
                <span className="unread-count hasUnpaidInvoice">
                  !
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NavSideRaspored;