import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import axios from 'axios';
import ApiConfig from '../components/apiConfig';
import showNotification from '../components/Notifikacija';
import '../components/auth-pages.css';
import { useNavigate, Link } from 'react-router-dom';

// Add reCAPTCHA site key
const RECAPTCHA_SITE_KEY = '6LcdoAcrAAAAADrr4ikXSwJ8Lc267NMEc4YIZ48U'; // Replace with your site key

const UGOVOR_PDF_URL = 'https://musicartincubator-cadenza.onrender.com/UGOVOR-SUGLASNOST-UPISNICA-2025.-2026-Music-Art-Incubator.pdf';

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    ime: '',
    prezime: '',
    email: '',
    oib: '',
    datumRodjenja: '',
    brojMobitela: '',
    adresa: {
      ulica: '',
      kucniBroj: '',
      mjesto: ''
    },
    roditelj1: {
      ime: '',
      prezime: '',
      brojMobitela: ''
    },
    roditelj2: {
      ime: '',
      prezime: '',
      brojMobitela: ''
    },
    schoolId: '',
    programId: '',
    pohadjaTeoriju: false, // restore field
    napomene: '',
    pohadanjeNastave: '',
    maiZbor: false,
  });



  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isUnderAge, setIsUnderAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailExistsReason, setEmailExistsReason] = useState(null); // 'user' | 'pending' | null
  const [previousEmail, setPreviousEmail] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Helper function to get lesson frequency options based on selected program
  const getLessonFrequencyOptions = () => {
    if (!formData.programId || !programs.length) return [];
    
    const selectedProgram = programs.find(p => p.id === parseInt(formData.programId));
    if (!selectedProgram) return [];
    
    // If program has tipovi (detailed pricing), use that
    if (selectedProgram.tipovi && Array.isArray(selectedProgram.tipovi)) {
      return selectedProgram.tipovi;
    }
    
    // Fallback: if program only has basic cijena, create default options
    if (selectedProgram.cijena) {
      return [
        { tip: 'individualno1', cijena: selectedProgram.cijena },
        { tip: 'individualno2', cijena: selectedProgram.cijena },
        { tip: 'grupno', cijena: selectedProgram.cijena }
      ];
    }
    
    return [];
  };

  // Auto-select lesson frequency when program changes (for single-price programs)
  useEffect(() => {
    const options = getLessonFrequencyOptions();
    if (options.length === 1 && !formData.pohadanjeNastave) {
      setFormData(prev => ({
        ...prev,
        pohadanjeNastave: options[0].tip
      }));
    }
  }, [formData.programId, programs]);

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

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!formData.schoolId) {
        setPrograms([]);
        return;
      }

      try {
        const response = await ApiConfig.api.get(`/api/programs/public/${formData.schoolId}`);
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
  }, [formData.schoolId]);

  useEffect(() => {
    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=6LcdoAcrAAAAADrr4ikXSwJ8Lc267NMEc4YIZ48U`;
    script.addEventListener('load', () => setRecaptchaLoaded(true));
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  const userAge = formData.datumRodjenja ? calculateAge(formData.datumRodjenja) : null;

  const handleDateChange = (e) => {
    const birthDate = e.target.value;
    const age = calculateAge(birthDate);
    setIsUnderAge(age < 18);
    setFormData(prev => ({
      ...prev,
      datumRodjenja: birthDate,
      maloljetniClan: age < 18
    }));
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'ime':
      case 'prezime':
        return value.length < 2 ? 'Mora sadržavati barem 2 znaka' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Unesite ispravnu email adresu' : '';
      case 'oib':
        return value.length !== 11 ? 'OIB mora imati točno 11 znamenki' : '';
      case 'datumRodjenja':
        return !value ? 'Obavezan unos' : '';
      case 'brojMobitela':
        return !/^\+?\d{8,15}$/.test(value) ? 'Unesite ispravan broj mobitela (min 8 znamenki)' : '';
      case 'schoolId':
        return !value ? 'Odaberite školu' : '';
      case 'programId':
        return !value ? 'Odaberite program' : '';
      case 'pohadanjeNastave':
        return !value ? 'Odaberite način pohađanja nastave' : '';
      default:
        return '';
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await ApiConfig.api.get(`/api/check-email?email=${encodeURIComponent(email)}`);
      if (response.data.exists) {
        setEmailExists(true);
        setPreviousEmail(email);
        const serverMsg = response.data.message || '';
        const isPending = serverMsg.toLowerCase().includes('aktivan zahtjev') || serverMsg.toLowerCase().includes('pending');
        setEmailExistsReason(isPending ? 'pending' : 'user');
        setError(serverMsg || 'Ova email adresa već postoji u bazi.');
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
        setError(null);
      }
    }
  };

  const handleInputChange = (e, parent = null) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'email' && emailExists) {
      if (value !== previousEmail) {
        setEmailExists(false);
        setEmailExistsReason(null);
        setError(null);
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
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate required fields
    Object.keys(formData).forEach(key => {
      if (key === 'adresa' || key === 'roditelj1' || key === 'roditelj2') {
        return; // Skip nested objects
      }
      
      const value = formData[key];
      const error = validateField(key, value);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    // Validate nested objects
    if (isUnderAge) {
      ['roditelj1', 'roditelj2'].forEach((r) => {
        if (!formData[r].ime || !formData[r].prezime || !/^\+?\d{8,15}$/.test(formData[r].brojMobitela)) {
          errors[r] = 'Ime, prezime i ispravan broj mobitela su obavezni za oba roditelja/skrbnika';
          isValid = false;
        }
      });
    }

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

  const executeRecaptcha = async () => {
    if (!recaptchaLoaded) {
      throw new Error('reCAPTCHA not loaded');
    }
    
    return new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute('6LcdoAcrAAAAADrr4ikXSwJ8Lc267NMEc4YIZ48U', { action: 'signup' })
          .then(token => resolve(token))
          .catch(err => reject(err));
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha();

      const submissionData = {
        ...formData,
        schoolId: formData.schoolId,
        programId: formData.programId,
        maloljetniClan: isUnderAge,
        recaptchaToken
      };

      await ApiConfig.api.post('/api/signup/pending', submissionData);
      
      // Store success data for the thank you message
      setSuccessData({
        ime: formData.ime,
        prezime: formData.prezime,
        email: formData.email,
        schoolName: schools.find(s => s.id === formData.schoolId)?.name || 'glazbenu školu',
        programName: programs.find(p => p.id === formData.programId)?.naziv || 'program'
      });
      
      // Show success state instead of immediate redirect
      setShowSuccess(true);
      
      // Auto-redirect after 5 seconds
      setTimeout(() => {
        navigate('/', { 
          state: { 
            message: 'Vaša prijava je zaprimljena. Administrator će pregledati vašu prijavu i u roku od 24-48 sati ćete primiti email s podacima za prijavu.' 
          } 
        });
      }, 5000);
      
    } catch (err) {
      console.error('Error submitting form:', err);
      
      // Preserve all form data and form state when there's an error
      // This ensures users don't lose their input
      
      if (err.response?.data?.message?.includes('već registriran') || 
          err.response?.data?.message?.includes('already exists')) {
        setEmailExists(true);
        setPreviousEmail(formData.email);
        setError('Ova email adresa već postoji u bazi. Molimo prijavite se.');
      } else if (err.response?.status === 429) {
        // Rate limiting error
        setError('Previše pokušaja. Molimo pričekajte nekoliko minuta prije ponovnog pokušaja.');
      } else if (err.response?.status >= 500) {
        // Server error
        setError('Došlo je do greške na serveru. Molimo pokušajte ponovno za nekoliko minuta.');
      } else if (err.response?.status === 400) {
        // Bad request - validation error from server
        setError(err.response?.data?.message || 'Molimo provjerite unesene podatke i pokušajte ponovno.');
      } else if (!err.response) {
        // Network error
        setError('Problem s internet vezom. Molimo provjerite svoju vezu i pokušajte ponovno.');
      } else {
        setError(err.response?.data?.message || 'Došlo je do greške prilikom slanja prijave. Molimo pokušajte ponovno.');
      }
      
      // Clear any previous email existence state if it's a different type of error
      if (!err.response?.data?.message?.includes('već registriran') && 
          !err.response?.data?.message?.includes('already exists')) {
        setEmailExists(false);
        setEmailExistsReason(null);
        setPreviousEmail('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success message component
  const renderSuccessMessage = () => (
    <div className="auth-success-container">
      <div className="auth-success-content">
        <div className="auth-success-icon">
          <Icon icon="solar:heart-broken" />
        </div>
        <h2 className="auth-success-title">Hvala vam na prijavi! 🎵</h2>
        <div className="auth-success-message">
          <p>Drago nam je što ste odabrali <strong>Music Art Incubator</strong>!</p>
          <p>Vaša prijava za <strong>{successData?.programName}</strong> u <strong>{successData?.schoolName}</strong> je uspješno zaprimljena.</p>
          <p>Administrator će pregledati vašu prijavu i u roku od <strong>24-48 sati</strong> ćete primiti email s podacima za prijavu.</p>
        </div>
        <div className="auth-success-details">
          <div className="auth-success-detail">
            <Icon icon="solar:user-broken" />
            <span><strong>{successData?.ime} {successData?.prezime}</strong></span>
          </div>
          <div className="auth-success-detail">
            <Icon icon="solar:letter-broken" />
            <span>{successData?.email}</span>
          </div>
        </div>
        <div className="auth-success-footer">
          <p>Uživajte u glazbi i vidimo se uskoro! 🎼</p>
          <p className="auth-success-redirect">Preusmjeravanje na početnu stranicu za 5 sekundi...</p>
        </div>
      </div>
    </div>
  );

  // If showing success, render success message instead of form
  if (showSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-container auth-signup-container">
          {/* Header Section */}
          <div className="auth-header">
            <div className="auth-logo-section">
              <img
                src="/logo512.png"
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

          {/* Success Content */}
          <div className="auth-main">
            {renderSuccessMessage()}
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
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-signup-container">
        {/* Header Section */}
        <div className="auth-header">
          <div className="auth-logo-section">
            <img
              src="/logo512.png"
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
              <h3 className="auth-signup-title">Registracija novog korisnika</h3>
              <p className="auth-signup-subtitle">Ispunite podatke za prijavu u glazbenu školu</p>
            </div>

            {error && (
              <div className="auth-error-message">
                <Icon icon="solar:close-circle-broken" />
                <span>{error}</span>
                {error.includes('internet vezom') || error.includes('serveru') && (
                  <button 
                    type="button"
                    onClick={() => setError(null)}
                    className="auth-error-retry"
                  >
                    Pokušaj ponovno
                  </button>
                )}
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
                        ? (emailExistsReason === 'pending'
                            ? 'Zahtjev s ovom email adresom je već zaprimljen i čeka odobrenje administratora.'
                            : 'Ova email adresa je već registrirana. Molimo prijavite se.')
                        : 'Na ovu adresu ćete primiti podatke za prijavu nakon odobrenja.'}
                    </small>
                    {emailExists && emailExistsReason === 'user' && (
                      <Link to="/login" className="auth-link auth-link-primary" style={{ marginTop: 8, display: 'inline-block' }}>
                        Prijavi se
                      </Link>
                    )}
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('oib', 'OIB')}
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
                        required
                      />
                    </div>
                    {touched.oib && fieldErrors.oib && (
                      <span className="auth-field-error">{fieldErrors.oib}</span>
                    )}
                  </div>
                </div>

                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('datumRodjenja', 'Datum rođenja')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:calendar-broken" className="auth-input-icon" />
                      <input
                        type="date"
                        id="datumRodjenja"
                        name="datumRodjenja"
                        value={formData.datumRodjenja}
                        onChange={handleDateChange}
                        onBlur={handleBlur}
                        className={getInputClassName('datumRodjenja')}
                        required
                      />
                    </div>
                    {touched.datumRodjenja && fieldErrors.datumRodjenja && (
                      <span className="auth-field-error">{fieldErrors.datumRodjenja}</span>
                    )}
                    {isUnderAge && (
                      <small className="auth-field-note">
                        <Icon icon="solar:info-circle-broken" />
                        Maloljetni korisnik - potrebni su podaci o roditelju
                      </small>
                    )}
                  </div>
                  <div className="auth-signup-group">
                    {renderLabel('brojMobitela', 'Broj mobitela')}
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
                        required
                      />
                    </div>
                    {touched.brojMobitela && fieldErrors.brojMobitela && (
                      <span className="auth-field-error">{fieldErrors.brojMobitela}</span>
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

              {/* Parent Information Section (if underage) */}
              {isUnderAge && (
                <div className="auth-signup-section">
                  <div className="auth-section-header">
                    <Icon icon="solar:users-group-broken" />
                    <h4>Podaci o roditelju</h4>
                  </div>
                  
                  <div className="auth-signup-row">
                    <div className="auth-signup-group">
                      {renderLabel('roditelj1Ime', 'Ime roditelja')}
                      <div className="auth-input-wrapper">
                        <Icon icon="solar:user-broken" className="auth-input-icon" />
                        <input
                          type="text"
                          id="roditelj1Ime"
                          name="ime"
                          value={formData.roditelj1.ime}
                          onChange={(e) => handleInputChange(e, 'roditelj1')}
                          onBlur={handleBlur}
                          className={getInputClassName('roditelj1Ime')}
                          placeholder="Unesite ime roditelja"
                          required
                        />
                      </div>
                      {touched.roditelj1Ime && fieldErrors.roditelj1Ime && (
                        <span className="auth-field-error">{fieldErrors.roditelj1Ime}</span>
                      )}
                    </div>
                    
                    <div className="auth-signup-group">
                      {renderLabel('roditelj1Prezime', 'Prezime roditelja')}
                      <div className="auth-input-wrapper">
                        <Icon icon="solar:user-broken" className="auth-input-icon" />
                        <input
                          type="text"
                          id="roditelj1Prezime"
                          name="prezime"
                          value={formData.roditelj1.prezime}
                          onChange={(e) => handleInputChange(e, 'roditelj1')}
                          onBlur={handleBlur}
                          className={getInputClassName('roditelj1Prezime')}
                          placeholder="Unesite prezime roditelja"
                          required
                        />
                      </div>
                      {touched.roditelj1Prezime && fieldErrors.roditelj1Prezime && (
                        <span className="auth-field-error">{fieldErrors.roditelj1Prezime}</span>
                      )}
                    </div>
                    
                    <div className="auth-signup-group">
                      {renderLabel('roditelj1BrojMobitela', 'Broj mobitela')}
                      <div className="auth-input-wrapper">
                        <Icon icon="solar:phone-broken" className="auth-input-icon" />
                        <input
                          type="tel"
                          id="roditelj1BrojMobitela"
                          name="brojMobitela"
                          value={formData.roditelj1.brojMobitela}
                          onChange={(e) => handleInputChange(e, 'roditelj1')}
                          onBlur={handleBlur}
                          className={getInputClassName('roditelj1BrojMobitela')}
                          placeholder="Unesite broj mobitela"
                          required
                        />
                      </div>
                      {touched.roditelj1BrojMobitela && fieldErrors.roditelj1BrojMobitela && (
                        <span className="auth-field-error">{fieldErrors.roditelj1BrojMobitela}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* School and Program Section */}
              <div className="auth-signup-section">
                <div className="auth-section-header">
                  <Icon icon="solar:school-broken" />
                  <h4>Škola i program</h4>
                </div>
                
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    {renderLabel('schoolId', 'Škola')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:buildings-2-broken" className="auth-input-icon" />
                      <select
                        id="schoolId"
                        name="schoolId"
                        value={formData.schoolId}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('schoolId')}
                        required
                      >
                        <option value="">Odaberite školu</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {touched.schoolId && fieldErrors.schoolId && (
                      <span className="auth-field-error">{fieldErrors.schoolId}</span>
                    )}
                  </div>
                  
                  <div className="auth-signup-group">
                    {renderLabel('programId', 'Program')}
                    <div className="auth-input-wrapper">
                      <Icon icon="solar:book-broken" className="auth-input-icon" />
                      <select
                        id="programId"
                        name="programId"
                        value={formData.programId}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClassName('programId')}
                        required
                      >
                        <option value="">
                          {formData.schoolId ? 'Odaberite program' : 'Prvo odaberite školu'}
                        </option>
                        {programs.map(program => (
                          <option key={program.id} value={program.id}>
                            {program.naziv}
                            {program.tipovi && Array.isArray(program.tipovi) && program.tipovi.length > 0 && (
                              (() => {
                                const count = program.tipovi.length;
                                if (count === 1) return ' - 1 opcija';
                                if (count === 2) return ' - 2 opcije';
                                if (count === 3) return ' - 3 opcije';
                                if (count === 4) return ' - 4 opcije';
                                if (count === 5) return ' - 5 opcija';
                                return ` - ${count} opcija`;
                              })()
                            )}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Show selected program info */}
                    {formData.programId && programs.length > 0 && (
                      <div className="program-info-box">
                        <div className="program-name">
                          {programs.find(p => p.id === parseInt(formData.programId))?.naziv}
                        </div>
                        <div className="program-description">
                          {(() => {
                            const selectedProgram = programs.find(p => p.id === parseInt(formData.programId));
                            if (!selectedProgram) return '';
                            
                            if (selectedProgram.tipovi && Array.isArray(selectedProgram.tipovi)) {
                              if (selectedProgram.tipovi.length === 1) {
                                return `Jedna cijena: ${selectedProgram.tipovi[0].cijena}€`;
                              } else {
                                return `${selectedProgram.tipovi.length} različite cijene ovisno o načinu pohađanja`;
                              }
                            } else if (selectedProgram.cijena) {
                              return `Cijena: ${selectedProgram.cijena}€`;
                            }
                            return 'Cijena nije definirana';
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {touched.programId && fieldErrors.programId && (
                      <span className="auth-field-error">{fieldErrors.programId}</span>
                    )}
                  </div>
                </div>
                <div className="auth-signup-row">
                  <div className="auth-signup-group">
                    <label className="auth-signup-label" style={{marginBottom: '0.5rem', fontWeight: 600}}>
                      Pohađanje nastave <span className="auth-required">*</span>
                      {formData.programId && (
                        <span style={{ 
                          color: '#666', 
                          fontWeight: 'normal', 
                          marginLeft: '8px',
                          fontSize: '14px'
                        }}>
                          - {programs.find(p => p.id === parseInt(formData.programId))?.naziv}
                        </span>
                      )}
                    </label>
                    
                    {formData.programId ? (
                      <div className="auth-radio-group styled-radio-group">
                        {getLessonFrequencyOptions().map((option, index) => (
                          <label 
                            key={option.tip} 
                            className={`styled-radio${formData.pohadanjeNastave === option.tip ? ' selected' : ''}`}
                          >
                            <div className="radio-content">
                              <input 
                                type="radio" 
                                name="pohadanjeNastave" 
                                value={option.tip} 
                                checked={formData.pohadanjeNastave === option.tip} 
                                onChange={handleInputChange} 
                                required 
                              />
                              <span className="styled-radio-custom"></span>
                                                             <span>
                                 {option.tip === 'individualno1' && 'Individualno 1x tjedno'}
                                 {option.tip === 'individualno2' && 'Individualno 2x tjedno'}
                                 {option.tip === 'grupno' && 'Grupno'}
                                 {option.tip === 'none' && '1x tjedno'}
                                 {!['individualno1', 'individualno2', 'grupno', 'none'].includes(option.tip) && option.tip}
                               </span>
                            </div>
                            <span className="radio-price">
                              {option.cijena}€
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '6px',
                        border: '1px solid #e9ecef',
                        color: '#6c757d',
                        fontSize: '14px'
                      }}>
                        <Icon icon="solar:info-circle-broken" style={{ marginRight: '4px' }} />
                        Prvo odaberite program da vidite dostupne opcije pohađanja nastave
                      </div>
                    )}
                    
                    {touched.pohadanjeNastave && fieldErrors.pohadanjeNastave && (
                      <span className="auth-field-error">{fieldErrors.pohadanjeNastave}</span>
                    )}
                    
                    {/* Show pricing info when program is selected */}
                    {formData.programId && getLessonFrequencyOptions().length > 0 && (
                      <div style={{ 
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(var(--isticanje), 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(var(--isticanje), 0.3)'
                      }}>
                        <small style={{ color: 'rgb(var(--isticanje))', fontSize: '13px' }}>
                          <Icon icon="solar:info-circle-broken" style={{ marginRight: '4px' }} />
                          {getLessonFrequencyOptions().length === 1 
                            ? 'Ovaj program ima jednu cijenu za sve načine pohađanja'
                            : 'Odaberite način pohađanja nastave koji vam odgovara'
                          }
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="auth-signup-row">
                  <div className="auth-signup-group auth-checkbox-group">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        name="pohadjaTeoriju"
                        checked={formData.pohadjaTeoriju}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="auth-checkbox"
                      />
                      <span className="auth-checkbox-custom"></span>
                      <span className="auth-checkbox-text">Glazbeno opismenjavanje</span>
                    </label>
                  </div>
                </div>
                <div className="auth-signup-row">
                  <div className="auth-signup-group auth-checkbox-group">
                    <label className="auth-checkbox-label">
                      <input type="checkbox" name="maiZbor" checked={formData.maiZbor} onChange={handleInputChange} className="auth-checkbox" />
                      <span className="auth-checkbox-custom"></span>
                      <span className="auth-checkbox-text">MAI zborski programi</span>
                    </label>
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

              {/* Agreement Section */}
              <div className="auth-signup-section">
                <div className="auth-signup-row">
                  <div className="auth-signup-group auth-checkbox-group">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        name="agreementChecked"
                        checked={agreementChecked}
                        onChange={e => setAgreementChecked(e.target.checked)}
                        className="auth-checkbox"
                        required
                      />
                      <span className="auth-checkbox-custom"></span>
                      <span className="auth-checkbox-text">
                        Prihvaćam{' '}
                        <a
                          href={UGOVOR_PDF_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="auth-link"
                          style={{textDecoration: 'underline', color: 'rgb(var(--isticanje))'}}
                        >
                          Uvjeti ugovora i suglasnost
                        </a>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Legal Notice */}
              <div className="auth-legal-notice">
                Klikom na "Pošalji prijavu" potvrđujete da su svi uneseni podaci točni i da je ova prijava pravno jednaka potpisivanju ugovora na papiru. Upisom u školu prihvaćate sve uvjete iz ugovora i suglasnosti.
              </div>

              {/* Submit Button */}
              <div className="auth-signup-actions">
                <button 
                  type="submit" 
                  className={`auth-submit-button ${loading ? 'auth-submit-button-loading' : ''}`}
                  disabled={loading || emailExists || !agreementChecked}
                >
                  {loading ? (
                    <>
                      <div className="auth-loading-spinner"></div>
                      Slanje prijave...
                    </>
                  ) : emailExists ? (
                    <>
                      <Icon icon="solar:close-circle-broken" />
                      Ova email adresa već postoji. Prijavite se.
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:user-plus-broken" />
                      Pošalji prijavu
                    </>
                  )}
                </button>
                
                {/* Additional info when loading */}
                {loading && (
                  <p className="auth-loading-info">
                    Molimo pričekajte, šaljemo vašu prijavu...
                  </p>
                )}
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

export default SignUpForm; 