import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from './apiConfig';
import LoadingShell from './LoadingShell';
import './FullSchedulePopup.css';

const FullSchedulePopup = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [error, setError] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});

  const days = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];

  // Add toggle function for day sections
  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  // Add function to sort schedule items by time
  const sortByTime = (a, b) => {
    const timeA = a.vrijeme_od.split(':').map(Number);
    const timeB = b.vrijeme_od.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  };

  // Group schedule items by day and type
  const groupScheduleItems = (items) => {
    const grouped = {};
    days.forEach(day => {
      const dayItems = items.filter(item => item.dan === day);
      if (dayItems.length > 0) {
        grouped[day] = {
          teorija: dayItems.filter(item => item.type === 'teorija').sort(sortByTime),
          individualna: dayItems.filter(item => item.type === 'individualna').sort(sortByTime)
        };
      }
    });
    return grouped;
  };

  useEffect(() => {
    const fetchAllSchedules = async () => {
      try {
        setLoading(true);
        const [teorijaResponse, individualnaResponse] = await Promise.all([
          ApiConfig.api.get('/api/rasporedTeorija'),
          ApiConfig.api.get('/api/allStudentSchedules')
        ]);

        // Process teorija data - flatten the day-wise schedule
        const teorijaData = [];
        const teorijaDays = teorijaResponse?.data?.teorija?.[0] || {};
        
        // Map day abbreviations to full names
        const dayMapping = {
          pon: 'Ponedjeljak',
          uto: 'Utorak',
          sri: 'Srijeda',
          cet: 'Četvrtak',
          pet: 'Petak',
          sub: 'Subota'
        };

        // Process each day's schedule for teorija
        Object.entries(dayMapping).forEach(([shortDay, fullDay]) => {
          const daySchedule = teorijaDays[shortDay] || [];
          daySchedule.forEach(item => {
            teorijaData.push({
              id: item.id,
              dan: fullDay,
              vrijeme_od: item.vrijeme,
              vrijeme_do: calculateEndTime(item.vrijeme, item.duration),
              ucionica: item.dvorana,
              mentor: item.mentor,
              type: 'teorija',
              title: `Teorija - ${item.dvorana}`
            });
          });
        });

        // Process individual lessons data - flatten all days into single array
        const individualnaData = [];
        const schedules = individualnaResponse?.data || [];
        
        schedules.forEach(schedule => {
          Object.entries(dayMapping).forEach(([shortDay, fullDay]) => {
            const daySchedule = schedule[shortDay] || [];
            daySchedule.forEach(item => {
              individualnaData.push({
                id: item.id,
                dan: fullDay,
                vrijeme_od: item.vrijeme,
                vrijeme_do: calculateEndTime(item.vrijeme, item.duration),
                ucionica: item.dvorana,
                mentor: item.mentor,
                type: 'individualna',
                title: `Individualna nastava - ${schedule.ucenik_ime} ${schedule.ucenik_prezime}`,
                ucenik_ime: schedule.ucenik_ime,
                ucenik_prezime: schedule.ucenik_prezime
              });
            });
          });
        });

        // Combine all data
        const combined = [...teorijaData, ...individualnaData];

        // Extract unique classrooms from teorija data
        const uniqueClassrooms = [...new Set(teorijaData
          .map(item => item.ucionica))]
          .sort();

        setClassrooms(uniqueClassrooms);
        setScheduleData(combined);
        setFilteredData(combined);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setError('Greška pri dohvaćanju rasporeda');
      } finally {
        setLoading(false);
      }
    };

    // Helper function to calculate end time based on start time and duration
    const calculateEndTime = (startTime, durationMinutes) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + (durationMinutes || 45);
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };

    fetchAllSchedules();
  }, []);

  useEffect(() => {
    let filtered = [...scheduleData];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        (item.ucenik_ime && item.ucenik_ime.toLowerCase().includes(query)) ||
        (item.ucenik_prezime && item.ucenik_prezime.toLowerCase().includes(query)) ||
        (item.mentor && item.mentor.toLowerCase().includes(query))
      );
    }

    if (selectedDay) {
      filtered = filtered.filter(item => item.dan === selectedDay);
    }

    if (selectedClassroom) {
      filtered = filtered.filter(item => item.ucionica === selectedClassroom);
    }

    // Add time interval filtering
    if (startTime || endTime) {
      filtered = filtered.filter(item => {
        const itemTime = item.vrijeme_od.split(':').map(Number);
        const itemMinutes = itemTime[0] * 60 + itemTime[1];

        if (startTime && endTime) {
          const start = startTime.split(':').map(Number);
          const end = endTime.split(':').map(Number);
          const startMinutes = start[0] * 60 + start[1];
          const endMinutes = end[0] * 60 + end[1];
          return itemMinutes >= startMinutes && itemMinutes <= endMinutes;
        } else if (startTime) {
          const start = startTime.split(':').map(Number);
          const startMinutes = start[0] * 60 + start[1];
          return itemMinutes >= startMinutes;
        } else if (endTime) {
          const end = endTime.split(':').map(Number);
          const endMinutes = end[0] * 60 + end[1];
          return itemMinutes <= endMinutes;
        }
        return true;
      });
    }

    setFilteredData(filtered);
  }, [searchQuery, selectedDay, selectedClassroom, startTime, endTime, scheduleData]);

  if (loading) return <LoadingShell />;
  if (error) return <div className="error-message">{error}</div>;

  const groupedSchedule = groupScheduleItems(filteredData);

  return (
    <div className="popup">
      <div className="karticaZadatka">
        <div className="full-schedule-header">
          <h2>Kompletan raspored</h2>
          <button className="close-btn" onClick={onClose}>
            <Icon icon="solar:close-circle-broken" />
          </button>
        </div>

        <div className="search-filters">
          <div className="search-bar">
            <Icon icon="solar:magnifer-broken" />
            <input
              type="text"
              placeholder="Pretraži po imenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="day-filter"
          >
            <option value="">Svi dani</option>
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="classroom-filter"
          >
            <option value="">Sve učionice</option>
            {classrooms.map(classroom => (
              <option key={classroom} value={classroom}>{classroom}</option>
            ))}
          </select>

          <div className="time-filter">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="time-input"
              placeholder="Od"
            />
            <span className="time-separator">-</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="time-input"
              placeholder="Do"
            />
          </div>
        </div>

        <div className="schedule-list">
          {Object.keys(groupedSchedule).length > 0 ? (
            Object.entries(groupedSchedule).map(([day, schedules]) => (
              <div key={day} className="day-section">
                <div 
                  className={`day-header ${expandedDays[day] ? 'expanded' : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  <h3>
                    <Icon icon={expandedDays[day] ? "solar:alt-arrow-down-broken" : "solar:alt-arrow-right-broken"} />
                    {day}
                  </h3>
                  <span className="count">
                    {schedules.teorija.length + schedules.individualna.length} termina
                  </span>
                </div>
                
                {expandedDays[day] && (
                  <div className="day-content">
                    {schedules.teorija.length > 0 && (
                      <div className="type-section">
                        <h4>Teorija</h4>
                        {schedules.teorija.map((item, index) => (
                          <div key={`teorija-${index}`} className="schedule-item teorija">
                            <div className="schedule-time">
                              {item.vrijeme_od} - {item.vrijeme_do}
                            </div>
                            <div className="schedule-details">
                              <div className="schedule-title">{item.title}</div>
                              {item.mentor && <div className="schedule-mentor">Mentor: {item.mentor}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {schedules.individualna.length > 0 && (
                      <div className="type-section">
                        <h4>Individualna nastava</h4>
                        {schedules.individualna.map((item, index) => (
                          <div key={`individualna-${index}`} className="schedule-item individualna">
                            <div className="schedule-time">
                              {item.vrijeme_od} - {item.vrijeme_do}
                            </div>
                            <div className="schedule-details">
                              <div className="schedule-title">
                                {item.ucenik_ime} {item.ucenik_prezime}
                              </div>
                              <div className="schedule-location">Učionica: {item.ucionica}</div>
                              {item.mentor && <div className="schedule-mentor">Mentor: {item.mentor}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-results">
              <Icon icon="solar:calendar-broken" />
              <p>Nema pronađenih termina</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullSchedulePopup; 