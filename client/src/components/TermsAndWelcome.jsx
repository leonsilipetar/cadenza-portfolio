import React, { useState, useEffect } from 'react';
import './TermsAndWelcome.css';

const APP_VERSION = '1.0.0'; // You can update this version number

const TermsAndWelcome = () => {
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const termsAccepted = localStorage.getItem('termsAccepted');
    if (!termsAccepted) {
      setShowTerms(true);
    }
  }, []);

  const handleAcceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setShowTerms(false);
  };

  if (!showTerms) return null;

  return (
    <div className="modal-overlay">
      {showTerms && (
        <div className="modal terms-modal">
          
          <div className="modal-content">
            <div className="terms-content">
              <h3>Uvjeti korištenja</h3>
              <p>
                Dobrodošli u Cadenza aplikaciju. Korištenjem ove aplikacije prihvaćate sljedeće uvjete:
              </p>
              <ul>
                <li>Aplikacija je namijenjena za edukativne svrhe</li>
                <li>Korisnici su odgovorni za sadržaj koji dijele</li>
                <li>Zabranjeno je dijeljenje neprimjerenog sadržaja</li>
                <li>Poštujte privatnost drugih korisnika</li>
              </ul>

              <h3>Pravila privatnosti</h3>
              <p>
                Vaša privatnost nam je važna. Evo kako koristimo vaše podatke:
              </p>
              <ul>
                <li>Prikupljamo samo neophodne podatke za funkcioniranje aplikacije</li>
                <li>Vaši osobni podaci su sigurni i nikada se ne dijele s trećim stranama</li>
                <li>Koristimo kolačiće za poboljšanje korisničkog iskustva</li>
                <li>Možete zatražiti brisanje svojih podataka u bilo kojem trenutku</li>
              </ul>

              <p className="help-text" style={{ marginTop: '1rem' }}>
                Kratka napomena: Hvala što koristite Cadenza {APP_VERSION}. Ovdje ćete pratiti obavijesti,
                raspored, dokumente i komunikaciju s mentorima i školom. Ugodno korištenje!
              </p>
            </div>
            <button onClick={handleAcceptTerms} className="gumb action-btn spremiBtn">
              Prihvaćam uvjete korištenja
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsAndWelcome;