import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ApiConfig from '../components/apiConfig';
import './About.css';

const About = () => {
  const isLoggedIn = useSelector(state => state.isLoggedIn);
  const navigate = useNavigate();
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: ''
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: '', message: '' });

    try {
      const response = await ApiConfig.api.post('/api/support', supportForm);
      setSupportForm({ subject: '', message: '' });
      setSubmitStatus({
        type: 'success',
        message: 'Vaše pitanje je uspješno poslano. Odgovorit ćemo vam uskoro.'
      });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Došlo je do greške pri slanju poruke. Molimo pokušajte ponovno.'
      });
    }
  };

  const handleInputChange = (e) => {
    setSupportForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const technologies = [
    {
      name: 'PostgreSQL',
      icon: 'logos:postgresql',
      description: 'Powerful, open source object-relational database',
      link: 'https://www.postgresql.org/'
    },
    {
      name: 'Express.js',
      icon: 'skill-icons:expressjs-dark',
      description: 'Fast, unopinionated web framework for Node.js',
      link: 'https://expressjs.com/'
    },
    {
      name: 'React',
      icon: 'logos:react',
      description: 'JavaScript library for building user interfaces',
      link: 'https://reactjs.org/'
    },
    {
      name: 'Node.js',
      icon: 'logos:nodejs',
      description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
      link: 'https://nodejs.org/'
    }
  ];

  const libraries = [
    {
      name: 'ABC Notation',
      icon: 'solar:music-notes-broken',
      description: 'Text-based music notation system',
      link: 'https://abcjs.net/'
    },
    {
      name: 'React Quill',
      icon: 'solar:pen-new-square-broken',
      description: 'Rich text editor for React applications',
      link: 'https://quilljs.com/'
    },
    {
      name: 'Iconify',
      icon: 'solar:gallery-wide-broken',
      description: 'Unified icon framework',
      link: 'https://iconify.design/'
    }
  ];

  return (
    <div className="about-container">
      {isLoggedIn && (
        <button
          onClick={() => navigate('/profil')}
          className="gumb action-btn spremiBtn back-button "
        >
          <Icon icon="solar:arrow-left-broken" />
          Natrag na aplikaciju
        </button>
      )}

      <div className="about-header">
        <div className="header-content">
          <img src="/logo512.png" alt="Cadenza Logo" className="app-logo" />
          <div className="title-section">
            <h1>Cadenza</h1>
            <div className="creator">
              <span>by</span>
              <a
                href="https://github.com/leonsilipetar/cadenza.git"
                target="_blank"
                rel="noopener noreferrer"
                className="creator-link"
              >
                <Icon icon="solar:user-circle-broken" className="creator-icon" />
                <span className="creator-name">Leon Šilipetar</span>
              </a>
            </div>
            <p className="tagline">Platforma za glazbeno obrazovanje</p>
          </div>
        </div>
      </div>

      <div className="about-section">
        <h2>O aplikaciji</h2>
        <p>
          Cadenza je moderna web aplikacija dizajnirana za podršku glazbenom obrazovanju.
          Platforma omogućuje učenicima i profesorima jednostavno dijeljenje dokumenata,
          kreiranje glazbenih zapisa, i međusobnu komunikaciju.
        </p>
        <div className="exclusive-notice">
          <Icon icon="solar:shield-check-broken" className="shield-icon" />
          <div className="mai-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p>
              Ova aplikacija je razvijena isključivo za potrebe glazbene škole
              <a
                href="https://www.musicartincubator.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mai-link"
              >
                Music Art Incubator
              </a>
              i nije dostupna za komercijalnu distribuciju.
            </p>
            <img
              src="/MAI-logo-responsive.png"
              alt="Music Art Incubator Logo"
              style={{ height: '40px' }}
            />
          </div>
        </div>
      </div>

      <div className="about-section">
        <h2>Tehnologije</h2>
        <div className="tech-grid">
          {technologies.map((tech) => (
            <a
              key={tech.name}
              href={tech.link}
              target="_blank"
              rel="noopener noreferrer"
              className="tech-card"
            >
              <Icon icon={tech.icon} className="tech-icon" />
              <h3>{tech.name}</h3>
              <p>{tech.description}</p>
            </a>
          ))}
        </div>
      </div>

      <div className="about-section">
        <h2>Korištene biblioteke</h2>
        <div className="library-grid">
          {libraries.map((lib) => (
            <a
              key={lib.name}
              href={lib.link}
              target="_blank"
              rel="noopener noreferrer"
              className="library-card"
            >
              <Icon icon={lib.icon} className="library-icon" />
              <div>
                <h3>{lib.name}</h3>
                <p>{lib.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="about-section terms">
        <h2>Uvjeti korištenja</h2>
        <div className="terms-content">
          <p>
            Cadenza je obrazovna platforma namijenjena isključivo za potrebe glazbenog obrazovanja.
            Korištenjem ove aplikacije pristajete na sljedeće uvjete:
          </p>
          <h3>Opći uvjeti</h3>
          <ul>
            <li>Aplikacija se koristi isključivo u obrazovne svrhe</li>
            <li>Poštivanje autorskih prava pri dijeljenju materijala</li>
            <li>Odgovorno korištenje platforme i poštivanje drugih korisnika</li>
            <li>Čuvanje privatnosti osobnih podataka</li>
          </ul>

          <h3>Privatnost i zaštita podataka</h3>
          <div id="privacy">
            <ul>
              <li>Prikupljamo i obrađujemo samo podatke nužne za funkcioniranje aplikacije</li>
              <li>Osobni podaci uključuju: ime, prezime, e-mail adresu i podatke o korisničkom računu</li>
              <li>Podaci se čuvaju na sigurnim serverima i ne dijele se s trećim stranama</li>
              <li>Korisnici imaju pravo zatražiti uvid, izmjenu ili brisanje svojih podataka</li>
              <li>Svi osobni podaci zaštićeni su u skladu s GDPR regulativom</li>
              <li>Korisnici mogu u bilo kojem trenutku zatražiti izvoz svojih podataka</li>
              <li>Automatski prikupljamo samo tehničke podatke nužne za rad aplikacije</li>
              <li>Ne koristimo podatke u marketinške svrhe</li>
            </ul>

            <h4>Prikupljanje i obrada podataka</h4>
            <ul>
              <li>Podaci se prikupljaju isključivo uz pristanak korisnika</li>
              <li>Obrada podataka vrši se samo u svrhu pružanja usluga aplikacije</li>
              <li>Pristup podacima imaju samo ovlaštene osobe</li>
              <li>Redovito provodimo sigurnosne provjere i ažuriranja sustava</li>
            </ul>

            <h4>Prava korisnika</h4>
            <ul>
              <li>Pravo na pristup osobnim podacima</li>
              <li>Pravo na ispravak netočnih podataka</li>
              <li>Pravo na brisanje podataka ("pravo na zaborav")</li>
              <li>Pravo na ograničenje obrade</li>
              <li>Pravo na prenosivost podataka</li>
            </ul>
          </div>

          <h3>Korištenje kolačića i lokalnog spremišta</h3>
          <ul>
            <li>Aplikacija koristi kolačiće i lokalno spremište (LocalStorage) za poboljšanje korisničkog iskustva</li>
            <li>U lokalnom spremištu pohranjujemo podatke o prijavi i korisničkim postavkama</li>
            <li>Kolačići se koriste za održavanje sesije i osnovne funkcionalnosti aplikacije</li>
            <li>Možete kontrolirati postavke kolačića kroz svoj web preglednik</li>
          </ul>

          <h3>Sigurnost podataka</h3>
          <ul>
            <li>Koristimo enkripciju za zaštitu osjetljivih podataka</li>
            <li>Redovito ažuriramo sigurnosne protokole</li>
            <li>Preporučujemo korištenje jake lozinke i redovitu promjenu iste</li>
            <li>Ne dijelite svoje pristupne podatke s drugim korisnicima</li>
          </ul>

          <h3>Ograničenje odgovornosti</h3>
          <ul>
            <li>Music Art Incubator d.o.o. nije odgovoran za sadržaj koji dijele korisnici</li>
            <li>Zadržavamo pravo izmjene uvjeta korištenja uz prethodnu obavijest</li>
            <li>Zadržavamo pravo ograničavanja pristupa u slučaju kršenja uvjeta korištenja</li>
          </ul>

          <p className="terms-update">
            Zadnje ažuriranje: Ožujak 2024.
          </p>
        </div>
      </div>

      {isLoggedIn && (
        <div className="about-section support">
          <h2>Tehnička podrška</h2>
          <div className="support-content">
            <form onSubmit={handleSupportSubmit} className="support-form">
              <div className="form-group">
                <label htmlFor="subject">Predmet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={supportForm.subject}
                  onChange={handleInputChange}
                  required
                  placeholder="Ukratko opišite problem"
                  className='input-login-signup'
                />
              </div>
              <div className="form-group">
                <label htmlFor="message">Poruka</label>
                <textarea
                  id="message"
                  name="message"
                  value={supportForm.message}
                  onChange={handleInputChange}
                  required
                  placeholder="Detaljno opišite vaš problem ili pitanje"
                  rows="6"
                  className='input-login-signup'
                />
              </div>
              <button type="submit" className="submit-button">
                Pošalji upit
              </button>
            </form>
            {submitStatus.message && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="about-footer">
        <p>© 2024 Cadenza. Sva prava pridržana.</p>
        <div className="creator-info">
          <span>Izradio: </span>
          <a
            href="https://github.com/leonsilipetar/cadenza.git"
            target="_blank"
            rel="noopener noreferrer"
            className="creator-link"
          >
            <Icon icon="solar:user-circle-broken" className="creator-icon" />
            Leon Šilipetar
          </a>
        </div>
      </footer>
    </div>
  );
};

export default About;