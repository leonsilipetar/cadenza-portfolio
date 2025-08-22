import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin';
import { toast } from 'react-toastify';
import '../../App.css';
import './DriveIntegration.css';

const SetupWizardStep = ({ title, children, currentStep, stepNumber }) => (
  <div className={`setup-step ${currentStep === stepNumber ? 'active' : ''}`}>
    <h3>{title}</h3>
    <div className="step-content">
      {children}
    </div>
  </div>
);

const DriveIntegration = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(window.location.origin + '/drive-callback');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [folderStructure, setFolderStructure] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [folderBrowserId, setFolderBrowserId] = useState('root');
  const [selectedRootFolder, setSelectedRootFolder] = useState(null);
  const [showExternalFiles, setShowExternalFiles] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [authCode, setAuthCode] = useState('');
  const [showAuthCodeInput, setShowAuthCodeInput] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);

  // 1. Add a new state for folderIdInput
  const [folderIdInput, setFolderIdInput] = useState('');
  const serviceAccountEmail = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || 'service-account@your-project.iam.gserviceaccount.com';

  // Fetch user and school data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await ApiConfig.api.get('/api/user');
        setUser(res.data.user);
        
        if (res.data.user && res.data.user.schoolId) {
          await fetchSchoolData(res.data.user.schoolId);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Error loading user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch school and drive status data
  const fetchSchoolData = async (schoolId) => {
    try {
      // Fetch school data
      const schoolRes = await ApiConfig.api.get(`/api/schools`);
      setSchool(schoolRes.data);
      
      // Fetch drive status
      const driveRes = await ApiConfig.api.get(`/api/drive/${schoolId}/status`);
      setDriveStatus(driveRes.data);
      
      // Do NOT auto-load files from Drive here
      // Only set currentFolderId if drive is enabled
      if (driveRes.data.driveEnabled) {
        setCurrentFolderId(driveRes.data.driveRootFolderId);
        // Do not call fetchFiles here
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast.error('Error loading school or drive data');
    }
  };

  // Fetch files from a specific folder
  const fetchFiles = async (schoolId, folderId = null) => {
    try {
      setLoading(true);
      const res = await ApiConfig.api.get(`/api/drive/${schoolId}/files`, {
        params: { folderId }
      });
      setFiles(res.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Error loading files from Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // Fetch files from a specific folder in folder browser
  const fetchFolderSelectorFiles = async (folderId = 'root') => {
    try {
      setLoading(true);
      const res = await ApiConfig.api.get(`/api/drive/${user.schoolId}/browser`, {
        params: { folderId }
      });
      setFiles(res.data);
      setFolderBrowserId(folderId);
    } catch (error) {
      console.error('Error fetching folder browser:', error);
      toast.error('Greška pri učitavanju mapa iz Google Drive-a');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Drive setup
  const handleInitSetup = async (e) => {
    if (e) e.preventDefault();
    
    // Validate credentials
    if (!clientId || !clientSecret) {
      toast.error('Please enter both Client ID and Client Secret');
      return;
    }

    // Validate client ID format (should be a long string ending with .apps.googleusercontent.com)
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      toast.error('Invalid Client ID format. Please check your credentials.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await ApiConfig.api.post(`/api/drive/${user.schoolId}/init`, {
        clientId,
        clientSecret,
        redirectUri: `${window.location.origin}/drive-callback`
      });
      
      if (!response.data.codeVerifier || !response.data.authUrl) {
        throw new Error('Invalid response from server - missing code verifier or auth URL');
      }

      // Store setup data in localStorage
      const setupData = {
        schoolId: user.schoolId,
        codeVerifier: response.data.codeVerifier,
        timestamp: Date.now()
      };
      localStorage.setItem('driveSetupData', JSON.stringify(setupData));

      // Log for debugging
      console.log('Starting OAuth flow with:', {
        redirectUri: `${window.location.origin}/drive-callback`,
        clientIdLength: clientId.length,
        hasCodeVerifier: !!response.data.codeVerifier
      });
      
      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initializing Drive setup:', error);
      let errorMessage = 'Failed to initialize Drive setup';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Client ID or Client Secret. Please check your credentials in Google Cloud Console.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a new folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    
    if (!newFolderName) {
      toast.error('Folder name is required');
      return;
    }
    
    try {
      setLoading(true);
      await ApiConfig.api.post(`/api/drive/${user.schoolId}/folders`, {
        name: newFolderName,
        parentFolderId: currentFolderId
      });
      
      toast.success('Folder created successfully!');
      setNewFolderName('');
      
      // Refresh files list
      fetchFiles(user.schoolId, currentFolderId);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Error creating folder');
    } finally {
      setLoading(false);
    }
  };

  // Upload a file
  const handleUploadFile = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    try {
      setLoading(true);
      
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Extract base64 content
        const base64Content = reader.result.split(',')[1];
        
        await ApiConfig.api.post(`/api/drive/${user.schoolId}/files`, {
          name: uploadFile.name,
          content: base64Content,
          mimeType: uploadFile.type,
          folderId: currentFolderId
        });
        
        toast.success('File uploaded successfully!');
        setUploadFile(null);
        
        // Refresh files list
        fetchFiles(user.schoolId, currentFolderId);
      };
      
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  // Delete a file or folder
  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this item? This cannot be undone.')) {
      try {
        setLoading(true);
        await ApiConfig.api.delete(`/api/drive/${user.schoolId}/files/${fileId}`);
        
        toast.success('Item deleted successfully!');
        
        // Refresh files list
        fetchFiles(user.schoolId, currentFolderId);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Error deleting item');
      } finally {
        setLoading(false);
      }
    }
  };

  // Navigate to a folder
  const handleFolderClick = (folderId) => {
    setCurrentFolderId(folderId);
    fetchFiles(user.schoolId, folderId);
  };

  // Go back to parent folder
  const handleGoBack = async () => {
    try {
      // Get current folder info to find its parent
      const fileInfo = await ApiConfig.api.get(`(/api/drive/${user.schoolId}/files/${currentFolderId}`);
      
      if (fileInfo.data.parents && fileInfo.data.parents.length > 0) {
        const parentId = fileInfo.data.parents[0];
        setCurrentFolderId(parentId);
        fetchFiles(user.schoolId, parentId);
      } else {
        // If no parent, go to root
        setCurrentFolderId(driveStatus.driveRootFolderId);
        fetchFiles(user.schoolId, driveStatus.driveRootFolderId);
      }
    } catch (error) {
      console.error('Error navigating to parent folder:', error);
      toast.error('Error navigating to parent folder');
    }
  };

  // Navigate to a folder in folder browser
  const handleFolderBrowserClick = (folder) => {
    setFolderBrowserId(folder.id);
    fetchFolderSelectorFiles(folder.id);
  };

  // Go back to parent folder in folder browser
  const handleFolderBrowserBack = async () => {
    try {
      if (folderBrowserId === 'root') return;
      
      // Get current folder info to find its parent
      const fileInfo = await ApiConfig.api.get(`/api/drive/${user.schoolId}/files/${folderBrowserId}`);
      
      if (fileInfo.data.parents && fileInfo.data.parents.length > 0) {
        const parentId = fileInfo.data.parents[0];
        setFolderBrowserId(parentId);
        fetchFolderSelectorFiles(parentId);
      } else {
        // If no parent, go to root
        setFolderBrowserId('root');
        fetchFolderSelectorFiles('root');
      }
    } catch (error) {
      console.error('Error navigating to parent folder:', error);
      toast.error('Greška pri navigaciji na roditeljsku mapu');
    }
  };

  // Select folder as root folder
  const handleSelectRootFolder = async (folder) => {
    try {
      setLoading(true);
      
      const res = await ApiConfig.api.post(`/api/drive/${user.schoolId}/set-root-folder`, {
        folderId: folder.id,
        folderName: folder.name
      });
      
      // Update drive status
      setDriveStatus({
        ...driveStatus,
        driveRootFolderId: folder.id,
        driveSettings: {
          ...driveStatus.driveSettings,
          rootFolder: {
            id: folder.id,
            name: folder.name
          }
        }
      });
      
      setSelectedRootFolder(folder);
      toast.success('Glavna mapa uspješno postavljena!');
      setShowFolderSelector(false);
      
      // Update files list to the newly selected root folder
      fetchFiles(user.schoolId, folder.id);
      setCurrentFolderId(folder.id);
      
    } catch (error) {
      console.error('Error setting root folder:', error);
      toast.error('Greška pri postavljanju glavne mape');
    } finally {
      setLoading(false);
    }
  };

  // Toggle showing external files in documents section
  const handleToggleExternalFiles = async () => {
    try {
      setLoading(true);
      
      await ApiConfig.api.post(`/api/drive/${user.schoolId}/settings`, {
        showExternalFiles: !showExternalFiles
      });
      
      setShowExternalFiles(!showExternalFiles);
      toast.success(`Prikaz vanjskih datoteka je ${!showExternalFiles ? 'uključen' : 'isključen'}`);
      
    } catch (error) {
      console.error('Error toggling external files setting:', error);
      toast.error('Greška pri promjeni postavki prikaza vanjskih datoteka');
    } finally {
      setLoading(false);
    }
  };

  // Load show external files setting on component mount
  useEffect(() => {
    if (driveStatus && driveStatus.driveEnabled) {
      setShowExternalFiles(driveStatus.showExternalFiles || false);
    }
  }, [driveStatus]);

  // Helper: Check for token expiry in API errors
  const handleApiError = (error, fallbackMessage) => {
    const tokenExpired = error?.response?.status === 401 ||
      (error?.response?.data?.message &&
        /token|auth|expired|unauthorized/i.test(error.response.data.message));
    if (tokenExpired) {
      toast.error('Google Drive session expired. Please reconnect.');
      setShowReconnectPrompt(true);
    } else {
      toast.error(fallbackMessage || 'Greška pri komunikaciji s Google Drive-om');
    }
  };

  // Quota calculation helper
  const quotaUsed = driveStatus?.quotaUsed || 0;
  const quotaTotal = driveStatus?.quotaTotal || 0;
  const quotaPercent = quotaTotal > 0 ? Math.round((quotaUsed / quotaTotal) * 100) : 0;
  const quotaWarning = quotaPercent >= 80;

  // Connected account info
  const connectedAccount = driveStatus?.connectedEmail || driveStatus?.connectedAccount || null;

  if (!user || loading) {
    return <div>Loading...</div>;
  }

  const renderSetupWizard = () => (
    <div className="setup-wizard">
      <SetupWizardStep title="Create Google Cloud Project" currentStep={setupStep} stepNumber={1}>
        <ol className="setup-instructions">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
          <li>Click "Select a project" at the top, then "New Project"</li>
          <li>Name your project (e.g. "School Music Drive")</li>
          <li>Click "Create"</li>
          <button className="btn btn-primary" onClick={() => setSetupStep(2)}>Next Step</button>
        </ol>
      </SetupWizardStep>

      <SetupWizardStep title="Enable Drive API" currentStep={setupStep} stepNumber={2}>
        <ol className="setup-instructions">
          <li>In the Google Cloud Console, go to "APIs & Services" {'->'} "Library"</li>
          <li>Search for "Google Drive API"</li>
          <li>Click "Enable"</li>
          <button className="btn btn-primary" onClick={() => setSetupStep(3)}>Next Step</button>
        </ol>
      </SetupWizardStep>

      <SetupWizardStep title="Create OAuth Credentials" currentStep={setupStep} stepNumber={3}>
        <ol className="setup-instructions">
          <li>Go to "APIs & Services" {'->'} "Credentials"</li>
          <li>Click "Create Credentials" {'->'} "OAuth client ID"</li>
          <li>Choose "Web application" as the application type</li>
          <li>Add these Authorized redirect URIs:
            <code>{window.location.origin}/drive-callback</code>
          </li>
          <li>Click "Create"</li>
          <li>Copy the Client ID and Client Secret</li>
          <button className="btn btn-primary" onClick={() => setSetupStep(4)}>Next Step</button>
        </ol>
      </SetupWizardStep>

      <SetupWizardStep title="Configure Cadenza" currentStep={setupStep} stepNumber={4}>
        <form onSubmit={handleInitSetup}>
          <div className="form-group">
            <label>Client ID:</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="form-control"
              placeholder="Paste your Client ID here"
            />
          </div>
          <div className="form-group">
            <label>Client Secret:</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="form-control"
              placeholder="Paste your Client Secret here"
            />
          </div>
          <button type="submit" className="btn btn-success">
            Connect Drive
          </button>
        </form>
      </SetupWizardStep>

      <SetupWizardStep title="Complete Authorization" currentStep={setupStep} stepNumber={5}>
        <form onSubmit={handleInitSetup}>
          <div className="form-group">
            <label>Authorization Code:</label>
            <input
              type="text"
              name="code"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              className="form-control"
              placeholder="Paste the authorization code here"
            />
            <small className="form-text text-muted">
              After authorizing in the popup window, paste the code you received here.
            </small>
          </div>
          <button type="submit" className="btn btn-success">
            Complete Setup
          </button>
        </form>
      </SetupWizardStep>
    </div>
  );

  return (
    <>
      <NavigacijaAdmin otvoreno="drive" />
      <NavTopAdministracija user={user} naslov="Google Drive Integracija" />
      
      <div className="main">
        {/* Show warning if Drive is not connected */}
        {!driveStatus?.driveEnabled && school && (
          <div className="karticaZadatka" style={{ background: '#fffbe6', color: '#b26a00', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--boxShadow)' }}>
            <Icon icon="solar:danger-triangle-broken" style={{ fontSize: 24 }} />
            Google Drive nije povezan za ovu školu. Provjerite je li glavna mapa ispravno postavljena i podijeljena sa service account emailom (<code>{serviceAccountEmail}</code>).
          </div>
        )}
        {/* Show error visually distinct */}
        {error && (
          <div className="karticaZadatka" style={{ background: '#ffeaea', color: '#b20000', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--boxShadow)' }}>
            <Icon icon="solar:danger-triangle-broken" style={{ fontSize: 24 }} />
            {error}
          </div>
        )}
        {/* Show reconnect prompt if token expired */}
        {showReconnectPrompt && (
          <div className="karticaZadatka" style={{ background: '#fffbe6', color: '#b26a00', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--boxShadow)' }}>
            <Icon icon="solar:danger-triangle-broken" style={{ fontSize: 24 }} />
            Google Drive session expired. <button className="gumb" onClick={() => { setSetupStep(1); setShowReconnectPrompt(false); }}>Reconnect Drive</button>
          </div>
        )}
        {/* Show connected account and quota if available */}
        {driveStatus?.driveEnabled && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Icon icon="solar:user-id-broken" style={{ fontSize: 20, marginRight: 6 }} />
              Connected account: <strong>{connectedAccount || 'Unknown'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="solar:database-broken" style={{ fontSize: 20 }} />
              Drive usage: {quotaTotal > 0 ? `${(quotaUsed / (1024 ** 3)).toFixed(2)} GB / ${(quotaTotal / (1024 ** 3)).toFixed(2)} GB` : 'Unknown'}
              {quotaTotal > 0 && (
                <div style={{ width: 120, height: 10, background: '#eee', borderRadius: 5, marginLeft: 8, position: 'relative' }}>
                  <div style={{ width: `${quotaPercent}%`, height: '100%', background: quotaWarning ? '#ff9800' : '#4caf50', borderRadius: 5 }} />
                </div>
              )}
              {quotaWarning && <span style={{ color: '#b26a00', fontWeight: 600, marginLeft: 8 }}>Low space!</span>}
            </div>
            <button className="gumb" style={{ marginTop: 8 }} onClick={() => setSetupStep(1)}>
              <Icon icon="solar:refresh-broken" /> Reconnect Drive
            </button>
          </div>
        )}
        
        {/* Replace the setup section with clear instructions */}
        <div className="setup-intro">
          <h3>Povežite Google Drive s aplikacijom</h3>
          <ol className="setup-instructions">
            <li>Kreirajte novu mapu u Google Drive-u (ili koristite postojeću).</li>
            <li>Podijelite tu mapu s Google Service Account emailom:<br /><code>{serviceAccountEmail}</code></li>
            <li>Omogućite pristup "Editor" (Uređivač).</li>
            <li>Kopirajte link ili ID te mape i zalijepite ga ispod.</li>
          </ol>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Zalijepite Google Drive folder ID ili link ovdje..."
                value={folderIdInput}
                onChange={e => setFolderIdInput(e.target.value)}
                style={{ width: '100%', maxWidth: 400 }}
              />
              <button
                className="gumb"
                onClick={async () => {
                  let folderId = folderIdInput;
                  // Extract folder ID from link if needed
                  const match = folderIdInput.match(/[-\w]{25,}/);
                  if (match) folderId = match[0];
                  try {
                    setLoading(true);
                    await ApiConfig.api.post(`/api/drive/${user.schoolId}/root-folder`, {
                      folderId,
                      folderName: 'Custom Google Drive Folder',
                    });
                    toast.success('Glavna mapa postavljena!');
                    setFolderIdInput('');
                    fetchSchoolData(user.schoolId);
                  } catch (err) {
                    toast.error('Greška pri postavljanju glavne mape');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!folderIdInput}
              >
                Postavi kao glavnu mapu
              </button>
            </div>
            {/* Toggle below, visually grouped but not crowded */}
            <div style={{ marginTop: 8 }}>
              <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={showExternalFiles}
                  onChange={handleToggleExternalFiles}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">
                  Prikaži vanjske Google Drive datoteke u Dokumentima
                  <span title="Ako je uključeno, prikazat će se sve datoteke iz glavne Google Drive mape, čak i one koje nisu dodane kroz aplikaciju." style={{ marginLeft: 6, cursor: 'help', color: '#888' }}>
                    <Icon icon="mdi:information-outline" />
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
        {driveStatus?.driveEnabled && (
          <div className="drive-integration-container">
            <div className="status-section">
              <h3>Google Drive Status za {school.name}</h3>
              <div className="status-info enabled">
                <p>
                  <Icon icon="mdi:check-circle" style={{ color: 'green' }} />
                  Google Drive integracija je aktivirana za vašu školu
                </p>
                <p>Glavna mapa: <b>{driveStatus.driveSettings?.rootFolder?.name || 'Nepoznato'}</b></p>
                <p>ID: <code>{driveStatus.driveRootFolderId}</code></p>
                <a
                  className="gumb"
                  href={`https://drive.google.com/drive/folders/${driveStatus.driveRootFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginRight: 8 }}
                >
                  <Icon icon="mdi:open-in-new" /> Otvori mapu na Google Drive-u
                </a>
                <button className="gumb" onClick={() => setShowFolderSelector(true)}>
                  <Icon icon="mdi:folder-search" /> Promijeni glavnu mapu
                </button>
                {/* Visible toggle for external files */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={showExternalFiles}
                      onChange={handleToggleExternalFiles}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      Prikaži vanjske Google Drive datoteke u Dokumentima
                      <span title="Ako je uključeno, prikazat će se sve datoteke iz glavne Google Drive mape, čak i one koje nisu dodane kroz aplikaciju." style={{ marginLeft: 6, cursor: 'help', color: '#888' }}>
                        <Icon icon="mdi:information-outline" />
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {/* Folder Selector Section (unchanged) */}
            {showFolderSelector && (
              <div className="folder-selector-section">
                <h3>Odaberite glavnu mapu za pohranu</h3>
                <p>Odaberite postojeću mapu u vašem Google Drive-u koja će se koristiti kao glavna mapa za pohranu dokumenata:</p>
                {/* Only show folder browser here, no file/folder creation or upload */}
                <div className="folder-browser">
                  <div className="browser-header">
                    {folderBrowserId !== 'root' && (
                      <button 
                        className="gumb outline" 
                        onClick={handleFolderBrowserBack}
                      >
                        <Icon icon="mdi:arrow-left" /> Natrag
                      </button>
                    )}
                    <h4>Pregled mapa</h4>
                  </div>
                  <div className="browser-files">
                    {loading ? (
                      <div className="loading-spinner"></div>
                    ) : files.length === 0 ? (
                      <p>Nema mapa u ovom direktoriju</p>
                    ) : (
                      <ul className="folder-list">
                        {files
                          .filter(file => file.mimeType === 'application/vnd.google-apps.folder')
                          .map(folder => (
                            <li key={folder.id} className="folder-item">
                              <div className="folder-info">
                                <button 
                                  className="folder-name" 
                                  onClick={() => handleFolderBrowserClick(folder)}
                                >
                                  <Icon icon="mdi:folder" /> {folder.name}
                                </button>
                                <button 
                                  className="gumb select-btn" 
                                  onClick={() => handleSelectRootFolder(folder)}
                                >
                                  Odaberi
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  <div className="browser-actions">
                    <button 
                      className="gumb outline" 
                      onClick={() => setShowFolderSelector(false)}
                    >
                      Odustani
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OAuth Callback Section */}
            {driveStatus && !driveStatus.driveEnabled && driveStatus.driveSettings?.temp?.setupInProgress && (
              <div className="callback-section">
                <h3>Dovršite Google Drive Autorizaciju</h3>
                <p>Unesite autorizacijski kod s Googlea:</p>
                
                <form onSubmit={handleInitSetup}>
                  <div className="form-group">
                    <label htmlFor="code">Autorizacijski kod:</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      placeholder="Zalijepite kod ovdje"
                      required
                    />
                  </div>
                  
                  <button type="submit" className="gumb">
                    Dovrši postavljanje
                  </button>
                </form>
              </div>
            )}

            {/* Files Explorer Section */}
            {/* REMOVE: Files Explorer Section, Create Folder, Upload File, and related UI from admin dashboard */}
          </div>
        )}
      </div>
    </>
  );
};

export default DriveIntegration; 