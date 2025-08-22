import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ApiConfig from '../components/apiConfig';
import { showNotification } from '../components/Notifikacija';
import '../components/auth-pages.css';

const MentorSignUpForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the correct route
  const [isValidSignup, setIsValidSignup] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    korisnickoIme: '',
    email: '',
    ime: '',
    prezime: '',
    oib: '',
    brojMobitela: '',
    datumRodjenja: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: ''
    },
    napomene: '',
    school: '',
    program: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [emailExists, setEmailExists] = useState(false);
  const [previousEmail, setPreviousEmail] = useState('');

  // Validate signup route on component mount
  useEffect(() => {
    // Check if we're on the correct secret route
    if (location.pathname === '/signup/f8h3k2j9d5m7n1p4q6r8s0t2u4v6w8x0') {
      setIsValidSignup(true);
    } else {
      setIsValidSignup(false);
    }
    setLoading(false);
  }, [location.pathname]);

  // Fetch schools on component mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await ApiConfig.api.get('/api/schools/public');
        if (Array.isArray(response.data)) {
          setSchools(response.data);
        } else {
          console.error('Unexpected schools data format:', response.data);
          setError('Nije moguće dohvatiti škole. Molimo pokušajte kasnije.');
          setSchools([]);
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
        setError('Nije moguće dohvatiti škole. Molimo pokušajte kasnije.');
        setSchools([]);
      }
    };

    if (isValidSignup) {
      fetchSchools();
    }
  }, [isValidSignup]);

  // Fetch programs when school changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!formData.school) {
        setPrograms([]);
        return;
      }

      try {
        const response = await ApiConfig.api.get(`/api/programs/public/${formData.school}`);
        if (Array.isArray(response.data)) {
          setPrograms(response.data);
        } else {
          console.error('Unexpected programs data format:', response.data);
          setError('Nije moguće dohvatiti programe. Molimo pokušajte kasnije.');
          setPrograms([]);
        }
      } catch (err) {
        console.error('Error fetching programs:', err);
        setError('Nije moguće dohvatiti programe. Molimo pokušajte kasnije.');
        setPrograms([]);
      }
    };

    fetchPrograms();
  }, [formData.school]);

  const validateField = (name, value) => {
    switch (name) {
      case 'ime':
      case 'prezime':
        return value.length < 2 ? 'Mora sadržavati barem 2 znaka' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Unesite ispravnu email adresu' : '';
      case 'oib':
        return value && value.length !== 11 ? 'OIB mora imati točno 11 znamenki' : '';
      case 'brojMobitela':
        return value && !/^\+?\d{8,15}$/.test(value) ? 'Unesite ispravan broj mobitela (min 8 znamenki)' : '';
      case 'school':
        return !value ? 'Odaberite školu' : '';
      case 'program':
        return !value ? 'Odaberite program' : '';
      default:
        return '';
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await ApiConfig.api.get(`/api/mentors/check-email/${encodeURIComponent(email)}`);
      if (response.data.exists) {
        setEmailExists(true);
        setPreviousEmail(email);
        setError('Ova email adresa već postoji u bazi. Molimo prijavite se.');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error checking email:', err);
      return false;
    }
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));

    // Check email existence on blur if it's valid
    if (name === 'email' && !error && value) {
      const exists = await checkEmailExists(value);
      if (!exists) {
        setEmailExists(false);
        setError('');
      }
    }
  };

  const handleInputChange = (e, parent = null) => {
    const { name, value } = e.target;
    
    if (name === 'email' && emailExists) {
      if (value !== previousEmail) {
        setEmailExists(false);
        setError('');
      }
    }
    
    if (parent) {
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // Reset program when school changes
        if (name === 'school') {
          newData.program = '';
        }
        
        return newData;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Required fields
    const requiredFields = ['ime', 'prezime', 'email', 'school', 'program'];
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = 'Obavezan unos';
        isValid = false;
      } else {
        const error = validateField(field, formData[field]);
        if (error) {
          errors[field] = error;
          isValid = false;
        }
      }
    });

    // Optional fields validation
    ['oib', 'brojMobitela'].forEach(field => {
      if (formData[field]) {
        const error = validateField(field, formData[field]);
        if (error) {
          errors[field] = error;
          isValid = false;
        }
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const getInputClassName = (name) => {
    const baseClass = 'auth-signup-input';
    const hasError = touched[name] && fieldErrors[name];
    const isEmailError = name === 'email' && emailExists;
    return `${baseClass} ${hasError || isEmailError ? 'auth-signup-input-error' : ''}`;
  };

  const renderLabel = (htmlFor, text, required = true) => (
    <label htmlFor={htmlFor} className="auth-signup-label">
      {text} {required && <span className="auth-required">*</span>}
    </label>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Use the same endpoint as DodajMentora
      const response = await ApiConfig.api.post('/api/signup-mentori', {
        ...formData,
        isAdmin: false,
        isMentor: true,
        isStudent: false
      });

      if (response.data) {
        setSuccess(true);
        showNotification('success', 'Mentor uspješno registriran! Podaci su poslani na email.');
        
        // Reset form state
        setEmailExists(false);
        setPreviousEmail('');
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Mentor uspješno registriran! Podaci za prijavu su poslani na email.',
              type: 'success'
            }
          });
        }, 2000);
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('već registriran') || 
          err.response?.data?.message?.includes('already exists')) {
        setEmailExists(true);
        setPreviousEmail(formData.email);
        setError('Ova email adresa već postoji u bazi. Molimo prijavite se.');
      } else {
        setError(err.response?.data?.message || 'Greška pri registraciji mentora.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container auth-signup-container">
          <div className="auth-header">
            <h2>Učitavanje...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidSignup) {
    return (
      <div className="auth-page">
        <div className="auth-container auth-signup-container">
          <div className="auth-header">
            <div className="auth-logo-section">
              <img src="/logo225.png" alt="Cadenza Logo" className="auth-main-logo" />
            </div>
            <div className="auth-branding">
              <h1 className="auth-brand-title">Music Art Incubator</h1>
              <h2 className="auth-app-title">CADENZA</h2>
              <p className="auth-subtitle">Platforma za glazbeno obrazovanje</p>
            </div>
          </div>
          <div className="auth-main">
            <div className="auth-signup-content">
              <div className="auth-error-message">
                <Icon icon="solar:shield-cross-broken" />
                <span>Link za registraciju mentora nije važeći.</span>
              </div>
              <div className="auth-links">
                <Link to="/" className="auth-link auth-link-primary">
                  Povratak na početnu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container auth-signup-container">
          <div className="auth-header">
            <div className="auth-logo-section">
              <img src="/logo225.png" alt="Cadenza Logo" className="auth-main-logo" />
            </div>
            <div className="auth-branding">
              <h1 className="auth-brand-title">Music Art Incubator</h1>
              <h2 className="auth-app-title">CADENZA</h2>
              <p className="auth-subtitle">Platforma za glazbeno obrazovanje</p>
            </div>
          </div>
          <div className="auth-main">
            <div className="auth-signup-content">
              <div className="auth-signup-header">
                <Icon icon="solar:check-circle-broken" style={{ color: 'green', fontSize: '3rem' }} />
                <h3 className="auth-signup-title">Uspješno registriran!</h3>
                <p className="auth-signup-subtitle">Mentor je uspješno registriran. Podaci za prijavu su poslani na email.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-signup-container">
        {/* Header Section */}
        <div className="auth-header">
          <div className="auth-logo-section">
            <img
              src="/logo225.png"
              alt="Cadenza Logo"
              className="auth-main-logo"
            />
            <a href="https://musicartincubator.com" target="_blank" rel="noopener noreferrer">
              <img
                src="/MAI-logo-responsive.png"
                alt="Music Art Incubator Logo"
                className="auth-mai-logo"
              />
            </a>
          </div>
          <div className="auth-branding">
            <h1 className="auth-brand-title">Music Art Incubator</h1>
            <h2 className="auth-app-title">CADENZA</h2>
            <p className="auth-subtitle">Platforma za glazbeno obrazovanje</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="auth-main">
          <div className="auth-signup-content">
            <div className="auth-signup-header">
              <h3 className="auth-signup-title">Registracija mentora</h3>
              <p className="auth-signup-subtitle">Ispunite podatke za registraciju mentora</p>
            </div>

            {error && (
              <div className="auth-error-message">
                <Icon icon="solar:close-circle-broken" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-signup-form">
              {/* Personal Information Section */}
              <div className="auth-signup-section">
                <div className="auth-section-header">
                  <Icon icon="solar:user-broken" />
                  <h4>Osobni podaci</h4>
                </div>
                
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('ime', 'Ime')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:user-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="ime"
                        name="ime"
                        value={formData.ime}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('ime')}
                        placeholder="Unesite ime"
                        required
                      />
                    </div>
                    {touched.ime && fieldErrors.ime && (
                      <span className="auth-field-error">{fieldErrors.ime}</span>
                    )}
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('prezime', 'Prezime')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:user-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="prezime"
                        name="prezime"
                        value={formData.prezime}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('prezime')}
                        placeholder="Unesite prezime"
                        required
                      />
                    </div>
                    {touched.prezime && fieldErrors.prezime && (
                      <span className="auth-field-error">{fieldErrors.prezime}</span>
                    )}
                  </div>
                </div>

                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('email', 'Email adresa')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:letter-broken" className="auth-input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`${getInputClassName('email')} ${emailExists ? 'auth-signup-input-error' : ''}`}
                        placeholder="Unesite email adresu"
                        required
                      />
                    </div>
                    {touched.email && fieldErrors.email && (
                      <span className="auth-field-error">{fieldErrors.email}</span>
                    )}
                    <small className="auth-field-note">
                      {emailExists 
                        ? 'Ova email adresa već postoji u bazi. Molimo prijavite se.'
                        : 'Na ovu adresu ćete primiti podatke za prijavu.'}
                    </small>
                    {emailExists && (
                      <Link to="/login" className="auth-link auth-link-primary" style={{ marginTop: 8, display: 'inline-block' }}>
                        Prijavi se
                      </Link>
                    )}
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('korisnickoIme', 'Korisničko ime', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:user-id-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="korisnickoIme"
                        name="korisnickoIme"
                        value={formData.korisnickoIme}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('korisnickoIme')}
                        placeholder="Ostavite prazno za automatsko generiranje"
                      />
                    </div>
                    {touched.korisnickoIme && fieldErrors.korisnickoIme && (
                      <span className="auth-field-error">{fieldErrors.korisnickoIme}</span>
                    )}
                  </div>
                </div>

                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('oib', 'OIB', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:id-card-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="oib"
                        name="oib"
                        value={formData.oib}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('oib')}
                        placeholder="Unesite OIB"
                        maxLength="11"
                      />
                    </div>
                    {touched.oib && fieldErrors.oib && (
                      <span className="auth-field-error">{fieldErrors.oib}</span>
                    )}
                  </div>
                  <div className="auth-signup-group">
                    {renderLabel('brojMobitela', 'Broj mobitela', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:phone-broken" className="auth-input-icon" />
                      <input
                        type="tel"
                        id="brojMobitela"
                        name="brojMobitela"
                        value={formData.brojMobitela}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('brojMobitela')}
                        placeholder="Unesite broj mobitela"
                      />
                    </div>
                    {touched.brojMobitela && fieldErrors.brojMobitela && (
                      <span className="auth-field-error">{fieldErrors.brojMobitela}</span>
                    )}
                  </div>
                </div>

                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('datumRodjenja', 'Datum rođenja', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:calendar-broken" className="auth-input-icon" />
                      <input
                        type="date"
                        id="datumRodjenja"
                        name="datumRodjenja"
                        value={formData.datumRodjenja}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('datumRodjenja')}
                      />
                    </div>
                    {touched.datumRodjenja && fieldErrors.datumRodjenja && (
                      <span className="auth-field-error">{fieldErrors.datumRodjenja}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="auth-signup-section">
                <div className="auth-section-header">
                  <Icon icon="solar:map-point-broken" />
                  <h4>Adresa</h4>
                </div>
                
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('ulica', 'Ulica', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:map-point-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="ulica"
                        name="ulica"
                        value={formData.adresa.ulica}
                        onChange={(e) => handleInputChange(e, 'adresa')}
                        onBlur={handleBlur}
                        className={getInputClassName('ulica')}
                        placeholder="Unesite ulicu"
                      />
                    </div>
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('kucniBroj', 'Kućni broj', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:home-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="kucniBroj"
                        name="kucniBroj"
                        value={formData.adresa.kucniBroj}
                        onChange={(e) => handleInputChange(e, 'adresa')}
                        onBlur={handleBlur}
                        className={getInputClassName('kucniBroj')}
                        placeholder="Unesite kućni broj"
                      />
                    </div>
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('mjesto', 'Mjesto', false)}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:map-point-broken" className="auth-input-icon" />
                      <input
                        type="text"
                        id="mjesto"
                        name="mjesto"
                        value={formData.adresa.mjesto}
                        onChange={(e) => handleInputChange(e, 'adresa')}
                        onBlur={handleBlur}
                        className={getInputClassName('mjesto')}
                        placeholder="Unesite mjesto"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* School and Program Selection */}
              <div className="auth-signup-section">
                <div className="auth-section-header">
                  <Icon icon="solar:building-broken" />
                  <h4>Škola i Program</h4>
                </div>
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('school', 'Škola')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:buildings-2-broken" className="auth-input-icon" />
                      <select
                        id="school"
                        name="school"
                        value={formData.school}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('school')}
                        required
                      >
                        <option value="">Odaberite školu</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </div>
                    {touched.school && fieldErrors.school && (
                      <span className="auth-field-error">{fieldErrors.school}</span>
                    )}
                  </div>
                  <div className="auth-signup-group">
                    {renderLabel('program', 'Program')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:book-broken" className="auth-input-icon" />
                      <select
                        id="program"
                        name="program"
                        value={formData.program}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('program')}
                        required
                      >
                        <option value="">Odaberite program</option>
                                                 {programs.map(program => (
                           <option key={program.id} value={program.id}>{program.naziv}</option>
                         ))}
                      </select>
                    </div>
                    {touched.program && fieldErrors.program && (
                      <span className="auth-field-error">{fieldErrors.program}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="auth-signup-section">
                <div className="auth-section-header">
                  <Icon icon="solar:info-circle-broken" />
                  <h4>Dodatne informacije</h4>
                </div>
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('napomene', 'Napomene', false)}
                    <div className="auth-input-wrapper">
                      <textarea
                        id="napomene"
                        name="napomene"
                        value={formData.napomene}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('napomene')}
                        placeholder="Dodatne napomene (opcionalno)"
                        rows="4"
                      />
                    </div>
                    {touched.napomene && fieldErrors.napomene && (
                      <span className="auth-field-error">{fieldErrors.napomene}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal Notice */}
              <div className="auth-legal-notice">
                Nakon registracije, podaci za prijavu će biti poslani na navedenu email adresu. 
                Sistem će automatski generirati lozinku i poslati je zajedno s korisničkim podacima.
              </div>

              {/* Submit Button */}
              <div className="auth-signup-actions">
                <button 
                  type="submit" 
                  className={`auth-submit-button ${isSaving ? 'auth-submit-button-loading' : ''}`}
                  disabled={isSaving || emailExists}
                >
                  {isSaving ? (
                    <>
                      <div className="auth-loading-spinner"></div>
                      Registriram mentora...
                    </>
                  ) : emailExists ? (
                    <>
                      <Icon icon="solar:close-circle-broken" />
                      Ova email adresa već postoji. Prijavite se.
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:user-plus-broken" />
                      Registriraj mentora
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Links */}
            <div className="auth-links">
              <Link to="/login" className="auth-link auth-link-primary">
                Već imate račun? Prijavite se
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <div className="auth-footer-links">
            <Link to="/about" className="auth-footer-link">
              O aplikaciji
            </Link>
            <span className="auth-footer-separator">|</span>
            <a 
              href="https://www.musicartincubator.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="auth-footer-link"
            >
              musicartincubator.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorSignUpForm; 