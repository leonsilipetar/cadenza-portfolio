import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { authActions } from '../store';
import '../App.css';
import './auth-pages.css';
import ApiConfig from '../components/apiConfig.js';
import { getFCMToken } from '../firebase-config.js';
import { Icon } from '@iconify/react';

const Login = ({ isEmbedded = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorM, seterrorM] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [inputs, setInputs] = useState({
    email: new URLSearchParams(window.location.search).get('prefill') || '',
    password: '',
  });

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleErrorM = () => {
    seterrorM('Netočni podaci!');
  };

  const handleChange = (e) => {
    setInputs((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    seterrorM('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    seterrorM('');

    try {
      // Allow login with email or username
      const emailOrUsername = inputs.email.trim();
      const payload = { emailOrUsername, password: inputs.password };
      const response = await ApiConfig.api.post('/api/login', payload);
      console.log('Login response:', response.data);

      if (response.data?.token && response.data?.user) {
        dispatch(authActions.loginSuccess({
          token: response.data.token,
          user: response.data.user
        }));
        navigate('/naslovna');
      } else {
        seterrorM('Neispravni podaci za prijavu');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        seterrorM('Netočni podaci za prijavu');
      } else {
        seterrorM('Greška pri prijavi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLoginSuccess = (userData, token) => {
    localStorage.setItem('token', token);
    dispatch(authActions.login(userData));
    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
    sessionStorage.removeItem('redirectAfterLogin');
    navigate(redirectPath);
  };

  return isEmbedded ? (
    <div className="auth-embedded-form">
      <form onSubmit={handleLogin}>
        <input
          className={`auth-input ${errorM ? 'auth-input-error' : ''}`}
          value={inputs.email}
          onChange={handleChange}
          type="text"
          name="email"
          id="kor-email"
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          placeholder="e-mail adresa"
          autoComplete='email'
        />
        <input
          className={`auth-input ${errorM ? 'auth-input-error' : ''}`}
          value={inputs.password}
          onChange={handleChange}
          type={showPassword ? 'text' : 'password'}
          name="password"
          id="kor-lozinka"
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          placeholder="lozinka"
          autoComplete='current-password'
        />
        <button
          className="auth-password-toggle"
          onClick={togglePasswordVisibility}
          type="button"
        >
          {showPassword ? ' Sakrij' : ' Prikaži'} lozinku
        </button>
        <button className="auth-submit-btn" type="submit">
          Prijavi se
        </button>
      </form>
    </div>
  ) : (
    <div className="auth-page">
      <div className="auth-container">
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
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h3 className="auth-form-title">Prijava</h3>
              <p className="auth-form-subtitle">Dobrodošli natrag</p>
            </div>

            {successMessage && (
              <div className="auth-success-message">
                <Icon icon="solar:check-circle-broken" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-input-group">
                <label htmlFor="email" className="auth-label">
                  Email adresa
                </label>
                <div className="auth-input-wrapper">
                  <Icon icon="solar:letter-broken" className="auth-input-icon" />
                  <input
                    type="text"
                    id="email"
                    name="email"
                    className={`auth-form-input ${errorM ? 'auth-form-input-error' : ''} ${emailFocused ? 'auth-form-input-focused' : ''}`}
                    placeholder="Unesite email adresu ili korisničko ime"
                    value={inputs.email}
                    onChange={handleChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoComplete='email'
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="password" className="auth-label">
                  Lozinka
                </label>
                <div className="auth-input-wrapper">
                  <Icon icon="solar:lock-broken" className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className={`auth-form-input ${errorM ? 'auth-form-input-error' : ''} ${passwordFocused ? 'auth-form-input-focused' : ''}`}
                    placeholder="Unesite lozinku"
                    value={inputs.password}
                    onChange={handleChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    autoComplete='current-password'
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle-btn"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                  >
                    <Icon icon={showPassword ? 'solar:eye-closed-broken' : 'solar:eye-broken'} />
                  </button>
                </div>
              </div>

              {errorM && (
                <div className="auth-error-message">
                  <Icon icon="solar:close-circle-broken" />
                  <span>{errorM}</span>
                </div>
              )}

              <button
                type="submit"
                className={`auth-submit-button ${isLoading ? 'auth-submit-button-loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="auth-loading-spinner"></div>
                    Prijavljivanje...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:login-2-broken" />
                    Prijavi se
                  </>
                )}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/signup" className="auth-link auth-link-primary">
                Nemate račun? Registrirajte se
              </Link>
              <Link to="/reset-password" className="auth-link auth-link-secondary">
                Zaboravili ste lozinku?
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

export default Login;