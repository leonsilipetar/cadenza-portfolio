import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';
import DodajMentora from './DodajMentora';
import MentorDetalji from './MentoriDetalji';
import ApiConfig from '../../components/apiConfig';
import LoadingShell from '../../components/LoadingShell';
import { showNotification } from '../../components/Notifikacija.jsx';

const Mentori = () => {
  const [odabranoDodajKorisnika, setOdabranoDodajKOrisnika] = useState(false);
  const [korisnikDetaljiOtvoreno, setKorisnikDetaljiOtvoreno] = useState(null);
  const [korisnici, setKorisnici] = useState([]);
  const [user, setUser] = useState();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const otvoreno = 'mentori';
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKorisnici, setFilteredKorisnici] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSecretLink, setShowSecretLink] = useState(false);
  const [secretLinkCopied, setSecretLinkCopied] = useState(false);

  const sendRequestUsers = useCallback(async (retryCount = 0) => {
    try {
      console.log('Fetching mentors...');
      const profileRes = await ApiConfig.api.get('/api/profil');
      const schoolId = profileRes.data.user.schoolId;
      
      const res = await ApiConfig.api.get(`/api/mentori?schoolId=${schoolId}`);
      console.log('Mentors response:', res.data);
      return res.data;
    } catch (err) {
      console.error('Error fetching mentors:', err);
      if (err.message === 'canceled' && retryCount < 3) {
        console.log(`Retrying mentor fetch... (${retryCount + 1})`);
        return sendRequestUsers(retryCount + 1);
      }
      showNotification({
        type: 'error',
        message: 'Greška pri dohvaćanju mentora: ' + (err.response?.data?.error || err.message)
      });
      return null;
    }
  }, []);

  const handleDodajKorisnika = () => {
    console.log('Adding user logic here');
  };

  const handleCancelDodajKorisnika = () => {
    setOdabranoDodajKOrisnika(false);
  };

  const handleMoreDetails = (mentorId) => {
    setKorisnikDetaljiOtvoreno(mentorId);
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

      const response = await ApiConfig.api.post('/api/mentors/bulk-upload', formData, {
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
      let message = `Dodano ${successCount} mentora uspješno.`;
      if (errorCount > 0) {
        message += ` ${errorCount} mentora ima greške.`;
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
      await sendRequestUsers(); // Refresh the list
    } catch (error) {
      console.error('Error uploading mentors:', error);
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Greška pri učitavanju mentora'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProgressMessage('');
    }
  };

  const handleCopySecretLink = () => {
    const secretLink = `${window.location.origin}/signup/f8h3k2j9d5m7n1p4q6r8s0t2u4v6w8x0`;
    navigator.clipboard.writeText(secretLink).then(() => {
      setSecretLinkCopied(true);
             showNotification('success', 'Link za registraciju kopiran u međuspremnik!');
      setTimeout(() => setSecretLinkCopied(false), 3000);
    }).catch(() => {
             showNotification('error', 'Greška pri kopiranju linka');
    });
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const usersData = await sendRequestUsers();

        if (!mounted) return;

        if (!usersData) {
          throw new Error('Failed to fetch required data');
        }

        setKorisnici(usersData);
        setFilteredKorisnici(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (mounted) {
          showNotification({
            type: 'error',
            message: 'Greška pri dohvaćanju podataka: ' + error.message
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [sendRequestUsers]);

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
      
      return fullName.includes(term) || 
             username.includes(term) || 
             email.includes(term) ||
             oib.includes(term);
    });
    
    setFilteredKorisnici(filtered);
  };

  const exportMentorsCSV = () => {
    try {
      const decimalSeparatorIsComma = Intl.NumberFormat().format(1.1).includes(',');
      const delimiter = decimalSeparatorIsComma ? ';' : ',';
      const headers = [
        'Korisničko ime',
        'Email',
        'Administrator',
        'OIB',
        'Ulica',
        'Broj',
        'Mjesto'
      ];

      const rows = (filteredKorisnici || []).map((u) => [
        u.korisnickoIme || '',
        u.email || '',
        u.isAdmin ? 'Da' : 'Ne',
        u.oib || '',
        u.adresa?.ulica || '',
        u.adresa?.kucniBroj || '',
        u.adresa?.mjesto || ''
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
      link.setAttribute('download', `mentori_${new Date().toISOString().slice(0, 10)}.csv`);
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
        <MentorDetalji
          korisnikId={korisnikDetaljiOtvoreno}
          onCancel={() => setKorisnikDetaljiOtvoreno(false)}
        />
      )}
      {odabranoDodajKorisnika && (
        <DodajMentora
          onDodajKorisnika={handleDodajKorisnika}
          onCancel={handleCancelDodajKorisnika}
        />
      )}
      <div className="main">
        {isLoading ? (
          <LoadingShell />
        ) : (
          <>
            <div className="sbtwn">
              <div style={{
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center'
              }}>
    
                <button
                  className="gumb action-btn abEdit"
                  onClick={() => setOdabranoDodajKOrisnika(true)}
                >
                  <Icon icon="solar:user-plus-broken" fontSize="large" /> Dodaj mentora
                </button>
                <button
                  className="gumb action-btn spremiBtn"
                  onClick={() => setShowBulkUpload(true)}
                >
                  <Icon icon="solar:upload-broken" /> Učitaj iz XLSX
                </button>
                <button
                  className="gumb action-btn abExpand"
                  onClick={() => setShowSecretLink(!showSecretLink)}
                  style={{ 
                    backgroundColor: showSecretLink ? 'rgb(var(--isticanje))' : '',
                    color: showSecretLink ? 'white' : ''
                  }}
                >
                  <Icon icon="solar:link-broken" /> Link za registraciju
                </button>
                <button
                  className="gumb action-btn abExpand"
                  onClick={exportMentorsCSV}
                >
                  <Icon icon="solar:download-broken" /> Izvezi CSV
                </button>
              </div>
            </div>

            {showSecretLink && (
              <div className="div-row" style={{
                background: 'var(--iznad)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgb(var(--isticanje))',
                marginBottom: '1rem'
              }}>
                                 <div style={{ marginBottom: '0.5rem' }}>
                   <span style={{ color: 'rgb(var(--isticanje))', fontWeight: 'bold' }}>
                     Link za registraciju mentora:
                   </span>
                 </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--pozadina)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all'
                }}>
                  <span style={{ flex: 1 }}>
                    {window.location.origin}/signup/f8h3k2j9d5m7n1p4q6r8s0t2u4v6w8x0
                  </span>
                  <button
                    className="gumb action-btn spremiBtn"
                    onClick={handleCopySecretLink}
                    style={{ minWidth: 'auto', padding: '0.3rem 0.6rem' }}
                  >
                    <Icon icon={secretLinkCopied ? "solar:check-circle-broken" : "solar:copy-broken"} />
                    {secretLinkCopied ? 'Kopirano!' : 'Kopiraj'}
                  </button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgb(var(--isticanje))', marginTop: '0.5rem' }}>
                  Podijelite ovaj link s mentorima koji se žele registrirati. Link koristi istu funkcionalnost kao "Dodaj mentora".
                </div>
              </div>
            )}

            <div className="div-row">
            <span style={{color: 'rgb(var(--isticanje))'}}>Ukupno mentora: {korisnici?.length || 0}</span>
              <div className="p">
              Dodavanjem korisnika se na njihovu e-mail adresu (pohranjenu u polje za e-mail) šalju njihovi podaci za prijavu: email i lozinka.
            </div>
            </div>
            

            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Korisničko ime</div>
                <div className="th">email</div>
                <div className="th mobile-none">Administrator</div>
                <div className="th mobile-none">oib</div>
                <div className="filter">
                  <input
                    type="text"
                    className="input-login-signup"
                    placeholder="Pretraži mentore..."
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
                    <div className="th mobile-none">{korisnik.isAdmin ? "Da" : "Ne"}</div>
                    <div className="th mobile-none">{korisnik.oib}</div>
                    <div className="th">
                      <div
                        className={`action-btn btn abExpand ${isHovered ? 'hovered' : ''}`}
                        onClick={() => handleMoreDetails(korisnik.id)}
                        data-text="više"
                      >
                        <Icon icon="solar:round-double-alt-arrow-down-broken" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="karticaZadatka">
                  <p>{searchTerm ? 'Nema rezultata za pretragu!' : 'Nema mentora u bazi!'}</p>
                </div>
              )}
            </div>

            {/* Bulk Upload Modal */}
            {showBulkUpload && (
              <div className="popup">
                <div className="div div-clmn">
                  <h3>Učitavanje mentora iz XLSX datoteke</h3>
                  <p>Odaberite XLSX datoteku s popisom mentora.</p>
                  <div className="p">
                    <h4>Format datoteke:</h4>
                    <ul>
                      <li><strong>Prvi stupac: Ime (obavezno)</strong></li>
                      <li><strong>Drugi stupac: Prezime (obavezno)</strong></li>
                      <li><strong>Treći stupac: Email (obavezno)</strong></li>
                      <li><strong>Četvrti stupac: OIB (obavezno - 11 znamenki)</strong></li>
                      <li>Peti stupac: Ulica (opcionalno)</li>
                      <li>Šesti stupac: Kućni broj (opcionalno)</li>
                      <li>Sedmi stupac: Mjesto (opcionalno)</li>
                    </ul>

                    <div className="tablica">
                      <div className="tr naziv">
                        <div className="th"><strong>Ime*</strong></div>
                        <div className="th"><strong>Prezime*</strong></div>
                        <div className="th"><strong>Email*</strong></div>
                        <div className="th"><strong>OIB*</strong></div>
                        <div className="th">Ulica</div>
                        <div className="th">Broj</div>
                        <div className="th">Mjesto</div>
                      </div>
                      <div className="tr redak">
                        <div className="th">Marko</div>
                        <div className="th">Marić</div>
                        <div className="th">marko.maric@email.com</div>
                        <div className="th">12345678901</div>
                        <div className="th">Zagrebačka</div>
                        <div className="th">1</div>
                        <div className="th">Zagreb</div>
                      </div>
                      <div className="tr redak">
                        <div className="th">Petra</div>
                        <div className="th">Perić</div>
                        <div className="th">petra.peric@email.com</div>
                        <div className="th">98765432109</div>
                        <div className="th"></div>
                        <div className="th"></div>
                        <div className="th"></div>
                      </div>
                    </div>

                    <p className="note" style={{ color: 'rgb(var(--isticanje))' }}>
                      <strong>Napomena:</strong> Polja označena zvjezdicom (*) su obavezna i moraju biti popunjena za svakog mentora.
                      Polja za adresu su opcionalna i mogu ostati prazna.
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
                      id="mentors-file-input"
                      disabled={isUploading}
                    />
                    <label htmlFor="mentors-file-input" className={`action-btn spremiBtn ${isUploading ? 'disabled' : ''}`}>
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
                          {isUploading ? 'Učitavanje...' : 'Učitaj mentore'}
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
    </>
  );
};

export default Mentori;
