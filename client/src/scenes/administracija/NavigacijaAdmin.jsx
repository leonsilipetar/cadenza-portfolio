import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import '../../App.css';

const NavigacijaAdmin = ({ otvoreno }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Toggle Button */}
      <div 
        className="rl-gumb"
        onClick={toggleSidebar}
        style={{ 
          position: 'fixed', 
          top: '0.5rem', 
          left: '0.5rem', 
          zIndex: 9999
        }}
        title="Otvori/zatvori admin navigaciju"
      >
        <Icon className='icon' icon={isOpen ? 'solar:close-square-broken' : 'solar:hamburger-menu-broken'} />
      </div>

      {/* Sidebar */}
      <div className={`adminside raspored-lista ${isOpen ? 'open' : ''}`} style={{ 
        transform: isOpen ? 'translateX(0)' : 'translateX(-120%)',
        transition: 'transform 0.3s ease',
        zIndex: 9998
      }}>
        <div className="rl-items">
          <div className={`rl ${otvoreno === 'naslovna' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/admin" 
              onClick={() => setIsOpen(false)}
              title="Naslovna stranica administracije"
            >
              <Icon className="icon" icon="solar:home-2-broken" />
              <p>Naslovna</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'pending-users' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/pending-users" 
              onClick={() => setIsOpen(false)}
              title="Pregled zahtjeva za registraciju"
            >
              <Icon className="icon" icon="solar:user-plus-broken" />
              <p>Zahtjevi</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'korisnici' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/korisnici" 
              onClick={() => setIsOpen(false)}
              title="Upravljanje učenicima"
            >
              <Icon className="icon" icon="solar:users-group-rounded-broken" />
              <p>Učenici</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'mentori' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/mentori" 
              onClick={() => setIsOpen(false)}
              title="Upravljanje mentorima"
            >
              <Icon className="icon" icon="solar:user-rounded-broken" />
              <p>Mentori</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'enrollments' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/enrollments" 
              onClick={() => setIsOpen(false)}
              title="Pregled godišnjih upisa"
            >
              <Icon className="icon" icon="solar:clipboard-list-broken" />
              <p>Upisi</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'racuni' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/racuni-admin" 
              onClick={() => setIsOpen(false)}
              title="Upravljanje računima"
            >
              <Icon className="icon" icon="solar:bill-list-broken" />
              <p>Računi</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'programi' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/programi" 
              onClick={() => setIsOpen(false)}
              title="Upravljanje programima"
            >
              <Icon className="icon" icon="solar:case-broken" />
              <p>Programi</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'classrooms' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/classrooms" 
              onClick={() => setIsOpen(false)}
              title="Upravljanje učionicama"
            >
              <Icon className="icon" icon="solar:buildings-2-broken" />
              <p>Učionice</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'drive' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/drive-integration" 
              onClick={() => setIsOpen(false)}
              title="Google Drive integracija"
            >
              <Icon className="icon" icon="logos:google-drive" />
              <p>Google Drive</p>
            </Link>
          </div>
          
          <div className={`rl ${otvoreno === 'delete' ? 'otvoreno' : ''}`}>
            <Link 
              className="link" 
              to="/delete" 
              onClick={() => setIsOpen(false)}
              title="Brisanje podataka"
            >
              <Icon className="icon" icon="solar:trash-bin-trash-broken" />
              <p>Brisanje</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9997
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default NavigacijaAdmin;