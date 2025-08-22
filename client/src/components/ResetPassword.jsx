import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ApiConfig from './apiConfig.js';
import '../components/auth-pages.css';
import { Icon } from '@iconify/react';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 for email, 2 for verification code

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      // First check if email exists in users table
      const userResponse = await ApiConfig.api.get(`/api/users/check-email/${email}`);
      if (userResponse.data.exists) {
        await ApiConfig.api.post('/api/reset-password/request', { email });
        setStep(2);
        return;
      }
      // If not in users, check mentors table
      const mentorResponse = await ApiConfig.api.get(`/api/mentors/check-email/${email}`);
      if (mentorResponse.data.exists) {
        await ApiConfig.api.post('/api/reset-password/request', { email });
        setStep(2);
        return;
      }
      // If email not found in either table
      setError('Email adresa nije pronađena. Molimo registrirajte se.');
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Email adresa nije pronađena. Molimo registrirajte se.');
      } else {
        setError('Došlo je do greške. Molimo pokušajte ponovno.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await ApiConfig.api.post('/api/reset-password/verify', {
        email,
        code: verificationCode
      });
      setSuccess('Nova lozinka je poslana na vašu email adresu.');
    } catch (error) {
      if (error.response?.status === 400) {
        setError('Nevažeći ili istekli kod. Molimo pokušajte ponovno.');
      } else {
        setError('Došlo je do greške. Molimo pokušajte ponovno.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              <h3 className="auth-signup-title">Resetiranje lozinke</h3>
              <p className="auth-signup-subtitle">Unesite email adresu za resetiranje lozinke</p>
            </div>
            {error && (
              <div className="auth-error-message">
                <Icon icon="solar:close-circle-broken" />
                <span>{error}</span>
              </div>
            )}
            {success ? (
              <div className="auth-success-message" style={{ textAlign: 'center', marginBottom: 24 }}>
                <Icon icon="solar:check-circle-broken" style={{ color: 'var(--isticanje)', fontSize: 32 }} />
                <h4 style={{ margin: '1rem 0 0.5rem 0' }}>Uspješno!</h4>
                <p>{success}</p>
                <Link to="/login" className="auth-link auth-link-primary" style={{ marginTop: 16, display: 'inline-block' }}>
                  Povratak na prijavu
                </Link>
              </div>
            ) : (
              <form onSubmit={step === 1 ? handleEmailSubmit : handleVerificationSubmit} className="auth-signup-form">
                {step === 1 ? (
                  <>
                    <div className="auth-signup-group">
                      <label htmlFor="reset-email" className="auth-signup-label">
                        Email adresa <span className="auth-required">*</span>
                      </label>
                      <div className="auth-input-wrapper">
                        <Icon icon="solar:letter-broken" className="auth-input-icon" />
                        <input
                          className="auth-signup-input"
                          type="email"
                          id="reset-email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Unesite vašu email adresu"
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-signup-actions">
                      <button className="auth-submit-button" type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="auth-loading-spinner"></div>
                            Slanje...
                          </>
                        ) : (
                          <>
                            <Icon icon="solar:mailbox-broken" />
                            Pošalji verifikacijski kod
                          </>
                        )}
                      </button>
                    </div>
                    <div className="auth-links">
                      <Link to="/login" className="auth-link auth-link-primary">
                        Povratak na prijavu
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="auth-signup-group">
                      <label htmlFor="reset-code" className="auth-signup-label">
                        Verifikacijski kod <span className="auth-required">*</span>
                      </label>
                      <div className="auth-input-wrapper">
                        <Icon icon="solar:shield-check-broken" className="auth-input-icon" />
                        <input
                          className="auth-signup-input"
                          type="text"
                          id="reset-code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Unesite verifikacijski kod"
                          required
                        />
                      </div>
                      <small className="auth-field-note">Kod je poslan na {email}</small>
                    </div>
                    <div className="auth-signup-actions">
                      <button className="auth-submit-button" type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="auth-loading-spinner"></div>
                            Provjera...
                          </>
                        ) : (
                          <>
                            <Icon icon="solar:check-circle-broken" />
                            Potvrdi kod
                          </>
                        )}
                      </button>
                    </div>
                    <div className="auth-links">
                      <button 
                        type="button" 
                        onClick={() => setStep(1)}
                        className="auth-link auth-link-primary"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        Promijeni email adresu
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
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

export default ResetPassword; 