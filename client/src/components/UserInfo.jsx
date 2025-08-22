import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from './apiConfig';
import "../styles/Profile.css";
import { showNotification } from './Notifikacija';

const UserInfoComponent = ({ user, schoolName, mentorName }) => {
  const [formattedDate, setFormattedDate] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [showProfilePicturePopup, setShowProfilePicturePopup] = useState(false);

  useEffect(() => {
    if (user && user.datumRodjenja) {
      const date = new Date(user.datumRodjenja);
      const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}.`;
      setFormattedDate(formattedDate);
    }
  }, [user]);

  // Fetch profile picture when component mounts or user changes
  useEffect(() => {
    if (user && user.id) {
      fetchProfilePicture();
    }
  }, [user?.id]);

  // Fetch profile picture
  const fetchProfilePicture = async () => {
    try {
      const response = await ApiConfig.cachedApi.get(`/api/profile-picture/${user.id}`);
      if (response?.success && response?.profilePicture) {
        setProfilePicture(response.profilePicture);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      setProfilePicture(null);
    }
  };

  // Format programs into a comma-separated string of program names
  const programsList = user.programs && user.programs.length > 0
    ? user.programs.map(program => program.naziv).join(', ')
    : 'Nije dodijeljeno';

  // Profile Picture Popup Component
  const ProfilePicturePopup = ({ fetchProfilePicture }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      setError(null); // Clear any previous errors

      if (!file) return;

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError('Slika je prevelika. Maksimalna veličina je 5MB.');
        event.target.value = null; // Reset the input
        return;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Nepodržani format slike. Dozvoljeni formati su: JPEG, PNG i GIF.');
        event.target.value = null; // Reset the input
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    };

    const handleProfilePictureUpload = async () => {
      try {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('profilePicture', selectedFile);

        await ApiConfig.api.post('/api/profile-picture/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Invalidate the cache and refetch the profile picture
        await ApiConfig.invalidateCache();
        await fetchProfilePicture();
        setShowProfilePicturePopup(false);
        showNotification('success', 'Profilna slika je uspješno postavljena');
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        showNotification('error', 'Greška pri postavljanju profilne slike');
      }
    };

    const handleDelete = async () => {
      try {
        const response = await ApiConfig.api.delete('/api/profile-picture');
        if (response.data.success) {
          setProfilePicture(null);
          setShowProfilePicturePopup(false);
        }
      } catch (error) {
        console.error('Error deleting profile picture:', error);
      }
    };

    return (
      <div className="popup-overlay">
        <div className="div-popup">
          <div className="popup-header">
            <h3>Profilna slika</h3>
            <button className="close-btn" onClick={() => setShowProfilePicturePopup(false)}>
              <Icon icon="solar:close-circle-broken" />
            </button>
          </div>
          <div className="popup-content">
            <div className="profile-picture-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              ) : profilePicture ? (
                <img 
                  src={`data:${profilePicture.contentType};base64,${profilePicture.data}`}
                  alt="Current profile"
                  className="preview-image"
                />
              ) : (
                <div className="no-image">
                  <Icon icon="solar:user-broken" />
                </div>
              )}
            </div>
            <div className="upload-controls div-clmn">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="profile-picture-input"
              />
              <label htmlFor="profile-picture-input" className="gumb-novo action-btn spremiBtn">
                <Icon icon="solar:gallery-add-broken" />
                Odaberi sliku
              </label>
              {selectedFile && (
                <button className="gumb-novo action-btn spremiBtn" onClick={handleProfilePictureUpload}>
                  <Icon icon="solar:upload-broken" />
                  Spremi
                </button>
              )}
              {profilePicture && (
                <button className="gumb-novo abDelete action-btn " onClick={handleDelete}>
                  <Icon icon="solar:trash-bin-trash-broken" />
                  Obriši
                </button>
              )}
              {error && (
                <div className="error-message">
                  <Icon icon="solar:danger-triangle-broken" />
                  {error}
                </div>
              )}
              <div className="upload-info">
                <p>Dozvoljeni formati: JPEG, PNG, GIF</p>
                <p>Maksimalna veličina: 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="user-info-header">
        <div className="profile-picture-section">
          <div className="profile-picture-container" onClick={() => setShowProfilePicturePopup(true)}>
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
            <div className="profile-picture-overlay">
              <Icon icon="solar:camera-broken" />
            </div>
          </div>
          <div className="user-info-name">
            <h2>{user.ime} {user.prezime}</h2>
            <p className="username">{user.korisnickoIme}</p>
            <p >{user.email}</p>
          </div>
        </div>
      </div>

        
        <div className="field">
          <p className="field-name">Programi </p>
          <p className="field-data">{programsList}</p>
        </div>
        <div className="field">
          <p className="field-name">Škola </p>
          <p className="field-data">{user.school ? user.school.name : schoolName || 'Nije dodijeljeno'}</p>
        </div>
        {user.isStudent && (
          <div className="field">
            <p className="field-name">Mentor </p>
            <p className="field-data">
              {user.mentors ? user.mentors.map(mentor => mentor.ime + ' ' + mentor.prezime).join(', ') : 'Nije dodijeljen mentor'}
            </p>
          </div>
        )}
        <div className="field">
          <p className="field-name">Uloga </p>
          <p className="field-data">{getUserRoles(user)}</p>
        </div>
        <div className="field">
          <p className="field-name">OIB </p>
          <p className="field-data">{user.oib}</p>
        </div>
        <div className="field">
          <p className="field-name">Broj mobitela </p>
          <p className="field-data">{user.brojMobitela}</p>
        </div>
        <div className="field">
          <p className="field-name">Datum rođenja </p>
          <p className="field-data">{formattedDate}</p>
        </div>
        <div className="field">
          <p className="field-name">Adresa </p>
          <p className="field-data">
            {user?.adresa?.ulica}, {user?.adresa?.kucniBroj}, {user?.adresa?.mjesto}
          </p>
        </div>
        <div className="field">
          <p className="field-name">Pohađa teoriju </p>
          <p className="field-data">{user.pohadjaTeoriju ? 'Da' : 'Ne'}</p>
        </div>
        <div className="field">
          <p className="field-name">Napomene </p>
          <p className="field-data">{user.napomene}</p>
        </div>
        {user.maloljetniClan && (
          <>
            <div className="field">
              <p className="field-name">Roditelj 1 </p>
              <p className="field-data">
                {user.roditelj1.ime} {user.roditelj1.prezime}, mobitel {user.roditelj1.brojMobitela}
              </p>
            </div>
            <div className="field">
              <p className="field-name">Roditelj 2 </p>
              <p className="field-data">
                {user.roditelj2.ime} {user.roditelj2.prezime}, mobitel {user.roditelj2.brojMobitela}
              </p>
            </div>
          </>
        )}

      {showProfilePicturePopup && <ProfilePicturePopup fetchProfilePicture={fetchProfilePicture} />}
    </>
  );
};

const getUserRoles = (user) => {
  const roles = [];
  if (user.isAdmin) roles.push('administrator');
  if (user.isMentor) roles.push('mentor');
  if (user.isStudent) roles.push('student');
  return roles.length > 0 ? roles.join(', ') : 'No roles';
};

export default UserInfoComponent;
