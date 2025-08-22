import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import './auth-pages.css';

const Welcome = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/user', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return null;

  const features = [
    {
      icon: 'solar:music-notes-broken',
      title: 'Glazbeno obrazovanje',
      description: 'Napredna platforma za učenje glazbe'
    },
    {
      icon: 'solar:calendar-broken',
      title: 'Raspored nastave',
      description: 'Organizirano planiranje nastave i događaja'
    },
    {
      icon: 'solar:chat-line-broken',
      title: 'Komunikacija',
      description: 'Direktna komunikacija između učenika i mentora'
    },
    {
      icon: 'solar:document-text-broken',
      title: 'Dokumenti',
      description: 'Dijeljenje i upravljanje glazbenim materijalima'
    }
  ];

  return (
    <div className="auth-page">
      <div className="auth-container auth-welcome-container">
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
          <div className="auth-welcome-content">
            <div className="auth-welcome-text">
              <h3 className="auth-welcome-title">Dobrodošli u Cadenza</h3>
              <p className="auth-welcome-description">
                Napredna platforma koja povezuje učenike i mentore u glazbenom obrazovanju. 
                Otkrijte nove mogućnosti za učenje i razvoj glazbenih vještina.
              </p>
            </div>

            {/* Features Grid */}
            <div className="auth-features-grid">
              {features.map((feature, index) => (
                <div key={index} className="auth-feature-card">
                  <div className="auth-feature-icon">
                    <Icon icon={feature.icon} />
                  </div>
                  <h4 className="auth-feature-title">{feature.title}</h4>
                  <p className="auth-feature-description">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="auth-welcome-actions">
              <Link to="/login" className="auth-welcome-btn auth-welcome-btn-primary">
                <Icon icon="solar:login-2-broken" />
                Prijavi se
              </Link>
              <Link to="/signup" className="auth-welcome-btn auth-welcome-btn-secondary">
                <Icon icon="solar:user-plus-broken" />
                Registriraj se
              </Link>
            </div>

            {/* Additional Info */}
            <div className="auth-welcome-info">
              <div className="auth-welcome-badge">
                <Icon icon="solar:shield-check-broken" />
                <span>Sigurna i pouzdana platforma</span>
              </div>
              <p className="auth-welcome-note">
                Ova aplikacija je razvijena isključivo za potrebe glazbene škole{' '}
                <a 
                  href="https://www.musicartincubator.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="auth-welcome-link"
                >
                  Music Art Incubator
                </a>
              </p>
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

export default Welcome;































































































































































































































































































































































































































































































































