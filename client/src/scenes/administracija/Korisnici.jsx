import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';
import DodajKorisnika from './DodajKorisnika';
import KorisnikDetalji from './KorisnikDetalji';
import ApiConfig from '../../components/apiConfig';
import LoadingShell from '../../components/LoadingShell';
import showNotification from '../../components/Notifikacija.jsx';

axios.defaults.withCredentials = true;

const Korisnici = () => {
  const [odabranoDodajKorisnika, setOdabranoDodajKOrisnika] = useState(false);
  const [korisnikDetaljiOtvoreno, setKorisnikDetaljiOtvoreno] = useState(null);
  const [notification, setNotification] = useState(null);

  const [korisnici, setKorisnici] = useState([]);
  const [user, setUser] = useState();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const otvoreno = 'korisnici';
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKorisnici, setFilteredKorisnici] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [usersWithoutMentors, setUsersWithoutMentors] = useState([]);

  const sendRequestUsers = async () => {
    try {
      // First get the admin's profile to get their schoolId
      const profileRes = await ApiConfig.api.get('/api/profil');
      const schoolId = profileRes.data.user.schoolId;

      // Then fetch users filtered by school
      const res = await ApiConfig.api.get(`/api/korisnici?schoolId=${schoolId}`);
      return res.data;
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  };

  const sendRequest = async () => {
    try {
      const res = await ApiConfig.api.get('/api/profil');
      return res.data;
    } catch (err) {
      console.error(err);
      throw err; // Let the caller handle the error
    }
  };

  const handleDodajKorisnika = () => {
    // Logic for handling the addition of a new user
    // e.g., refetch the user list or perform other actions
    console.log('Adding user logic here');
  };

  const handleCancelDodajKorisnika = () => {
    setOdabranoDodajKOrisnika(false);
  };
  const getUserRoles = (user) => {
    const roles = [];

    if (user.isAdmin) {
      roles.push('administrator');
    }

    if (user.isMentor) {
      roles.push('mentor');
    }

    if (user.isStudent) {
      roles.push('student');
    }

    return roles.length > 0 ? roles.join(', ') : 'bez uloge';
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersData, userData] = await Promise.all([
          sendRequestUsers(),
          sendRequest()
        ]);
        setKorisnici(usersData);
        setFilteredKorisnici(usersData);
        setUser(userData.user);
        
        // Filter users without mentors
        const withoutMentors = usersData.filter(user => !user.mentorId || user.mentorId.length === 0);
        setUsersWithoutMentors(withoutMentors);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (!korisnici || !Array.isArray(korisnici)) {
      setFilteredKorisnici([]);
      return;
    }

    const filtered = korisnici.filter(korisnik => {
      const fullName = `${korisnik.ime || ''} ${korisnik.prezime || ''}`.toLowerCase();
      const username = (korisnik.korisnickoIme || '').toLowerCase();
      const email = (korisnik.email || '').toLowerCase();
      const oib = (korisnik.oib || '').toLowerCase();

      // Add address search
      const address = korisnik.adresa ?
        `${korisnik.adresa.ulica || ''} ${korisnik.adresa.kucniBroj || ''} ${korisnik.adresa.mjesto || ''}`.toLowerCase()
        : '';

      // Add parents search
      const parent1 = korisnik.roditelj1 ?
        `${korisnik.roditelj1.ime || ''} ${korisnik.roditelj1.prezime || ''} ${korisnik.roditelj1.brojMobitela || ''}`.toLowerCase()
        : '';
      const parent2 = korisnik.roditelj2 ?
        `${korisnik.roditelj2.ime || ''} ${korisnik.roditelj2.prezime || ''} ${korisnik.roditelj2.brojMobitela || ''}`.toLowerCase()
        : '';

      return fullName.includes(term) ||
             username.includes(term) ||
             email.includes(term) ||
             oib.includes(term) ||
             address.includes(term) ||
             parent1.includes(term) ||
             parent2.includes(term);
    });

    setFilteredKorisnici(filtered);
  };

  const handleBulkUpload = async () => {
    try {
      if (!selectedFile) {
        showNotification({
          type: 'error',
          message: 'Molimo odaberite XLSX datoteku'
        });
        return;
      }

      setIsUploading(true);
      setProgressMessage('Započinjem učitavanje...');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await ApiConfig.api.post('/api/users/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          setProgressMessage(`Učitavanje: ${percentCompleted}%`);
        }
      });

      const { successCount, errorCount, results } = response.data;

      // Format notification message
      let message = `Dodano ${successCount} učenika uspješno.`;
      if (errorCount > 0) {
        message += ` ${errorCount} učenika ima greške.`;
        const errors = results.filter(r => r.status === 'error')
          .map(r => `${r.email}: ${r.message}`)
          .join('\n');
        message += `\nGreške:\n${errors}`;
      }

      showNotification({
        type: successCount > 0 ? 'success' : 'error',
        message
      });

      // Close upload dialog and refresh data
      setShowBulkUpload(false);
      setSelectedFile(null);
      const usersData = await sendRequestUsers(); // Refresh the list
      setKorisnici(usersData);
      setFilteredKorisnici(usersData);
    } catch (error) {
      console.error('Error uploading users:', error);
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Greška pri učitavanju korisnika'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProgressMessage('');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'without-mentors') {
      setFilteredKorisnici(usersWithoutMentors);
    } else {
      setFilteredKorisnici(korisnici);
    }
    setSearchTerm('');
  };

  const exportUsersCSV = () => {
    try {
      const decimalSeparatorIsComma = Intl.NumberFormat().format(1.1).includes(',');
      const delimiter = decimalSeparatorIsComma ? ';' : ',';
      const headers = [
        'Korisničko ime',
        'Email',
        'Ulica',
        'Broj',
        'Mjesto',
        'R1 Ime',
        'R1 Prezime',
        'R1 Mobitel',
        'R2 Ime',
        'R2 Prezime',
        'R2 Mobitel',
        'OIB'
      ];

      const rows = (filteredKorisnici || []).map((u) => [
        u.korisnickoIme || '',
        u.email || '',
        u.adresa?.ulica || '',
        u.adresa?.kucniBroj || '',
        u.adresa?.mjesto || '',
        u.roditelj1?.ime || '',
        u.roditelj1?.prezime || '',
        u.roditelj1?.brojMobitela || '',
        u.roditelj2?.ime || '',
        u.roditelj2?.prezime || '',
        u.roditelj2?.brojMobitela || '',
        u.oib || ''
      ]);

      const escapeField = (val) => {
        const s = String(val ?? '');
        const escaped = s.replace(/"/g, '""');
        const needsQuotes = escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes(delimiter);
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const lines = [];
      lines.push(`sep=${delimiter}`);
      lines.push(headers.map(escapeField).join(delimiter));
      rows.forEach((row) => {
        lines.push(row.map(escapeField).join(delimiter));
      });
      const csv = lines.join('\r\n');

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `korisnici_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      showNotification({ type: 'error', message: 'Greška pri izvozu CSV datoteke' });
    }
  };

  return (
    <>
      <NavigacijaAdmin otvoreno={otvoreno} />
      <NavTopAdministracija naslov={'Administracija - Korisnici'} />
      {korisnikDetaljiOtvoreno && (
        console.log('Korisnik detalji otvoren', korisnikDetaljiOtvoreno),
        <KorisnikDetalji korisnikId={korisnikDetaljiOtvoreno} onCancel={() => setKorisnikDetaljiOtvoreno(false)} />
      )}
      {odabranoDodajKorisnika && (
        <DodajKorisnika
          onDodajKorisnika={handleDodajKorisnika}
          onCancel={handleCancelDodajKorisnika}
        />
      )}
      <div className="main">
        {isLoading ? (
          <LoadingShell />
        ) : (
          <>
            <div className="karticaZadatka">
              
              <div style={{
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                marginTop: '1rem'
              }}>
                <button
                  className="action-btn abEdit"
                  onClick={() => setOdabranoDodajKOrisnika(true)}
                >
                  <Icon icon="solar:user-plus-broken" fontSize="large" /> Dodaj učenika
                </button>
                <button
                  className="action-btn spremiBtn"
                  onClick={() => setShowBulkUpload(true)}
                >
                  <Icon icon="solar:upload-broken" /> Učitaj iz XLSX
                </button>
                <button
                  className="action-btn abExpand"
                  onClick={exportUsersCSV}
                >
                  <Icon icon="solar:download-broken" /> Izvezi CSV
                </button>
              </div>
              <div className="div-row">
                <span style={{color: 'rgb(var(--isticanje))'}}>Ukupno učenika: {korisnici?.length || 0}</span>
                <div className="p">Dodavanjem korisnika se na njihovu e-mail adresu (pohranjenu u polje za e-mail) šalju njihovi podaci za prijavu: email i lozinka.</div>
              {/*
              {user && user.schoolId === 1 &&
              (
                <>
                <div className='p acc'>Podaci učenika su ispravljeni...</div>
                <div className='p'>Potencijalne greške: </div>
                <div className='p acc'>Stanić Marina - OIB ima 10 od 11 znamenki, Volarević Leona i Vidaković Sunčica imaju isti OIB?</div>
                </>
              )}
              */}
              
              </div>
            </div>
            <div className="karticaZadatka posts">
              <div className="notification-filters">
                <button
                  className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabChange('all')}
                >
                  <Icon icon="solar:users-group-rounded-broken" />
                  Svi korisnici
                </button>
                {usersWithoutMentors.length > 0 && (
                  <button
                    className={`filter-btn ${activeTab === 'without-mentors' ? 'active' : ''}`}
                    onClick={() => handleTabChange('without-mentors')}
                  >
                    <Icon icon="solar:user-cross-broken" />
                    Bez mentora {usersWithoutMentors.length > 0 && <span className="poll-count">{usersWithoutMentors.length}</span>}
                  </button>
                )}
              </div>
            </div>
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Korisničko ime</div>
                <div className="th">email</div>
                <div className="th mobile-none">Roditelji</div>
                <div className="th mobile-none">oib</div>
                <div className="filter">
                  <input
                    type="text"
                    className="input-login-signup"
                    placeholder="Pretraži korisnike..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
              </div>
              {filteredKorisnici?.length > 0 ? (
                filteredKorisnici.map((korisnik) => (
                  <div
                    className={`tr redak ${isHovered ? 'hovered' : ''}`}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    key={korisnik.id}
                  >
                    <div className="th">{korisnik.korisnickoIme}</div>
                    <div className="th">{korisnik.email}</div>
                    <div className="th mobile-none">
                      {korisnik.roditelj1?.ime ?
                        `${korisnik.roditelj1.ime} ${korisnik.roditelj1.prezime}${korisnik.roditelj2?.ime ? ' / ' + korisnik.roditelj2.ime + ' ' + korisnik.roditelj2.prezime : ''}`
                        : 'Nije uneseno'}
                    </div>
                    <div className="th mobile-none">{korisnik.oib}</div>
                    <div className="th">
                      <div
                        className={`action-btn btn abExpand ${
                          isHovered ? 'hovered' : ''
                        }`}
                        onClick={() => setKorisnikDetaljiOtvoreno(korisnik.id)}
                        data-text="više"
                      >
                          <Icon icon="solar:round-double-alt-arrow-down-broken" />
                          detalji
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="karticaZadatka">
                  <p>{searchTerm ? 'Nema rezultata za pretragu!' : 'Nema korisnika u bazi!'}</p>
                </div>
              )}
            </div>

            {/* Bulk Upload Modal */}
            {showBulkUpload && (
              <div className="popup">
                <div className="div div-clmn">
                  <h3>Učitavanje učenika iz XLSX datoteke</h3>
                  <p>Odaberite XLSX datoteku s popisom učenika.</p>
                  <div className="p">
                    <h4>Format datoteke:</h4>
                    <div className="tablica">
                      <div className="tr naziv">
                        <div className="th"><strong>Ime*</strong></div>
                        <div className="th"><strong>Prezime*</strong></div>
                        <div className="th"><strong>Email*</strong></div>
                        <div className="th"><strong>OIB*</strong></div>
                        <div className="th">Ulica</div>
                        <div className="th">Broj</div>
                        <div className="th">Mjesto</div>
                        <div className="th">R1 Ime</div>
                        <div className="th">R1 Prezime</div>
                        <div className="th">R1 Mobitel</div>
                        <div className="th">R2 Ime</div>
                        <div className="th">R2 Prezime</div>
                        <div className="th">R2 Mobitel</div>
                      </div>
                      <div className="tr redak">
                        <div className="th">Ana</div>
                        <div className="th">Anić</div>
                        <div className="th">ana.anic@email.com</div>
                        <div className="th">12345678901</div>
                        <div className="th">Zagrebačka</div>
                        <div className="th">1</div>
                        <div className="th">Zagreb</div>
                        <div className="th">Marko</div>
                        <div className="th">Anić</div>
                        <div className="th">0981234567</div>
                        <div className="th">Petra</div>
                        <div className="th">Anić</div>
                        <div className="th">0987654321</div>
                      </div>
                      <div className="tr redak">
                        <div className="th">Ivan</div>
                        <div className="th">Ivić</div>
                        <div className="th">ivan.ivic@email.com</div>
                        <div className="th">98765432109</div>
                        <div className="th"></div>
                        <div className="th"></div>
                        <div className="th"></div>
                        <div className="th">Josip</div>
                        <div className="th">Ivić</div>
                        <div className="th">0951234567</div>
                        <div className="th"></div>
                        <div className="th"></div>
                        <div className="th"></div>
                      </div>
                    </div>

                    <p className="note" style={{ color: 'rgb(var(--isticanje))' }}>
                      <strong>Napomena:</strong> Polja označena zvjezdicom (*) su obavezna i moraju biti popunjena za svakog učenika.
                      Polja za adresu i roditelje su opcionalna i mogu ostati prazna.
                    </p>
                    <p className="note" style={{ color: 'rgb(var(--isticanje))' }}>
                      Nakdnadno uređivanje podataka je moguće!
                    </p>
                    <p className="note" style={{ color: 'rgb(var(--isticanje))' }}>
                      Potrebno je prvo kreirati mentore, zatim učenike te svakom mentoru dodijeliti programe<sup>1</sup>, učenike te postaviti admin polje.
                    </p>
                    <p className="note" style={{ fontSize: '0.7rem', padding: '1rem'}}>
                      <sup>1</sup> - učenicima je moguće dodati programe samo kada njihov mentor ima dodijeljen program.
                    </p>
                  </div>
                  <div className="file-upload-section">
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      className="file-input"
                      id="users-file-input"
                      disabled={isUploading}
                    />
                    <label htmlFor="users-file-input" className={`action-btn spremiBtn ${isUploading ? 'disabled' : ''}`}>
                      <Icon icon={isUploading ? "solar:loading-bold-duotone" : "solar:upload-broken"}
                            className={isUploading ? "spin" : ""} />
                      {isUploading ? 'Učitavanje...' : 'Odaberi XLSX datoteku'}
                    </label>
                    {selectedFile && (
                      <div className="selected-file">
                        <p>Odabrana datoteka: {selectedFile.name}</p>
                        <button
                          className="gumb action-btn spremiBtn"
                          onClick={handleBulkUpload}
                          disabled={isUploading}
                        >
                          <Icon icon="solar:upload-broken" />
                          {isUploading ? 'Učitavanje...' : 'Učitaj korisnike'}
                        </button>
                      </div>
                    )}
                  </div>
                  {uploadProgress > 0 && (
                    <div className="progress-section">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-message">{progressMessage}</p>
                    </div>
                  )}
                  <div className="div-radio">
                    <button
                      className="gumb action-btn zatvoriBtn"
                      onClick={() => {
                        if (!isUploading) {
                          setShowBulkUpload(false);
                          setSelectedFile(null);
                          setUploadProgress(0);
                          setProgressMessage('');
                        }
                      }}
                      disabled={isUploading}
                    >
                      <Icon icon="solar:close-circle-broken" /> Odustani
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {notification && (
        <div
          className={`notification ${notification.type === 'success' ? 'success' : 'error'}`}
          onClick={() => setNotification(null)}
        >
          {notification.message}
        </div>
      )}
    </>
  );
};

export default Korisnici;
