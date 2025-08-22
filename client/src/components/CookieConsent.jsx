import React, { useState, useEffect } from 'react';
import '../styles/CookieConsent.css';

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true and disabled
    functional: false,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowConsent(true);
    } else {
      // Load saved preferences
      try {
        const savedPreferences = JSON.parse(localStorage.getItem('cookiePreferences'));
        if (savedPreferences) {
          setPreferences(prev => ({ ...prev, ...savedPreferences }));
        }
      } catch (error) {
        console.error('Error loading cookie preferences:', error);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    savePreferences(allAccepted);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookiePreferences', JSON.stringify(prefs));
    setPreferences(prefs);
    setShowConsent(false);
    setShowSettings(false);
  };

  if (!showConsent && !showSettings) return null;

  return (
    <div className="cookie-consent">
      <div className="cookie-content">
        {!showSettings ? (
          <>
            <h3>Postavke kolačića</h3>
            <p>
              Koristimo kolačiće kako bismo poboljšali vaše iskustvo korištenja i pružili vam personalizirani sadržaj.
              Kliknite "Prihvati sve" za pristanak na korištenje svih kolačića ili "Prilagodi postavke" za odabir pojedinih kategorija kolačića.
            </p>
            <div className="cookie-buttons">
              <button className="cookie-button secondary" onClick={() => setShowSettings(true)}>
                Prilagodi postavke
              </button>
              <button className="cookie-button primary" onClick={handleAcceptAll}>
                Prihvati sve
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Postavke kolačića</h3>
            <div className="cookie-settings">
              <div className="cookie-option">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                  />
                  <span>Neophodni kolačići</span>
                </label>
                <p>Neophodni za funkcioniranje stranice. Ne mogu se isključiti.</p>
              </div>
              <div className="cookie-option">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      functional: e.target.checked
                    }))}
                  />
                  <span>Funkcionalni kolačići</span>
                </label>
                <p>Omogućuju napredne funkcionalnosti i personalizaciju.</p>
              </div>
              <div className="cookie-option">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      analytics: e.target.checked
                    }))}
                  />
                  <span>Analitički kolačići</span>
                </label>
                <p>Pomažu nam razumjeti kako koristite našu stranicu.</p>
              </div>
              <div className="cookie-option">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      marketing: e.target.checked
                    }))}
                  />
                  <span>Marketinški kolačići</span>
                </label>
                <p>Koriste se za personalizirano oglašavanje.</p>
              </div>
            </div>
            <div className="cookie-buttons">
              <button className="cookie-button secondary" onClick={() => setShowSettings(false)}>
                Natrag
              </button>
              <button className="cookie-button primary" onClick={handleSavePreferences}>
                Spremi postavke
              </button>
            </div>
          </>
        )}
        <div className="cookie-footer">
          <a href="/about#privacy" target="_blank" rel="noopener noreferrer">
            Pravila privatnosti
          </a>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;