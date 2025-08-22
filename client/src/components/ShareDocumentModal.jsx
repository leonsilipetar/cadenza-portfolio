import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from './apiConfig';

const ShareDocumentModal = ({ document, onShare, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      const response = await ApiConfig.api.get('/api/search/users', {
        params: { query: searchTerm }
      });
      setUsers(response.data.results || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onShare({
      userIds: selectedUsers.map(u => u.id)
    });
  };

  return (
    <div className="popup">
      <div className="div">
        <h3>Dijeli dokument</h3>
        <form onSubmit={handleSubmit}>
          {/* User Search */}
          <div className="div">
            <label>Dodaj korisnike:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pretraži korisnike..."
              className="input-login-signup"
            />
          </div>

          {/* Search Results */}
          {searchTerm.length >= 2 && (
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Rezultati pretrage</div>
                <div className="th"></div>
              </div>
              {users.length > 0 ? (
                users
                  .filter(user => !selectedUsers.some(su => su.id === user.id))
                  .map(user => (
                    <div key={user.id} className="tr redak">
                      <div className="th">{user.ime} {user.prezime}</div>
                      <div className="th">
                        <button
                          type="button"
                          className="action-btn abEdit"
                          onClick={() => toggleUserSelection(user)}
                        >
                          Dodaj
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="tr redak">
                  <div className="th" colSpan="2">
                    Nema rezultata
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Users */}
          <div className="tablica">
            <div className="tr naziv">
              <div className="th">Odabrani korisnici</div>
              <div className="th"></div>
            </div>
            {selectedUsers.length > 0 ? (
              selectedUsers.map(user => (
                <div key={user.id} className="tr redak">
                  <div className="th">{user.ime} {user.prezime}</div>
                  <div className="th">
                    <button
                      type="button"
                      className="action-btn abDelete"
                      onClick={() => toggleUserSelection(user)}
                    >
                      <Icon icon="solar:trash-bin-trash-broken" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="tr redak">
                <div className="th" colSpan="2">
                  Nema odabranih korisnika
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="div-radio">
            <button
              type="button"
              className="action-btn zatvoriBtn"
              onClick={onCancel}
            >
              Zatvori
            </button>
            <button
              type="submit"
              className="action-btn spremiBtn"
              disabled={selectedUsers.length === 0}
            >
              <Icon icon="solar:share-broken" /> Dijeli
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareDocumentModal; 