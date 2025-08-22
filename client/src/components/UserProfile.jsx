import React, { useState, useEffect, memo } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from './apiConfig';
import LoadingShell from './LoadingShell';
import './UserProfile.css';

const UserProfile = memo(({ userId, loggedInUser, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);

  // Check if logged-in user has permission to view sensitive data
  const canViewSensitiveData = loggedInUser && (loggedInUser.isAdmin || loggedInUser.isMentor || loggedInUser.id === userId);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Try to fetch user data first
        try {
          const response = await ApiConfig.api.get(`/api/korisnik/${userId}`);
          setUserData({ ...response.data.user, type: 'student' });
        } catch (userError) {
          // If user not found, try to fetch mentor data
          try {
            const mentorResponse = await ApiConfig.api.get(`/api/mentori/${userId}`);
            setUserData({ ...mentorResponse.data, type: 'mentor' });
          } catch (mentorError) {
            throw new Error('User not found');
          }
        }

        // Fetch profile picture
        try {
          const pictureResponse = await ApiConfig.cachedApi.get(`/api/profile-picture/${userId}`, { headers: { 'Cache-Control': 'no-cache' } });
          if (pictureResponse?.success && pictureResponse?.profilePicture) {
            setProfilePicture(pictureResponse.profilePicture);
          }
        } catch (pictureError) {
          console.error('Error fetching profile picture:', pictureError);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Greška pri dohvaćanju podataka o korisniku');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  if (loading) return (
  <div className="popup">
    <LoadingShell />
  </div>

  );
  if (error) return (<div className="error-message">{error}</div>);
  if (!userData) return null;

  return (
    <div className="popup">
      <div className="karticaZadatka">
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-picture-container">
              {profilePicture ? (
                <img 
                  src={`data:${profilePicture.contentType};base64,${profilePicture.data}`}
                  alt="Profile"
                  className="profile-picture"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  <Icon icon="solar:user-broken" />
                </div>
              )}
            </div>
            <h2>{userData.ime} {userData.prezime}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <Icon icon="solar:close-circle-broken" />
          </button>
        </div>

        {/* Only show napomene if user has permission */}
        {canViewSensitiveData && userData.napomene && Array.isArray(userData.napomene) && userData.napomene.length > 0 && (
          <div className="profile-content">
            <div className="profile-section">
              <h3>Napomene</h3>
              <p>{Array.isArray(userData.napomene) ? userData.napomene.join('\n') : userData.napomene}</p>
            </div>
          </div>  
        )}

        <div className="profile-content">
          <div className="profile-section">
            <h3>Osnovne informacije</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Tip korisnika</label>
                <span>{userData.type === 'mentor' ? 'Mentor' : 'Student'}</span>
              </div>
              <div className="info-item">
                <label>Email</label>
                <span>{userData.email}</span>
              </div>
              {userData.type === 'student' && (
                <>
                  {canViewSensitiveData && (
                    <div className="info-item">
                      <label>Datum rođenja</label>
                      <span>
                        {userData.datumRodjenja ? 
                          new Date(userData.datumRodjenja).toLocaleDateString('hr-HR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          }) 
                          : 'Nije uneseno'}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <label>Škola</label>
                    <span>{userData.school.name || 'Nije uneseno'}</span>
                  </div>
                  <div className="info-item">
                    <label>Program</label>
                    <span>{userData.programs?.map(program => program.naziv).join(', ') || 'Nije uneseno'}</span>
                  </div>
                </>
              )}
              {userData.type === 'mentor' && (
                <>
                  <div className="info-item">
                    <label>Predmet</label>
                    <span>{userData.predmet || 'Nije uneseno'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Only show contact information if user has permission */}
          {canViewSensitiveData && userData.type === 'student' && (
            <div className="profile-section">
              <h3>Kontakt informacije</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Telefon</label>
                  <span>{userData.brojMobitela || 'Nije uneseno'}</span>
                </div>
                <div className="info-item">
                  <label>Adresa</label>
                  <span>
                    {userData.adresa ? 
                      typeof userData.adresa === 'object' ? 
                        `${userData.adresa.ulica} ${userData.adresa.kucniBroj}, ${userData.adresa.mjesto}` 
                        : userData.adresa 
                      : 'Nije uneseno'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Grad</label>
                  <span>{typeof userData.grad === 'object' ? userData.grad.mjesto : (userData.grad || 'Nije uneseno')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Only show parent information if user has permission AND there's actual data */}
          {canViewSensitiveData && userData.type === 'student' && (
            <>
              {userData.roditelj1 && userData.roditelj1.ime && userData.roditelj1.prezime && (
                <div className="profile-section">
                  <h3>Informacije o roditelju/skrbniku</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Ime i prezime</label>
                      <span>{`${userData.roditelj1.ime} ${userData.roditelj1.prezime}`}</span>
                    </div>
                    {userData.roditelj1.brojMobitela && (
                      <div className="info-item">
                        <label>Telefon</label>
                        <span>{userData.roditelj1.brojMobitela}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {userData.roditelj2 && userData.roditelj2.ime && userData.roditelj2.prezime && (
                <div className="profile-section">
                  <h3>Informacije o roditelju/skrbniku</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Ime i prezime</label>
                      <span>{`${userData.roditelj2.ime} ${userData.roditelj2.prezime}`}</span>
                    </div>
                    {userData.roditelj2.brojMobitela && (
                      <div className="info-item">
                        <label>Telefon</label>
                        <span>{userData.roditelj2.brojMobitela}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default UserProfile; 