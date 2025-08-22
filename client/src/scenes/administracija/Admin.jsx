import React from 'react'
import { useEffect, useState } from "react";
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';
import ApiConfig from '../../components/apiConfig.js';
import EnrollmentDashboard from './EnrollmentDashboard.jsx';
import './Admin.css';

const Admin = () => {
  const [user, setUser] = useState();

  const [loading, setLoading] = useState(true);
  const otvoreno = "naslovna";

  const sendRequest = async () => {
    try {
      const res = await ApiConfig.api.get('/api/user');
      return res.data;
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };



  useEffect(() => {
    sendRequest().then((data) => {
      setUser(data?.user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <NavigacijaAdmin user={user} otvoreno={otvoreno}/>
        <NavTopAdministracija user={user} naslov={"Administracija - naslovna"}/>
        <div className="main">
          <div className="loading-container">
            <Icon icon="solar:loading-bold-duotone" className="loading-icon" />
            <p>Učitavanje podataka...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigacijaAdmin user={user} otvoreno={otvoreno}/>
      <NavTopAdministracija user={user} naslov={"Administracija - naslovna"}/>
      <div className="main">
        
        {/* Welcome Section */}
        <div className="admin-welcome-section">
          <div className="welcome-header">
            <div className="welcome-icon">
              <Icon icon="solar:shield-user-broken" />
            </div>
            <div className="welcome-content">
              <h1>Dobrodošli u Administraciju</h1>
              <p>Upravljajte korisnicima, pravilima i funkcionalnostima aplikacije Cadenza</p>
            </div>
          </div>
        </div>



        {/* Main Content Sections */}
        <div className="admin-content-grid">
          
          {/* How the App Works */}
          <div className="content-section">
            <div className="section-header">
              <Icon icon="solar:info-circle-broken" />
              <h2>Kako aplikacija funkcionira</h2>
            </div>
            <div className="section-content">
              <div className="feature-grid">
                <div className="feature-item">
                  <div className="feature-icon">
                    <Icon icon="solar:user-id-broken" />
                  </div>
                  <div className="feature-text">
                    <h4>Upravljanje korisnicima</h4>
                    <p>Dodajte nove studente i mentore, uređujte postojeće podatke i upravljajte ulogama korisnika</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">
                    <Icon icon="solar:calendar-broken" />
                  </div>
                  <div className="feature-text">
                    <h4>Raspored nastave</h4>
                    <p>Kreirajte i upravljajte rasporedom nastave za sve studente i mentore</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">
                    <Icon icon="solar:chat-round-dots-broken" />
                  </div>
                  <div className="feature-text">
                    <h4>Komunikacija</h4>
                    <p>Omogućite komunikaciju između studenata i mentora kroz chat sustav</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">
                    <Icon icon="solar:document-broken" />
                  </div>
                  <div className="feature-text">
                    <h4>Upravljanje dokumentima</h4>
                    <p>Dijelite i upravljajte važnim dokumentima i materijalima</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Roles and Permissions */}
          <div className="content-section">
            <div className="section-header">
              <Icon icon="solar:shield-keyhole-broken" />
              <h2>Uloge i dozvole</h2>
            </div>
            <div className="section-content">
              <div className="roles-grid">
                <div className="role-card student">
                  <div className="role-header">
                    <Icon icon="solar:user-id-broken" />
                    <h4>Student</h4>
                  </div>
                  <ul>
                    <li>Pregled vlastitog profila i podataka</li>
                    <li>Pristup rasporedu nastave</li>
                    <li>Komunikacija s mentorom</li>
                    <li>Pregled obavijesti i dokumenta</li>
                    <li>Upis u školsku godinu</li>
                  </ul>
                </div>
                
                <div className="role-card mentor">
                  <div className="role-header">
                    <Icon icon="solar:user-broken" />
                    <h4>Mentor</h4>
                  </div>
                  <ul>
                    <li>Sve funkcionalnosti studenta</li>
                    <li>Upravljanje grupama studenata</li>
                    <li>Kreiranje i uređivanje rasporeda</li>
                    <li>Komunikacija s studentima</li>
                    <li>Pregled napretka studenata</li>
                  </ul>
                </div>
                
                <div className="role-card admin">
                  <div className="role-header">
                    <Icon icon="solar:shield-keyhole-broken" />
                    <h4>Administrator</h4>
                  </div>
                  <ul>
                    <li>Sve funkcionalnosti mentora</li>
                    <li>Pristup administrativnom sučelju</li>
                    <li>Upravljanje svim korisnicima</li>
                    <li>Kontrola sustava i postavki</li>
                    <li>Pregled statistika i izvještaja</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="content-section">
            <div className="section-header">
              <Icon icon="solar:star-broken" />
              <h2>Ključne funkcionalnosti</h2>
            </div>
            <div className="section-content">
              <div className="features-list">
                <div className="feature-highlight">
                  <Icon icon="solar:smartphone-broken" />
                  <div>
                    <h4>Progressive Web App (PWA)</h4>
                    <p>Aplikacija se može instalirati na uređaj i radi offline s mogućnošću sinkronizacije podataka</p>
                  </div>
                </div>
                
                <div className="feature-highlight">
                  <Icon icon="solar:bell-bing-bold-duotone" />
                  <div>
                    <h4>Push notifikacije</h4>
                    <p>Automatske obavijesti o novim porukama, rasporedu i važnim događajima</p>
                  </div>
                </div>
                
                <div className="feature-highlight">
                  <Icon icon="solar:lock-password-broken" />
                  <div>
                    <h4>Sigurnost i autentifikacija</h4>
                    <p>JWT tokeni, rate limiting i sigurno upravljanje sesijama</p>
                  </div>
                </div>
                
                <div className="feature-highlight">
                  <Icon icon="solar:database-broken" />
                  <div>
                    <h4>Napredno keširanje</h4>
                    <p>Inteligentno keširanje podataka za brže učitavanje i smanjenje opterećenja servera</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Information */}
          <div className="content-section">
            <div className="section-header">
              <Icon icon="solar:settings-broken" />
              <h2>Tehničke informacije</h2>
            </div>
            <div className="section-content">
              <div className="tech-grid">
                <div className="tech-item">
                  <h4>Frontend</h4>
                  <p>React.js, Redux, React Router, PWA funkcionalnosti</p>
                </div>
                <div className="tech-item">
                  <h4>Backend</h4>
                  <p>Node.js, Express.js, Sequelize ORM, PostgreSQL</p>
                </div>
                <div className="tech-item">
                  <h4>Komunikacija</h4>
                  <p>Socket.io za real-time chat, Firebase za push notifikacije</p>
                </div>
                <div className="tech-item">
                  <h4>Sigurnost</h4>
                  <p>JWT autentifikacija, rate limiting, CORS zaštita</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="content-section">
            <div className="section-header">
              <Icon icon="solar:flash-broken" />
              <h2>Brze akcije</h2>
            </div>
            <div className="section-content">
              <div className="quick-actions">
                <button className="action-btn primary" onClick={() => window.location.href = '/korisnici'}>
                  <Icon icon="solar:users-group-rounded-broken" />
                  Upravljaj korisnicima
                </button>
                <button className="action-btn secondary" onClick={() => window.location.href = '/mentori'}>
                  <Icon icon="solar:user-broken" />
                  Upravljaj mentorima
                </button>
                <button className="action-btn secondary" onClick={() => window.location.href = '/enrollments'}>
                  <Icon icon="solar:document-check-broken" />
                  Pregled upisa
                </button>
                <button className="action-btn secondary" onClick={() => window.location.href = '/analytics'}>
                  <Icon icon="solar:chart-broken" />
                  Analitika
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}

export default Admin;