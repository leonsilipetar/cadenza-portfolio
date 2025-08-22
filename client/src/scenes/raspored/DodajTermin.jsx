import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';
import { showNotification } from '../../components/Notifikacija';
import "../../styles/styles.css"

const DodajTermin = ({ onCancel, studentID, dodajRasporedTeorija, user }) => {
  const [isDodajMentoraDisabled, setIsDodajMentoraDisabled] = useState(false);
  const [selectedDay, setSelectedDay] = useState('pon');
  const [selectedInterval, setSelectedInterval] = useState(45);
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [existingSlots, setExistingSlots] = useState([]);
  const [terms, setTerms] = useState([]);
  const [inputs, setInputs] = useState({
    mentor: '',
  });
  const [selectedDuration, setSelectedDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [minutes, setMinutes] = useState(0);
  const [dvorana, setDvorana] = useState('');
  const [mentor, setMentor] = useState('');
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);

  const days = [
    { id: 'pon', label: 'Ponedjeljak' },
    { id: 'uto', label: 'Utorak' },
    { id: 'sri', label: 'Srijeda' },
    { id: 'cet', label: 'Četvrtak' },
    { id: 'pet', label: 'Petak' },
    { id: 'sub', label: 'Subota' }
  ];

  const intervals = [
    { value: 45, label: '45 minuta' },
    { value: 60, label: '1 sat' },
    { value: 90, label: '1 sat i 30 min' },
    { value: 'custom', label: 'Proizvoljno' }
  ];

  const durations = [
    { value: 45, label: '45 minuta' },
    { value: 60, label: '1 sat' },
    { value: 90, label: '1 sat i 30 min' },
    { value: 'custom', label: 'Proizvoljno' }
  ];

  const weeks = [
    { id: null, label: 'Svaki tjedan' },
    { id: 'A', label: 'A tjedan' },
    { id: 'B', label: 'B tjedan' }
  ];

  // Fetch classrooms on component mount
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        // Add schoolId to the request if user has one
        const schoolId = user?.schoolId;
        const endpoint = schoolId 
          ? `/api/classrooms?schoolId=${schoolId}`
          : '/api/classrooms';

        const res = await ApiConfig.api.get(endpoint);
        setClassrooms(res.data);
      } catch (err) {
        console.error('Error fetching classrooms:', err);
        showNotification('error', 'Greška pri dohvaćanju učionica');
      }
    };
    fetchClassrooms();
  }, [user?.schoolId]); // Add schoolId to dependency array

  // Helper function to convert time to minutes
  const timeToMinutes = (time) => {
    const [hours, minutes = 0] = time.toString().split(':').map(Number);
    return hours * 60 + Number(minutes);
  };

  // Helper function to convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Function to map out occupied and non-occupied intervals
  const mapTimeIntervals = (existingSlots) => {
    const START_OF_DAY = 8 * 60; // 08:00 in minutes
    const END_OF_DAY = 22 * 60;  // 22:00 in minutes

    // Sort slots by start time
    const sortedSlots = [...existingSlots].sort((a, b) => {
      return timeToMinutes(a.vrijeme) - timeToMinutes(b.vrijeme);
    });

    const occupied = [];
    const nonOccupied = [];
    let currentTime = START_OF_DAY;

    sortedSlots.forEach(slot => {
      const slotStart = timeToMinutes(slot.vrijeme);
      const slotEnd = slotStart + slot.duration;

      // If there's a gap before this slot, add it to non-occupied
      if (currentTime < slotStart) {
        nonOccupied.push({
          start: minutesToTime(currentTime),
          end: minutesToTime(slotStart),
          duration: slotStart - currentTime
        });
      }

      // Add the occupied slot
      occupied.push({
        start: minutesToTime(slotStart),
        end: minutesToTime(slotEnd),
        duration: slot.duration,
        type: slot.type,
        mentor: slot.mentor
      });

      currentTime = slotEnd;
    });

    // Add final non-occupied period if there is one
    if (currentTime < END_OF_DAY) {
      nonOccupied.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(END_OF_DAY),
        duration: END_OF_DAY - currentTime
      });
    }

    return { occupied, nonOccupied };
  };

  // Update useEffect to create the intervals when slots change
  useEffect(() => {
    if (selectedClassroom) {
      const fetchSlots = async () => {
        try {
          const classroom = classrooms.find(c => c.id.toString() === selectedClassroom.toString());
          if (!classroom || classroom.schoolId !== user?.schoolId) {
            showNotification('error', 'Nemate pristup ovoj učionici');
            setExistingSlots([]);
            return;
          }

          const endpoint = `/api/raspored/${selectedDay}/${selectedClassroom}`;
          const res = await ApiConfig.api.get(endpoint, {
            params: {
              schoolId: user?.schoolId,
              week: selectedWeek // Send selected week to backend
            }
          });

          // Filter slots based on week type
          const filteredSlots = res.data.filter(slot => {
            // If no week is selected (show all slots) or slot has no week specified (shows in both weeks)
            if (!selectedWeek || !slot.week) return true;
            // If week is selected, only show slots for that week or slots with no week specified
            return slot.week === selectedWeek;
          });

          setExistingSlots(filteredSlots);
          const intervals = mapTimeIntervals(filteredSlots);
          console.log('Fetched slots:', filteredSlots); // Debug log
        } catch (err) {
          console.error('Error fetching slots:', err);
          showNotification('error', 'Greška pri dohvaćanju termina');
        }
      };
      fetchSlots();
    }
  }, [selectedDay, selectedClassroom, user?.schoolId, classrooms, selectedWeek]); // Include selectedWeek in dependencies

  // Helper function to check if a time range is available
  const isTimeRangeAvailable = (startMinutes, duration, existingSlots) => {
    const endMinutes = startMinutes + duration;

    // Check against all existing slots
    const isOverlapping = existingSlots.some(slot => {
      const slotStart = timeToMinutes(slot.vrijeme);
      const slotEnd = slotStart + slot.duration;

      // Check if the new slot would overlap with an existing slot
      const hasOverlap = (startMinutes < slotEnd && endMinutes > slotStart);

      // If a slot ends exactly at our start time, it's not an overlap
      if (slotEnd === startMinutes) return false;

      // If our slot ends exactly at the start of another slot, it's not an overlap
      if (endMinutes === slotStart) return false;

      return hasOverlap;
    });

    return !isOverlapping;
  };

  // Helper function to find available minutes in an hour
  const findAvailableMinutesInHour = (hour, nonOccupied) => {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;

    return nonOccupied
      .filter(interval => {
        const start = timeToMinutes(interval.start);
        const end = timeToMinutes(interval.end);
        return start < hourEnd && end > hourStart;
      })
      .map(interval => {
        const start = Math.max(hourStart, timeToMinutes(interval.start));
        const end = Math.min(hourEnd, timeToMinutes(interval.end));
        return {
          start: start % 60,
          end: end % 60,
          duration: end - start
        };
      });
  };

  // Update handleTimeClick to allow selecting any slot
  const handleTimeClick = (time) => {
    const hour = parseInt(time);
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;

    // Find any terms that end in this hour
    const endingTerms = existingSlots.filter(slot => {
      const slotStart = timeToMinutes(slot.vrijeme);
      const slotEnd = slotStart + slot.duration;
      return slotEnd > hourStart && slotEnd <= hourEnd;
    });

    // Set minutes to the latest ending time in this hour, or 0 if none
    let startMinutes = 0;
    if (endingTerms.length > 0) {
      const latestEnd = Math.max(...endingTerms.map(slot =>
        timeToMinutes(slot.vrijeme) + slot.duration
      ));
      startMinutes = latestEnd % 60;
    }

    setSelectedStartTime(time);
    setMinutes(startMinutes);
  };

  // Update handleMinutesChange to respect occupied slots
  const handleMinutesChange = (increment) => {
    if (!selectedStartTime) return;

    const hour = parseInt(selectedStartTime);
    const currentTimeInMinutes = hour * 60 + minutes;
    const newMinutes = minutes + increment;

    // Find any overlapping slots
    const hasOverlap = existingSlots.some(slot => {
      const slotStart = timeToMinutes(slot.vrijeme);
      const slotEnd = slotStart + slot.duration;

      // Check if new time would overlap
      return currentTimeInMinutes + increment >= slotStart &&
             currentTimeInMinutes + increment < slotEnd;
    });

    if (!hasOverlap && newMinutes >= 0 && newMinutes < 60) {
      setMinutes(newMinutes);
    }
  };

  // Add this helper function to get occupied slots in an hour
  const getOccupiedSlotsInHour = (hour, existingSlots) => {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;

    return existingSlots
      .filter(slot => {
        const slotStart = timeToMinutes(slot.vrijeme);
        const slotEnd = slotStart + slot.duration;
        return slotStart < hourEnd && slotEnd > hourStart;
      })
      .map(slot => {
        const slotStart = timeToMinutes(slot.vrijeme);
        const slotEnd = slotStart + slot.duration;

        // Calculate relative position within the hour
        const startInHour = Math.max(hourStart, slotStart);
        const endInHour = Math.min(hourEnd, slotEnd);

        return {
          type: slot.type || 'učenik',
          mentor: slot.mentor,
          topOffset: ((startInHour - hourStart) / 60) * 100,
          height: ((endInHour - startInHour) / 60) * 100,
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd)
        };
      });
  };

  // Update generateTimeSlots to allow selecting any slot
  const generateTimeSlots = () => {
    const slots = [];

    for (let hour = 8; hour < 22; hour++) {
      const time = String(hour);
      const occupiedSlots = getOccupiedSlotsInHour(hour, existingSlots);

      slots.push(
        <div
          key={time}
          className={`timeline-slot ${selectedStartTime === time ? 'selected' : ''}`}
          onClick={() => handleTimeClick(time)}
        >
          <span className="time-label">{hour}:00</span>
          <div className="slot-content">
            {occupiedSlots.map((indicator, index) => (
              <div
                key={index}
                className={`occupied-indicator type-${indicator.type}`}
                style={{
                  top: `${indicator.topOffset}%`,
                  height: `${indicator.height}%`,
                  minHeight: '24px'
                }}
              >
                <div className="indicator-content">
                  <div className="time-info">
                    <span className="slot-type">
                      {indicator.type === 'teorija' ? 'Teorija' : 'Učenik'}
                    </span>
                    <span className="slot-duration">
                      {indicator.startTime} - {indicator.endTime}
                    </span>
                  </div>
                  {indicator.mentor && (
                    <div className="mentor-info">{indicator.mentor}</div>
                  )}
                </div>
              </div>
            ))}

            {selectedStartTime === time && (
              <div className="minutes-selector">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMinutesChange(-5);
                  }}
                  className="time-btn"
                >
                  -
                </button>
                <span className="minutes-display">
                  {minutes.toString().padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMinutesChange(5);
                  }}
                  className="time-btn"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return slots;
  };

  // Update the validateNewTerm function to handle week validation
  const validateNewTerm = (newTerm, existingTerms) => {
    // Check if duration is valid
    if (!newTerm.duration || newTerm.duration < 15 || newTerm.duration > 180) {
      return 'Trajanje mora biti između 15 i 180 minuta';
    }

    // Check if time is valid
    const timeMinutes = timeToMinutes(newTerm.vrijeme);
    if (timeMinutes < 8 * 60 || timeMinutes > 22 * 60) {
      return 'Vrijeme mora biti između 08:00 i 22:00';
    }

    // Check if the term is for the correct school
    if (user?.schoolId && newTerm.schoolId !== user.schoolId) {
      return 'Termin mora biti za vašu školu';
    }

    // Check for overlaps only within the same school and week
    const overlap = existingTerms.some(term => {
      if (term.day !== newTerm.day || 
          term.dvorana !== newTerm.dvorana || 
          term.schoolId !== newTerm.schoolId) return false;

      // If terms are in different weeks (A/B), they don't overlap
      if (term.week && newTerm.week && term.week !== newTerm.week) return false;
      
      // If one term is for all weeks and other is week-specific, they overlap
      if ((term.week && !newTerm.week) || (!term.week && newTerm.week)) return true;

      const termStart = timeToMinutes(term.vrijeme);
      const termEnd = termStart + term.duration;
      const newTermStart = timeMinutes;
      const newTermEnd = newTermStart + newTerm.duration;

      return (newTermStart < termEnd && newTermEnd > termStart);
    });

    if (overlap) {
      return 'Termin se preklapa s postojećim terminom u odabranom tjednu';
    }

    return null;
  };

  // Update the handleAddTerm function to include week information
  const handleAddTerm = () => {
    if (!selectedDay || !selectedClassroom || !selectedStartTime) {
      showNotification('error', 'Molimo odaberite sve potrebne podatke!');
      return;
    }

    const selectedRoom = classrooms.find(c => c.id.toString() === selectedClassroom.toString());
    const formattedTime = `${selectedStartTime}:${minutes.toString().padStart(2, '0')}`;
    const duration = selectedDuration === 'custom' ? Number(customDuration) : Number(selectedDuration);

    const newTerm = {
      day: selectedDay,
      dvorana: selectedRoom?.name || '',
      vrijeme: formattedTime,
      mentor: inputs.mentor || '',
      duration: duration,
      type: dodajRasporedTeorija ? 'teorija' : 'učenik',
      schoolId: user?.schoolId,
      week: selectedWeek // This can be null (every week), 'A', or 'B'
    };

    // Validate the new term
    const validationError = validateNewTerm(newTerm, [...terms, ...existingSlots]);
    if (validationError) {
      showNotification('error', validationError);
      return;
    }

    // Add the term and reset selection
    setTerms(prevTerms => [...prevTerms, newTerm]);
    setSelectedStartTime(null);
    setMinutes(0);
    setInputs(prev => ({ ...prev, mentor: '' }));

    showNotification('success', 'Termin dodan!');

    // Refresh the available slots
    const updatedSlots = [...existingSlots, newTerm];
    setExistingSlots(updatedSlots);
  };

  const saveTerms = async (terms) => {
    try {
      let res;
      const termData = terms.map(term => ({
        day: term.day,
        dvorana: term.dvorana,
        vrijeme: term.vrijeme,
        mentor: term.mentor || '',
        duration: Number(term.duration),
        schoolId: user?.schoolId,
        type: dodajRasporedTeorija ? 'teorija' : 'učenik',
        week: term.week
      }));

      console.log('Saving terms:', termData);

      if (dodajRasporedTeorija) {
        // For teorija schedule, we need to merge with existing terms
        res = await ApiConfig.api.post('/api/uredi/teorija', {
          raspored: termData,
          schoolId: user?.schoolId,
          updateSchoolId: user?.schoolId,
          merge: true  // Add this flag to indicate we want to merge
        });
      } else if (studentID) {
        res = await ApiConfig.api.post(`/api/uredi/ucenik-raspored/${studentID}`, {
          raspored: termData,
          schoolId: user?.schoolId
        });
      }

      if (res?.data) {
        return res.data;
      }
      throw new Error('No response data');
    } catch (err) {
      console.error('Error saving terms:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsDodajMentoraDisabled(true);

    try {
      const result = await saveTerms(terms);
      if (result) {
        // Invalidate the cache
        await ApiConfig.invalidateCache();
        
        showNotification('success', 'Raspored je uspješno dodan!');
        setTerms([]);
        
        // Close the form
        onCancel();
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('error', 'Došlo je do greške pri spremanju rasporeda!');
    } finally {
      setIsDodajMentoraDisabled(false);
    }
  };

  // Add a preview of added terms
  const renderAddedTerms = () => {
    if (terms.length === 0) return null;

    return (
      <div className="added-terms">
        <h3>Dodani termini:</h3>
        <div className="terms-list">
          {terms.map((term, index) => (
            <div key={index} className="term-item">
              <span>{days.find(d => d.id === term.day)?.label}: </span>
              <span>{term.vrijeme} - {minutesToTime(timeToMinutes(term.vrijeme) + term.duration)}</span>
              <span>{term.dvorana}</span>
              {term.mentor && <span>({term.mentor})</span>}
              <button
                className="remove-term"
                onClick={() => setTerms(prev => prev.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="popup">
      <form onSubmit={handleSubmit}>
        {terms.length > 0 && (
          <div className="div div-clmn">Dodani termini:
            {terms.map((term, index) => (
              <div key={index} className="div-clmn">
                <p>{`${term.day}: ${term.dvorana}, ${term.vrijeme}:00 (${term.duration} min), ${term.mentor}${term.week ? `, Tjedan ${term.week}` : ''}`}</p>
              </div>
            ))}
          </div>
        )}

        <div className="div div-clmn">
          {/* Week selection using notification-filters style */}
          <div className="notification-filters">
            {weeks.map((week) => (
              <button
                key={week.id || 'all'}
                type="button"
                className={`filter-btn ${selectedWeek === week.id ? 'active' : ''}`}
                onClick={() => setSelectedWeek(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>

          {/* Day selection */}
          <div className="div-radio raspored-divs">
            {['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].map((day) => (
              <div
                key={day}
                className={`radio-item ${selectedDay === day ? 'checked' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="div div-clmn">
          <div className="duration-select">
            <label htmlFor="dvorana">Dvorana:</label>
            <select
              className="input-login-signup"
              name="dvorana"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              disabled={isDodajMentoraDisabled}
            >
              <option value="">Odaberite dvoranu</option>
              {classrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            </div>
            <div className="duration-select">
              <label>Trajanje:</label>
              <select
                className="input-login-signup"
                value={selectedDuration}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('Selected duration:', value); // Debug log
                  setSelectedDuration(value === 'custom' ? 'custom' : Number(value));
                }}
                disabled={isDodajMentoraDisabled}
              >
                {durations.map(duration => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>

              {selectedDuration === 'custom' && (
                <div className="custom-duration">
                  <input
                    type="number"
                    className="input-login-signup"
                    placeholder="Unesite minute"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min="15"
                    max="180"
                  />
                </div>
              )}
            </div>

            <div className="timeline-container">
              {generateTimeSlots()}
            </div>

            <label htmlFor="mentor">Napomena:</label>
            <input
              className="input-login-signup"
              value={inputs.mentor}
              onChange={(e) => setInputs({ ...inputs, mentor: e.target.value })}
              type="text"
              name="mentor"
              placeholder="mentor/program/napomena"
            />
          </div>

          <button
            type="button"
            className={`gumb action-btn spremiBtn ${isDodajMentoraDisabled ? 'disabledSpremiBtn' : ''}`}
            onClick={handleAddTerm}
            disabled={!selectedStartTime || isDodajMentoraDisabled}
          >
            + termin
          </button>
        </div>

        <div className="div-radio div-sticky">
          <button
            type="button"
            className="gumb action-btn zatvoriBtn"
            onClick={onCancel}
          >
            Zatvori
          </button>
          <button
            type="submit"
            className={`gumb action-btn spremiBtn ${isDodajMentoraDisabled ? 'disabledSpremiBtn' : ''}`}
            disabled={isDodajMentoraDisabled || terms.length === 0}
          >
            Spremi
          </button>
        </div>
      </form>

    </div>
  );
};


export default DodajTermin;