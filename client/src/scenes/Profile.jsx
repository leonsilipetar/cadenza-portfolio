import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authActions } from '../store/index';
import { Icon } from '@iconify/react';
import ApiConfig from '../components/apiConfig.js';
import Navigacija from './navigacija';
import NavTop from './nav-top';
import UserInfoComponent from '../components/UserInfo';
import { clearPWAUser, isPWA } from '../utils/pwaUtils';
import LoadingShell from '../components/LoadingShell.jsx';
import { showNotification } from '../components/Notifikacija';
import './Profile.css';

axios.defaults.withCredentials = true;

const Profile = ({ user, unreadChatsCount }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profileData, setProfileData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showSettings, setShowSettings] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [enrollmentSchoolYear, setEnrollmentSchoolYear] = useState(null);
  const [showEnrollmentInfo, setShowEnrollmentInfo] = useState(false);
  const otvoreno = 'profil';
  
  // Initialize reminderSettings from user data or defaults
  const [reminderSettings, setReminderSettings] = useState(() => {
    if (user?.reminderPreferences) {
      return {
        reminderTime: user.reminderPreferences.reminderTime || '14:00',
        classReminders: user.reminderPreferences.classReminders ?? true,
        practiceReminders: user.reminderPreferences.practiceReminders ?? true
      };
    }
    // Only set defaults if there are no user preferences at all
    return {
      reminderTime: '14:00',
      classReminders: true,
      practiceReminders: true
    };
  });

  // Linked accounts for same email
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  // Update reminderSettings when user data changes
  useEffect(() => {
    if (user?.reminderPreferences) {
      setReminderSettings({
        reminderTime: user.reminderPreferences.reminderTime || '14:00',
        classReminders: user.reminderPreferences.classReminders ?? true,
        practiceReminders: user.reminderPreferences.practiceReminders ?? true
      });
    }
  }, [user?.reminderPreferences]);

  // Fetch linked accounts by email
  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      try {
        const res = await ApiConfig.api.get('/api/linked-accounts');
        if (Array.isArray(res.data?.accounts)) {
          // Only keep accounts different from current to show as choices
          setLinkedAccounts(res.data.accounts);
        }
      } catch (err) {
        // ignore silently; feature is optional
      }
    };
    if (user?.email) {
      fetchLinkedAccounts();
    }
  }, [user?.email]);

  // Color presets
  const colorPresets = {
    default: {
      isticanje: '255, 155, 0',
      isticanje2: '220, 220, 220',
      isticanje3: '50, 60, 140',
      pozadina: '240, 240, 240'
    },
    blue: {
      isticanje: '0, 122, 255',
      isticanje2: '200, 220, 240',
      isticanje3: '30, 50, 120',
      pozadina: '235, 240, 245'
    },
    purple: {
      isticanje: '150, 103, 224',
      isticanje2: '210, 210, 230',
      isticanje3: '70, 50, 130',
      pozadina: '245, 240, 250'
    },
    green: {
      isticanje: '132, 169, 140',
      isticanje2: '210, 225, 215',
      isticanje3: '40, 70, 50',
      pozadina: '240, 245, 242'
    },
    coral: {
      isticanje: '255, 127, 80',
      isticanje2: '230, 210, 200',
      isticanje3: '100, 50, 30',
      pozadina: '245, 240, 235'
    },
    teal: {
      isticanje: '0, 128, 128',
      isticanje2: '200, 220, 220',
      isticanje3: '30, 70, 70',
      pozadina: '235, 245, 245'
    },
    rose: {
      isticanje: '255, 105, 180',
      isticanje2: '230, 210, 220',
      isticanje3: '100, 40, 70',
      pozadina: '250, 240, 245'
    }
  };

  // Initialize color settings from localStorage
  const [colorSettings, setColorSettings] = useState(() => {
    const savedColors = {
      isticanje: localStorage.getItem('isticanje'),
      isticanje2: localStorage.getItem('isticanje2'),
      isticanje3: localStorage.getItem('isticanje3'),
      pozadina: localStorage.getItem('pozadina')
    };

    // If no saved colors, use default preset
    if (!savedColors.isticanje) {
      return colorPresets.default;
    }

    return savedColors;
  });

  // Apply saved colors on component mount
  useEffect(() => {
    applyColorTheme(colorSettings);
  }, []); // Empty dependency array means this runs once on mount

  // Apply color theme
  const applyColorTheme = (colors) => {
    // Update CSS variables
    document.documentElement.style.setProperty('--isticanje', colors.isticanje);
    document.documentElement.style.setProperty('--isticanje2', colors.isticanje2);
    document.documentElement.style.setProperty('--isticanje3', colors.isticanje3);
    document.documentElement.style.setProperty('--pozadina', colors.pozadina);
    
    // Save to localStorage
    localStorage.setItem('isticanje', colors.isticanje);
    localStorage.setItem('isticanje2', colors.isticanje2);
    localStorage.setItem('isticanje3', colors.isticanje3);
    localStorage.setItem('pozadina', colors.pozadina);
    
    setColorSettings(colors);
  };

  // Settings Popup Component
  const SettingsPopup = ({ onClose }) => {
    const [localSettings, setLocalSettings] = useState({
      theme,
      reminderSettings: { ...reminderSettings },
      colorSettings: { ...colorSettings }
    });

    // Update localSettings when parent reminderSettings changes
    useEffect(() => {
      setLocalSettings(prev => ({
        ...prev,
        reminderSettings: { ...reminderSettings }
      }));
    }, [reminderSettings]);

    const handleSave = async () => {
      try {
        // Save theme
        setTheme(localSettings.theme);
        document.body.className = localSettings.theme;
        localStorage.setItem('theme', localSettings.theme);

        // Save reminder settings
        if (user?.isStudent) {
          const response = await ApiConfig.api.post('/api/user/reminder-settings', {
            reminderPreferences: {
              reminderTime: localSettings.reminderSettings.reminderTime,
              classReminders: Boolean(localSettings.reminderSettings.classReminders),
              practiceReminders: Boolean(localSettings.reminderSettings.practiceReminders)
            }
          });
          
          if (response.data?.data?.reminderPreferences) {
            const newSettings = response.data.data.reminderPreferences;
            setReminderSettings({
              reminderTime: newSettings.reminderTime || '14:00',
              classReminders: Boolean(newSettings.classReminders),
              practiceReminders: Boolean(newSettings.practiceReminders)
            });
          }
        }

        // Apply color settings
        applyColorTheme(localSettings.colorSettings);

        showNotification('success', 'Postavke su uspješno spremljene');

        setTimeout(() => {
          onClose();
        }, 3000);
      } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('error', 'Greška pri spremanju postavki');
        
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Postavke</h2>
            <button className="modal-close-button" onClick={onClose}>
              <Icon icon="solar:close-circle-broken" />
            </button>
          </div>

          <div className="modal-body">
            {/* Theme Settings */}
            <div className="settings-section">
              <h3>Tema</h3>
              <div className="theme-options">
                <button
                  className={`theme-button ${localSettings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'light' }))}
                >
                  <Icon icon="solar:sun-broken" />
                  Svijetla
                </button>
                <button
                  className={`theme-button ${localSettings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'dark' }))}
                >
                  <Icon icon="solar:moon-stars-broken" />
                  Tamna
                </button>
              </div>
            </div>

            {/* Color Settings */}
            <div className="settings-section">
              <h3>Boje</h3>
              <div className="color-presets">
                {Object.entries(colorPresets).map(([name, colors]) => (
                  <button
                    key={name}
                    className={`color-preset-button ${
                      JSON.stringify(colors) === JSON.stringify(localSettings.colorSettings) ? 'active' : ''
                    }`}
                    onClick={() => setLocalSettings(prev => ({
                      ...prev,
                      colorSettings: colors
                    }))}
                    style={{
                      '--isticanje': colors.isticanje,
                      '--isticanje2': colors.isticanje2
                    }}
                  >
                    <span className="preset-name">
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reminder Settings (only for students) */}
            {user?.isStudent && (
              <div className="settings-section">
                <h3>Podsjetnici</h3>
                <div className="reminder-options">
                  <label className="reminder-option">
                    <input
                      type="checkbox"
                      checked={localSettings.reminderSettings.practiceReminders}
                      onChange={e => setLocalSettings(prev => ({
                        ...prev,
                        reminderSettings: {
                          ...prev.reminderSettings,
                          practiceReminders: e.target.checked
                        }
                      }))}
                    />
                    <span>Podsjetnici za vježbanje</span>
                  </label>
                  <label className="reminder-option">
                    <input
                      type="checkbox"
                      checked={localSettings.reminderSettings.classReminders}
                      onChange={e => setLocalSettings(prev => ({
                        ...prev,
                        reminderSettings: {
                          ...prev.reminderSettings,
                          classReminders: e.target.checked
                        }
                      }))}
                    />
                    <span>Podsjetnici za nastavu</span>
                  </label>
                  <div className="time-picker">
                    <span>Vrijeme podsjetnika:</span>
                    <input
                      type="time"
                      value={localSettings.reminderSettings.reminderTime}
                      onChange={e => setLocalSettings(prev => ({
                        ...prev,
                        reminderSettings: {
                          ...prev.reminderSettings,
                          reminderTime: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="action-btn zatvoriBtn" onClick={onClose}>Odustani</button>
            <button className="action-btn spremiBtn" onClick={handleSave}>Spremi</button>
          </div>
        </div>
      </div>
    );
  };

  // Check enrollment status
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      if (user && user.isStudent) {
        try {
          const res = await ApiConfig.cachedApi.get('/api/enrollment/current');
          const hasEnrolled = res.enrollment && res.enrollment.agreementAccepted;
          setEnrollmentStatus(hasEnrolled ? res.enrollment : null);
          setEnrollmentSchoolYear(res.schoolYear);
          
          const currentMonth = new Date().getMonth() + 1; // 1-12
          const needsEnrollment = !hasEnrolled;
          
          // Show enrollment info if:
          // - Month 6-8 (June-August): Show info about upcoming enrollment
          // - Month 9-12 (September-December): Show enrollment required
          if ((currentMonth >= 6 && currentMonth <= 8) || (currentMonth >= 9 && currentMonth <= 12)) {
            setShowEnrollmentInfo(true);
          }
        } catch (err) {
          console.error('Error checking enrollment status:', err);
          setEnrollmentStatus(false);
          const currentMonth = new Date().getMonth() + 1;
          if ((currentMonth >= 6 && currentMonth <= 8) || (currentMonth >= 9 && currentMonth <= 12)) {
            setShowEnrollmentInfo(true);
          }
        }
      }
    };

    checkEnrollmentStatus();
  }, [user]);

  // Single data fetch effect
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const [schoolsRes, mentorsRes] = await Promise.all([
          ApiConfig.api.get('/api/schools'),
          ApiConfig.api.get('/api/mentori')
        ]);

        if (isMounted) {
          setSchools(schoolsRes.data);
          setMentors(mentorsRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          showNotification('error', 'Greška pri dohvaćanju podataka');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (dispatch) {
      dispatch({ type: 'LOGOUT' });
    }
    window.location.href = '/login';
  };

  // Memoize helper functions
  const getSchoolName = useCallback((schoolId) => {
    if (!schoolId || !schools.length) return 'Unknown School';
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Unknown School';
  }, [schools]);

  const getMentorName = useCallback((mentorId) => {
    if (!mentorId || !mentors.length) return 'Unknown Mentor';
    const mentor = mentors.find(m => m.id === mentorId);
    return mentor ? `${mentor.ime} ${mentor.prezime}` : 'Unknown Mentor';
  }, [mentors]);

  if (loading) return <LoadingShell />;

  return (
    <>
      <Navigacija user={user} otvoreno={otvoreno} unreadChatsCount={unreadChatsCount} />
      <NavTop user={user} naslov="Profil" />

      <div className="main">
        <div className="karticaZadatka sbtwn">
          {/* Settings button */}
          <button 
            className="action-btn zatvoriBtn"
            onClick={() => setShowSettings(true)}
          >
            <Icon icon="solar:settings-broken" className="icon" />
            Postavke
          </button>

          {/* Logout button */}
          <div className={`action-btn abDelete ${isHovered ? 'hovered' : ''}`}>
            <div className="gumb" onClick={handleLogout}>
              <Icon icon="solar:logout-2-broken" /> Odjavi se
            </div>
          </div>
        </div>

        {/* Linked accounts switcher (if multiple accounts on same email) */}
        {Array.isArray(linkedAccounts) && linkedAccounts.length > 1 && (
          <div className="karticaZadatka">
            <div className="div sbtwn">
              <div className="div">
                <h3 style={{ margin: 0 }}>Povezani računi</h3>
                <small>Brzo promijenite račun za djecu povezanu s ovom email adresom</small>
              </div>
              <button className="gumb action-btn" onClick={() => setShowAccountSwitcher(v => !v)}>
                <Icon icon={showAccountSwitcher ? 'solar:minus-square-broken' : 'solar:plus-square-broken'} />
                {showAccountSwitcher ? 'Sakrij' : 'Prikaži'}
              </button>
            </div>

            {showAccountSwitcher && (
              <div className="tablica" style={{ marginTop: '0.75rem' }}>
                <div className="tr naziv">
                  <div className="th">Korisnik</div>
                  <div className="th">Korisničko ime</div>
                  <div className="th">Radnja</div>
                </div>
                {linkedAccounts.map(acc => (
                  <div className="tr" key={acc.id}>
                    <div className="th">{acc.ime} {acc.prezime}{acc.isCurrent ? ' (trenutno prijavljen)' : ''}</div>
                    <div className="th">{acc.korisnickoIme}</div>
                    <div className="th">
                      {acc.isCurrent ? (
                        <span className="gumb" style={{ opacity: 0.6 }}>Aktivan</span>
                      ) : (
                        <a className="gumb action-btn" href={`/login?prefill=${encodeURIComponent(acc.korisnickoIme)}`}>
                          <Icon icon="solar:login-2-broken" /> Prijavi se kao
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="karticaZadatka sbtwn">
          <div className='div linkMAI'>
            <a
              className='gumb action-btn acc-link'
              href="https://www.musicartincubator.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              musicartincubator.com
            </a>
            <Link
              to="/about"
            >
              <button className='gumb action-btn spremiBtn'>
                <Icon icon={'solar:info-circle-broken'} />
                O aplikaciji
              </button>
            </Link>
          </div>
        </div>

        {/* Enrollment Info */}
        {showEnrollmentInfo && user && user.isStudent && (  
          <div className="karticaZadatka">
          <div className="enrollment-card">
            <div className="enrollment-header">
              <div className={`enrollment-icon ${enrollmentStatus ? 'success' : 'warning'}`}>
                <Icon icon={enrollmentStatus ? "solar:check-circle-broken" : "solar:bell-bing-bold-duotone"} />
              </div>
              <div>
                <h3 className="enrollment-title">
                  {enrollmentStatus ? 'Upis potvrđen' : 'Upis u školsku godinu'}
                </h3>
                <p className="enrollment-status">
                  {enrollmentStatus ? 'Status: Aktivno' : 'Status: Čeka potvrdu'}
                </p>
              </div>
            </div>
            
            <div className="enrollment-details">
              {enrollmentStatus ? (
                <>
                  <p>
                    Uspješno ste upisani za školsku godinu
                    <span className="enrollment-year-badge">{enrollmentSchoolYear}</span>
                  </p>
                  <div className="enrollment-date">
                    <Icon icon="solar:calendar-broken" />
                    <span>
                      Datum potvrde: {enrollmentStatus.agreementAcceptedAt ? 
                        new Date(enrollmentStatus.agreementAcceptedAt).toLocaleDateString('hr-HR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 
                        'Nije dostupan'
                      }
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Potrebno je upisati se za školsku godinu
                    <span className="enrollment-year-badge">{enrollmentSchoolYear}</span>
                  </p>
                  <Link to="/enroll" className="enrollment-action-btn">
                    <Icon icon="solar:document-add-broken" />
                    Upiši se!
                  </Link>
                </>
              )}
            </div>
          </div>
          </div>
        )}

        {/* User info */}
        <div className="karticaZadatka">
          <div className="profilDiv">
            {user && (
              <UserInfoComponent
                user={user}
                schoolName={getSchoolName(user.schoolId)}
                mentorName={getMentorName(user.mentorId)}
              />
            )}
          </div>
        </div>

        {/* Settings Popup */}
        {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}
      </div>
    </>
  );
};

export default Profile;
