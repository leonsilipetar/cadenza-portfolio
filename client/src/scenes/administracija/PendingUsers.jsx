import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin';
import ApiConfig from '../../components/apiConfig';
import LoadingShell from '../../components/LoadingShell';
import Notifikacija from '../../components/Notifikacija';

const PendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const otvoreno = 'pending-users';

  const fetchPendingUsers = async () => {
    try {
      const response = await ApiConfig.api.get('/api/admin/pending-users');
      console.log('Pending users response:', response);
      
      // Ensure we're working with an array
      const users = Array.isArray(response.data) ? response.data : 
                   response.data?.pendingUsers ? response.data.pendingUsers : [];
      
      console.log('Processed users array:', users);
      setPendingUsers(users);
      setError(null);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri dohvaćanju zahtjeva za registraciju.'
      });
      setPendingUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    try {
      const userToApprove = pendingUsers.find(user => user.id === userId);
      if (!userToApprove) {
        throw new Error('User not found');
      }

      // First create the user using the signup endpoint
      const signupData = {
        ...userToApprove,
        status: undefined,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };

      try {
        await ApiConfig.api.post('/api/signup', signupData);
      } catch (err) {
        // Check for duplicate email error
        if (err.response?.data?.error === 'Validation error' || 
            err.response?.data?.message?.toLowerCase().includes('email')) {
          setNotification({
            type: 'error',
            message: 'Korisnik s ovom email adresom već postoji (moguće da je obrisan). Molimo kontaktirajte administratora.'
          });
          return;
        }
        throw err; // Re-throw other errors
      }

      // If signup successful, update the pending user status
      await ApiConfig.api.post(`/api/admin/pending-users/${userId}/decline`);

      setNotification({
        type: 'success',
        message: 'Zahtjev za registraciju je odobren.'
      });
      
      fetchPendingUsers(); // Refresh the list
    } catch (err) {
      console.error('Error approving user:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Greška pri odobravanju zahtjeva.'
      });
    }
  };

  const handleDecline = async (userId) => {
    try {
      await ApiConfig.api.post(`/api/admin/pending-users/${userId}/decline`);
      setNotification({
        type: 'success',
        message: 'Zahtjev za registraciju je odbijen.'
      });
      fetchPendingUsers(); // Refresh the list
    } catch (err) {
      console.error('Error declining user:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri odbijanju zahtjeva.'
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) {
      setNotification({
        type: 'error',
        message: 'Molimo odaberite korisnike za odobravanje.'
      });
      return;
    }

    setBulkLoading(true);
    const selectedUserIds = Array.from(selectedUsers);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      for (const userId of selectedUserIds) {
        try {
          const userToApprove = pendingUsers.find(user => user.id === userId);
          if (!userToApprove) continue;

          const signupData = {
            ...userToApprove,
            status: undefined,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined
          };

          // Create user
          await ApiConfig.api.post('/api/signup', signupData);
          
          // Decline pending request
          await ApiConfig.api.post(`/api/admin/pending-users/${userId}/decline`);
          
          successCount++;
        } catch (err) {
          errorCount++;
          const user = pendingUsers.find(u => u.id === userId);
          const errorMsg = err.response?.data?.message || 'Nepoznata greška';
          errors.push(`${user?.ime} ${user?.prezime}: ${errorMsg}`);
        }
      }

      // Show results
      if (successCount > 0) {
        setNotification({
          type: 'success',
          message: `Uspješno odobreno ${successCount} korisnika${successCount > 1 ? 'a' : ''}.`
        });
      }
      
      if (errorCount > 0) {
        setNotification({
          type: 'error',
          message: `Greška pri odobravanju ${errorCount} korisnika${errorCount > 1 ? 'a' : ''}. ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`
        });
      }

      // Clear selection and refresh
      setSelectedUsers(new Set());
      fetchPendingUsers();
    } catch (err) {
      console.error('Error in bulk approve:', err);
      setNotification({
        type: 'error',
        message: 'Greška pri masovnom odobravanju korisnika.'
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === pendingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pendingUsers.map(user => user.id)));
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <NavigacijaAdmin otvoreno={otvoreno} />
      <NavTopAdministracija naslov={'Administracija - Zahtjevi za registraciju'} />
      <div className="main">
        {loading ? (
          <LoadingShell />
        ) : (
          <>
            <div className="div-row">
              <span style={{color: 'rgb(var(--isticanje))'}}>
                Ukupno zahtjeva: {pendingUsers.length}
              </span>
              <div className="p">
                Ovdje možete pregledati i upravljati zahtjevima za registraciju novih korisnika.
                Zahtjevi stariji od 14 dana se automatski brišu.
              </div>
            </div>

            {/* Bulk Actions */}
            {pendingUsers.length > 0 && (
              <div className="bulk-actions" style={{
                background: 'var(--iznad-nav)',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.5rem', 
                  flexWrap: 'wrap',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === pendingUsers.length}
                        onChange={handleSelectAll}
                        style={{ 
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px'
                        }}
                      />
                      <span style={{ 
                        fontWeight: '500',
                        color: 'var(--tekst)'
                      }}>
                        Odaberi sve ({selectedUsers.size}/{pendingUsers.length})
                      </span>
                    </label>
                    
                    {selectedUsers.size > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(var(--isticanje), 0.1)',
                        borderRadius: '20px',
                        border: '1px solid rgba(var(--isticanje), 0.2)'
                      }}>
                        <Icon icon="solar:check-circle-broken" style={{ color: 'rgb(var(--isticanje))' }} />
                        <span style={{ 
                          color: 'rgb(var(--isticanje))',
                          fontWeight: '500',
                          fontSize: '0.9rem'
                        }}>
                          {selectedUsers.size} korisnik{selectedUsers.size > 1 ? 'a' : ''} odabran{selectedUsers.size > 1 ? 'o' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {selectedUsers.size > 0 && (
                    <button
                      className="action-btn spremiBtn"
                      onClick={handleBulkApprove}
                      disabled={bulkLoading}
                      style={{ 
                        minWidth: '180px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {bulkLoading ? (
                        <>
                          <div className="loading-spinner" style={{
                            width: '18px',
                            height: '18px',
                            border: '2px solid transparent',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          Odobravanje...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:check-circle-broken" />
                          Odobri odabrane
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="tablica">
              <div className="tr naziv">
                <div className="th" style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === pendingUsers.length && pendingUsers.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div className="th">Ime i prezime</div>
                <div className="th">Email</div>
                <div className="th">OIB</div>
                <div className="th">Program</div>
                <div className="th">Datum zahtjeva</div>
                <div className="th">Akcije</div>
              </div>

              {pendingUsers.length > 0 ? (
                pendingUsers.map((user) => (
                  <div key={user.id} className="tr redak">
                    <div className="th" style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="th">{`${user.ime} ${user.prezime}`}</div>
                    <div className="th">{user.email}</div>
                    <div className="th">{user.oib}</div>
                    <div className="th">{user.program?.naziv || 'N/A'}</div>
                    <div className="th">{formatDate(user.createdAt)}</div>
                    <div className="th">
                      <div className="action-buttons">
                        <button
                          className="action-btn abExpand"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Icon icon="solar:eye-broken" />
                          Detalji
                        </button>
                        <button
                          className="action-btn spremiBtn"
                          onClick={() => handleApprove(user.id)}
                        >
                          <Icon icon="solar:check-circle-broken" />
                          Odobri
                        </button>
                        <button
                          className="action-btn zatvoriBtn"
                          onClick={() => handleDecline(user.id)}
                        >
                          <Icon icon="solar:close-circle-broken" />
                          Odbij
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="karticaZadatka">
                  <p>Nema zahtjeva za registraciju.</p>
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="popup">
                <div className="div">
                  <h3>Detalji zahtjeva</h3>
                  <div className="tablica">
                    <div className="tr naziv">
                      <div className="th">Polje</div>
                      <div className="th">Vrijednost</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">Ime i prezime</div>
                      <div className="th">{`${selectedUser.ime} ${selectedUser.prezime}`}</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">Email</div>
                      <div className="th">{selectedUser.email}</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">OIB</div>
                      <div className="th">{selectedUser.oib}</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">Datum rođenja</div>
                      <div className="th">{formatDate(selectedUser.datumRodjenja)}</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">Adresa</div>
                      <div className="th">
                        {selectedUser.adresa.ulica} {selectedUser.adresa.kucniBroj}, {selectedUser.adresa.mjesto}
                      </div>
                    </div>
                    {selectedUser.maloljetniClan && (
                      <>
                        <div className="tr redak">
                          <div className="th">Roditelj 1</div>
                          <div className="th">
                            {`${selectedUser.roditelj1.ime} ${selectedUser.roditelj1.prezime}`}
                            <br />
                            {`Tel: ${selectedUser.roditelj1.brojMobitela}`}
                          </div>
                        </div>
                        {selectedUser.roditelj2?.ime && (
                          <div className="tr redak">
                            <div className="th">Roditelj 2</div>
                            <div className="th">
                              {`${selectedUser.roditelj2.ime} ${selectedUser.roditelj2.prezime}`}
                              <br />
                              {`Tel: ${selectedUser.roditelj2.brojMobitela}`}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="tr redak">
                      <div className="th">Program</div>
                      <div className="th">{selectedUser.program?.naziv || 'N/A'}</div>
                    </div>
                    <div className="tr redak">
                      <div className="th">Pohađa teoriju</div>
                      <div className="th">{selectedUser.pohadjaTeoriju ? 'Da' : 'Ne'}</div>
                    </div>
                    {selectedUser.napomene && (
                      <div className="tr redak">
                        <div className="th">Napomene</div>
                        <div className="th">{selectedUser.napomene}</div>
                      </div>
                    )}
                  </div>
                  <div className="div-radio">
                    <button
                      className="gumb action-btn zatvoriBtn"
                      onClick={() => setSelectedUser(null)}
                    >
                      <Icon icon="solar:close-circle-broken" /> Zatvori
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {notification && (
        <Notifikacija
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default PendingUsers; 