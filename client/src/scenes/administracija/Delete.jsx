import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';
import DeleteConfirmModal from './DeleteConfirmModal';
import ApiConfig from '../../components/apiConfig';
import '../../styles/Delete.css';
import Notifikacija from '../../components/Notifikacija';
import LoadingShell from '../../components/LoadingShell';

const Delete = () => {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sendRequest = async () => {
    try {
      const res = await ApiConfig.api.get('/api/user');
      return res.data.user; // Ensure we return the user object
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null; // Explicitly return null to prevent `undefined` issues
    }
  };

  useEffect(() => {
    const fetchLoggedInUser = async () => {
      const userData = await sendRequest();
      setLoggedInUser(userData);
    };
    fetchLoggedInUser();
    fetchUsers();
  }, [activeTab]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.korisnickoIme?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.ime?.toLowerCase().includes(searchLower) ||
        user.prezime?.toLowerCase().includes(searchLower) ||
        user.oib?.includes(searchTerm) ||
        `${user.ime} ${user.prezime}`.toLowerCase().includes(searchLower)
      );
    });
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // First get the admin's profile to get their schoolId
      const profileRes = await ApiConfig.api.get('/api/profil');
      const schoolId = profileRes.data.user?.schoolId;
      
      // Construct the endpoint with schoolId if available
      const endpoint = activeTab === 'students' 
        ? `/api/korisnici${schoolId ? `?schoolId=${schoolId}` : ''}`
        : `/api/mentori${schoolId ? `?schoolId=${schoolId}` : ''}`;
      
      const response = await ApiConfig.api.get(endpoint);

      // Filter users based on their role
      let filteredData = [];
      if (activeTab === 'students') {
        filteredData = Array.isArray(response.data) ?
          response.data.filter(user => user.isStudent) : [];
      } else {
        filteredData = Array.isArray(response.data) ?
          response.data.filter(user => user.isMentor) : [];
      }
      
      setUsers(filteredData);
      setFilteredUsers(filteredData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri dohvaćanju korisnika'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (confirmedOib) => {
    if (!selectedUser || confirmedOib !== selectedUser.oib) {
      setNotification({
        type: 'error',
        message: 'Netočan OIB. Brisanje nije uspjelo.'
      });
      return;
    }

    try {
      await ApiConfig.api.delete(`/api/delete-user/${selectedUser.id}`, {
        data: { userType: activeTab === 'students' ? 'student' : 'mentor' }
      });

      setNotification({
        type: 'success',
        message: 'Korisnik uspješno obrisan'
      });
      setShowDeleteModal(false);
      setSelectedUser(null);
      setSearchTerm(''); // Clear search when user is deleted
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setNotification({
        type: 'error',
        message: 'Greška pri brisanju korisnika'
      });
    }
  };

  return (
    <>
      <NavigacijaAdmin otvoreno="delete" />
      <NavTopAdministracija naslov="Administracija - Brisanje korisnika" />

      <div className="main">
        <div className="delete-tabs">
          <button
            className={`tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Učenici
          </button>
          <button
            className={`tab ${activeTab === 'mentors' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentors')}
          >
            Mentori
          </button>
        </div>

        <div className="delete-search">
          <div className="search-wrapper">
            <Icon icon="solar:magnifer-broken" className="search-icon" />
            <input
              type="text"
              placeholder={`Pretraži ${activeTab === 'students' ? 'učenike' : 'mentore'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search"
                title="Obriši pretragu"
              >
                <Icon icon="solar:close-circle-broken" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="search-results-count">
              Pronađeno: {filteredUsers.length} korisnika
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingShell />
        ) : (
          <div className="tablica">
            <div className="tr naziv">
              <div className="th">Ime i prezime</div>
              <div className="th">Korisničko ime</div>
              <div className="th">Email</div>
              <div className="th">OIB</div>
              <div className="th">Akcije</div>
            </div>

            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div className="tr redak" key={user.id}>
                  <div className="th">
                    <span className="user-name">
                      {user.ime && user.prezime ? `${user.ime} ${user.prezime}` : 'N/A'}
                    </span>
                  </div>
                  <div className="th">
                    <span className="username">{user.korisnickoIme || 'N/A'}</span>
                  </div>
                  <div className="th">
                    <span className="email">{user.email || 'N/A'}</span>
                  </div>
                  <div className="th">
                    <span className="oib">{user.oib || 'N/A'}</span>
                  </div>
                  <div className="th">
                    {loggedInUser && loggedInUser.id !== user.id ? (
                      <button
                        className="action-btn abDelete"
                        onClick={() => handleDeleteClick(user)}
                        title={`Obriši ${user.ime} ${user.prezime}`}
                      >
                        <Icon icon="solar:trash-bin-trash-broken" />
                        Obriši
                      </button>
                    ) : (
                      <span className="current-user-label">Trenutni korisnik</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                {searchTerm ? 
                  `Nema korisnika koji odgovaraju pretrazi "${searchTerm}"` : 
                  `Nema pronađenih ${activeTab === 'students' ? 'učenika' : 'mentora'}`
                }
              </div>
            )}
          </div>
        )}

        {notification && (
          <Notifikacija
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          user={selectedUser}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
};

export default Delete;