import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Navigacija from './navigacija';
import NavTop from './nav-top';
import ApiConfig from '../components/apiConfig.js';
import RasporedDan from './raspored/RasporedDan.jsx';
import DodajTermin from './raspored/DodajTermin.jsx';
import PostavkeRasporeda from './raspored/PostavkeRasporeda.jsx';
import { Icon } from '@iconify/react';
import NavSideRaspored from './mentori/NavSideRaspored.jsx';
import { showNotification } from '../components/Notifikacija';
import LoadingShell from '../components/LoadingShell.jsx';
import FullSchedulePopup from '../components/FullSchedulePopup.jsx';
import UserProfile from '../components/UserProfile';
import moment from 'moment';

axios.defaults.withCredentials = true;

const Raspored = ({ user, unreadChatsCount}) => {
  const [studentsRaspored, setStudentsRaspored] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState({});
  const [teorija, setTeorija] = useState({});
  const [teorijaID, setTeorijaID] = useState({});
  const [dodajRasporedTeorija, setDodajRasporedTeorija] = useState(false);
  const [dodajRasporedStudent, setDodajRasporedStudent] = useState(false);
  const [rasporedGumb, setRasporedGumb] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [combinedSchedule, setCombinedSchedule] = useState({});
  const [showCombinedSchedule, setShowCombinedSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mentorStudents, setMentorStudents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [showFullSchedulePopup, setShowFullSchedulePopup] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [activeWeek, setActiveWeek] = useState('A');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [initialWeekType, setInitialWeekType] = useState('A');
  const [weekTypeRefDate, setWeekTypeRefDate] = useState(null);
  const [weekFilters, setWeekFilters] = useState([
    { id: 'A', label: 'A tjedan', icon: 'solar:calendar-mark-broken' },
    { id: 'B', label: 'B tjedan', icon: 'solar:calendar-mark-broken' }
  ]);

  // Fetch mentor's students with new pattern
  const fetchMentorStudents = useCallback(async () => {
    if (!user?.id) return;
    let isMounted = true;

    try {
      const response = await ApiConfig.api.get('/api/mentors/students');
      if (isMounted && response.data) {
        setMentorStudents(response.data);
      }
    } catch (error) {
      if (!axios.isCancel(error) && isMounted) {
        console.error('Error fetching mentor students:', error);
        showNotification('error', 'Greška pri dohvaćanju učenika');
      }
    }

    return () => { isMounted = false; };
  }, [user?.id]);

  // Fetch student schedule with new pattern
  const fetchStudentSchedule = useCallback(async (studentId) => {
    if (!studentId) return;
    let isMounted = true;

    try {
      setLoading(true);
      const response = await ApiConfig.api.get(`/api/rasporedUcenik/${studentId}`);
      if (isMounted && response.data) {
        setStudentsRaspored(response.data.schedule || {});
        setSelectedStudent(response.data.student || {});
      }
    } catch (error) {
      if (!axios.isCancel(error) && isMounted) {
        console.error('Error fetching student schedule:', error);
        showNotification('error', 'Greška pri dohvaćanju rasporeda učenika');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => { isMounted = false; };
  }, []);

  // Fetch teorija schedule with new pattern
  const fetchTeorijaSchedule = useCallback(async () => {
    let isMounted = true;

    try {
      const response = await ApiConfig.api.get('/api/rasporedTeorija');

      if (isMounted && response.data?.teorija?.length > 0) {
        // Filter teorija schedules to only show the one matching user's school
        const schoolTeorija = response.data.teorija.find(t => t.schoolId === user?.schoolId);

        // If no matching school teorija is found, don't show any
        if (schoolTeorija) {
          setTeorija({
            pon: schoolTeorija.pon || [],
            uto: schoolTeorija.uto || [],
            sri: schoolTeorija.sri || [],
            cet: schoolTeorija.cet || [],
            pet: schoolTeorija.pet || [],
            sub: schoolTeorija.sub || []
          });
          setTeorijaID(schoolTeorija.id);
        } else {
          // Clear teorija if none matches the school
          setTeorija({});
          setTeorijaID(null);
        }
      }
    } catch (error) {
      if (!axios.isCancel(error) && isMounted) {
        console.error('Error fetching teorija schedule:', error);
        showNotification('error', 'Greška pri dohvaćanju teorijskog rasporeda');
      }
    }

    return () => { isMounted = false; };
  }, [user?.schoolId]);

  // Handle combined schedule view
  const handleCombinedScheduleClick = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiConfig.api.get(`/api/rasporedUcenici/${user.id}`);
      if (response.data?.schedule) {
        setCombinedSchedule(response.data.schedule);
        setShowCombinedSchedule(true);
        setSelectedStudentId(null);
        // Close the sidebar after selecting combined view
        setRasporedGumb(false);
      }
    } catch (error) {
      console.error('Error fetching combined schedules:', error);
      showNotification('error', 'Greška pri dohvaćanju kombiniranog rasporeda');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Add a function to invalidate schedule cache
  const invalidateScheduleCache = useCallback(async () => {
    await ApiConfig.invalidateCache();
    // Refetch relevant schedules based on current view
    if (showCombinedSchedule) {
      await handleCombinedScheduleClick();
    } else if (selectedStudentId) {
      await fetchStudentSchedule(selectedStudentId);
    }
    await fetchTeorijaSchedule();
  }, [showCombinedSchedule, selectedStudentId, handleCombinedScheduleClick, fetchStudentSchedule, fetchTeorijaSchedule]);

  // Initial data fetch
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        if (user.isStudent) {
          await fetchStudentSchedule(user.id);
        }
        if (user.isMentor) {
          await fetchMentorStudents();
        }
        await fetchTeorijaSchedule();
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching initial data:', error);
          showNotification('error', 'Greška pri dohvaćanju podataka');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [user, fetchStudentSchedule, fetchMentorStudents, fetchTeorijaSchedule]);

  // Handle student selection
  const onStudentClick = useCallback(async (studentId) => {
    if (!studentId) {
      console.warn('No student ID provided');
      return;
    }
    setSelectedStudentId(studentId);
    setShowCombinedSchedule(false);
    await fetchStudentSchedule(studentId);
    // Close the sidebar after selecting student
    setRasporedGumb(false);
  }, [fetchStudentSchedule]);

  const handleItemClickRasporedGumb = () => {
    setRasporedGumb(prevValue => !prevValue);
  };

  // Update the getWeekType function to match backend logic
  const getWeekType = useCallback(() => {
    return initialWeekType;
  }, [initialWeekType]);

  // Update the effect to load week type and set it as current
  useEffect(() => {
    const loadWeekTypeSettings = async () => {
      try {
        const response = await ApiConfig.api.get('/api/schedule/week-type');
        if (response.data) {
          const currentType = response.data.weekType;
          setInitialWeekType(currentType);
          setActiveWeek(currentType);

          // Update week filters to show current/next week correctly
          const nextWeek = currentType === 'A' ? 'B' : 'A';
          setWeekFilters([
            { 
              id: currentType, 
              label: `${currentType} tjedan (trenutni)`, 
              icon: 'solar:calendar-mark-broken' 
            },
            { 
              id: nextWeek, 
              label: `${nextWeek} tjedan (sljedeći)`, 
              icon: 'solar:calendar-mark-broken' 
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading week type settings:', error);
      }
    };
    
    loadWeekTypeSettings();
  }, []);

  // Update the getDateForDay function to handle A/B weeks correctly
  const getDateForDay = useCallback((day) => {
    const days = { pon: 1, uto: 2, sri: 3, cet: 4, pet: 5, sub: 6 };
    const curr = new Date(currentDate);
    
    const currentWeekType = getWeekType();
    // If we're viewing a different week than current, adjust the date
    if (currentWeekType !== activeWeek) {
      curr.setDate(curr.getDate() + 7);
    }
    
    const first = curr.getDate() - curr.getDay() + days[day];
    const date = new Date(curr.setDate(first));
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' });
  }, [currentDate, activeWeek, getWeekType]);

  if (loading) return <LoadingShell />;

  return (
    <>
      <Navigacija otvoreno="raspored" unreadChatsCount={unreadChatsCount} />
      <NavTop user={user} naslov="Raspored" />

      {showSettings && (
        <PostavkeRasporeda
          onClose={() => setShowSettings(false)}
          user={user}
        />
      )}

      {dodajRasporedTeorija && (
        <DodajTermin
          dodajRasporedTeorija={dodajRasporedTeorija}
          onCancel={() => setDodajRasporedTeorija(false)}
          user={user}
        />
      )}

      {dodajRasporedStudent && (
        <DodajTermin
          dodajRasporedTeorija={false}
          onCancel={() => setDodajRasporedStudent(false)}
          studentID={selectedStudent.id}
          user={user}
        />
      )}

      <div className="main">
        {user && user.isMentor && (
          <>
            <div className="rl-gumb" onClick={handleItemClickRasporedGumb}>
              <Icon className="icon" icon={rasporedGumb ? "solar:list-up-minimalistic-broken" : "solar:list-down-minimalistic-broken"} />
            </div>
            {rasporedGumb && (
              <NavSideRaspored
                students={mentorStudents}
                onStudentClick={onStudentClick}
                onCombinedScheduleClick={handleCombinedScheduleClick}
                setShowFullSchedulePopup={setShowFullSchedulePopup}
                onSettingsClick={() => setShowSettings(true)}
                user={user}
              />
            )}
          </>
        )}

        {(selectedStudentId || showCombinedSchedule) && user.isMentor && (
          <>
            {showCombinedSchedule ? (
              <div className="raspored-wrapper">
                 {/* Week Filter Tabs */}
              <div>
                    <div className="notification-filters">
                      {weekFilters.map(filter => (
                        <button
                          key={filter.id}
                          className={`filter-btn ${activeWeek === filter.id ? 'active' : ''}`}
                          onClick={() => setActiveWeek(filter.id)}
                        >
                          <Icon icon={filter.icon} />
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
              <div className={`raspored ${getWeekType() === activeWeek ? 'active-week' : ''}`}>
                
                {['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].map((day) => (
                  <RasporedDan
                    key={day}
                    day={day}
                    date={getDateForDay(day)}
                    teorija={combinedSchedule[day]?.filter(item => !item.week || item.week === activeWeek)}
                    user={user}
                    setSchedule={setCombinedSchedule}
                    showNotification={showNotification}
                    isTeorija={false}
                    activeWeek={activeWeek}
                  />
                ))}
              </div>
              </div>
            ) : (
              <>
                <div className='div-radio bc-none'>
                  <div className="div-radio" style={{ gap: '1rem' }}>
                    <p>Raspored učenika: {selectedStudent && selectedStudent.ime} {selectedStudent && selectedStudent.prezime}</p>
                    {selectedStudent && selectedStudent.hasUnpaidInvoice && (<p style={{color: 'rgb(var(--crvena))', backgroundColor: 'rgba(var(--crvena), 0.3)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius)'}}>Učenik nije platio sve račune</p>)}
                    <button
                      className="action-btn"
                      onClick={() => setShowUserProfile(true)}
                      style={{ padding: '0.3rem 0.8rem' }}
                    >
                      <Icon icon="solar:user-id-broken" /> Profil učenika
                    </button>
                    {user && user.isMentor && (
                    <div
                      className=" action-btn abEdit"
                      onClick={() => setDodajRasporedStudent(true)}
                    >
                      <Icon icon="solar:add-circle-broken" fontSize="large" />Uredi raspored
                    </div>
                  )}
                  </div>
                  
                </div>

                <div className="raspored-wrapper">
                {/* Week Filter Tabs */}
                <div>
                    <div className="notification-filters">
                      {weekFilters.map(filter => (
                        <button
                          key={filter.id}
                          className={`filter-btn ${activeWeek === filter.id ? 'active' : ''}`}
                          onClick={() => setActiveWeek(filter.id)}
                        >
                          <Icon icon={filter.icon} />
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                <div className={`raspored ${getWeekType() === activeWeek ? 'active-week' : ''}`}>
                  
                  {studentsRaspored ? (
                    ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].map((day) => (
                      <RasporedDan
                        key={day}
                        day={day}
                        date={getDateForDay(day)}
                        teorija={studentsRaspored[day]?.filter(item => !item.week || item.week === activeWeek)}
                        user={user}
                        student={selectedStudent}
                        setSchedule={setStudentsRaspored}
                        showNotification={showNotification}
                        isTeorija={false}
                        activeWeek={activeWeek}
                      />
                    ))
                  ) : (
                    <p>Nema dostupnog rasporeda</p>
                  )}
                </div>
                </div>
              </>
            )}
          </>
        )}

        {user && user.isStudent && (
          <>
            <div className='div-radio bc-none'>
              <div>
                <p>Raspored učenika</p>
              </div>
            </div>
            <div className="raspored-wrapper">
              {/* Week Filter Tabs */}
              <div>
                    <div className="notification-filters">
                      {weekFilters.map(filter => (
                        <button
                          key={filter.id}
                          className={`filter-btn ${activeWeek === filter.id ? 'active' : ''}`}
                          onClick={() => setActiveWeek(filter.id)}
                        >
                          <Icon icon={filter.icon} />
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
            <div className={`raspored ${getWeekType() === activeWeek ? 'active-week' : ''}`}>
              {studentsRaspored ? (
                ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].map((day) => (
                  <RasporedDan
                    key={day}
                    day={day}
                    date={getDateForDay(day)}
                    teorija={studentsRaspored[day]?.filter(item => !item.week || item.week === activeWeek)}
                    user={user}
                    student={user}
                    setSchedule={setStudentsRaspored}
                    showNotification={showNotification}
                    isTeorija={false}
                    activeWeek={activeWeek}
                  />
                ))
              ) : (
                <div>
                  <p>Nema dostupnog rasporeda</p>
                </div>
              )}
            </div>
            </div>
          </>
        )}

        {/* Teorija Schedule Display */}
        <div className='div-radio bc-none'>
          <div>
            <p>Raspored teorija</p>
          </div>
          {user && user.isAdmin && (
            <div
              className="gumb action-btn abEdit "
              onClick={() => setDodajRasporedTeorija(true)}
            >
              <Icon icon="solar:add-circle-broken" fontSize="large" />Uredi teoriju
            </div>
          )}
        </div>

        <div className="raspored-wrapper">
          {/* Week Filter Tabs */}
          <div>
                    <div className="notification-filters">
                      {weekFilters.map(filter => (
                        <button
                          key={filter.id}
                          className={`filter-btn ${activeWeek === filter.id ? 'active' : ''}`}
                          onClick={() => setActiveWeek(filter.id)}
                        >
                          <Icon icon={filter.icon} />
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
        <div className={`raspored ${getWeekType() === activeWeek ? 'active-week' : ''}`}>
          {teorijaID ? (
            ['pon', 'uto', 'sri', 'cet', 'pet', 'sub'].map((day) => (
              <RasporedDan
                key={day}
                day={day}
                date={getDateForDay(day)}
                teorija={teorija[day]?.filter(item => !item.week || item.week === activeWeek)}
                teorijaID={teorijaID}
                user={user}
                isTeorija={true}
                setSchedule={setTeorija}
                showNotification={showNotification}
                activeWeek={activeWeek}
              />
            ))
          ) : (
            <div>
              <p>Nema dostupnog teorijskog rasporeda za vašu školu</p>
            </div>
          )}
        </div>
        </div>

      </div>
      {user && user.isMentor && showFullSchedulePopup && (
          <FullSchedulePopup
            show={showFullSchedulePopup}
            onClose={() => setShowFullSchedulePopup(false)}
          />
        )}

{showUserProfile && selectedStudent && (
                  <UserProfile
                    userId={selectedStudent.id}
                    onClose={() => setShowUserProfile(false)}
                  />
                )}
    </>
  );
};

export default Raspored;