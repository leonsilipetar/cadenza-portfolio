import React, { useState, useEffect, useContext } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from '../components/apiConfig';
import Navigacija from './navigacija/index';
import NavTop from './nav-top/index';
import LoadingShell from '../components/LoadingShell';
import { Link } from 'react-router-dom';
import { showNotification } from '../components/Notifikacija';

const DriveDocs = ({ user, unreadChatsCount }) => {
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'folder'
  const [newFolderName, setNewFolderName] = useState('');
  const otvoreno = 'dokumenti';
  const [driveNotConnected, setDriveNotConnected] = useState(false);
  const [showFolderDetails, setShowFolderDetails] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    if (user?.schoolId) {
      fetchFiles(user.schoolId, null);
    }
    // eslint-disable-next-line
  }, [user]);

  const fetchFiles = async (schoolId, folderId = null) => {
    try {
      setLoading(true);
      setDriveNotConnected(false);
      const res = await ApiConfig.api.get(`/api/drive/${schoolId}/files`, {
        params: { folderId }
      });
      setFiles(res.data);
      setCurrentFolderId(folderId);
    } catch (error) {
      setDriveNotConnected(true);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setFolderStack([...folderStack, { id: currentFolderId, name: folder.name }]);
    fetchFiles(user.schoolId, folder.id);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setFolderStack([]);
      fetchFiles(user.schoolId, null);
    } else {
      const newStack = folderStack.slice(0, index + 1);
      fetchFiles(user.schoolId, newStack[newStack.length - 1].id);
      setFolderStack(newStack);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadFile.name);
      formData.append('mimeType', uploadFile.type);
      formData.append('folderId', currentFolderId || '');
      await ApiConfig.api.post(
        `/api/drive/${user.schoolId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      showNotification('success', 'Datoteka uspješno učitana na Google Drive!');
      setUploadFile(null);
      setShowUploadModal(false);
      fetchFiles(user.schoolId, currentFolderId);
    } catch (error) {
      showNotification('error', 'Greška pri učitavanju datoteke na Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // Add folder details handler
  const handleFolderDetails = (folder) => {
    setSelectedFolder(folder);
    setShowFolderDetails(true);
  };

  return (
    <>
      <Navigacija user={user} otvoreno={otvoreno} unreadChatsCount={unreadChatsCount} />
      <NavTop user={user} naslov="Dokumenti" />
      {driveNotConnected && !loading ? (
        <div className="main">
          <div style={{
            color: 'var(--isticanje)',
            background: 'rgba(var(--isticanje-rgb), 0.08)',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            padding: '18px 24px',
            margin: '32px auto',
            maxWidth: 480,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 500,
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)'
          }}>
            <Icon icon="solar:cloud-cross-broken" style={{ fontSize: 32, color: 'var(--isticanje)', marginBottom: 8 }} />
            <div>Škola još nije povezala Google Drive račun za dijeljenje dokumenata.</div>
            {user.isAdmin && (
              <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
                Povežite Drive u postavkama škole.<br />
                <Link to="/drive-integration" className="gumb action-btn" style={{ marginTop: 8, display: 'inline-block' }}>
                  <Icon icon="logos:google-drive" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 6 }} />
                  Otvori Google Drive integraciju
                </Link>
                <br />Korisnici neće moći dijeliti ili pregledavati dokumente dok integracija nije aktivna.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Info message for admins is now rendered inside tablica below */}
          {user.isMentor && (
            <button
              className="floating-action-btn"
              onClick={() => {
                setShowUploadModal(true);
                setUploadTab('file');
              }}
              title="Dodaj datoteku ili mapu na Drive"
            >
              <Icon icon="solar:add-circle-broken" style={{ fontSize: 32, color: 'white' }} />
            </button>
          )}
          <div className="main">
            {/* Breadcrumbs */}
            <div className="folder-path" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <button className="gumb outline path-item" style={{ padding: '2px 10px', fontSize: 15 }} onClick={() => handleBreadcrumbClick(-1)}>
                <Icon icon="mdi:folder" /> Root
              </button>
              {folderStack.map((folder, idx) => (
                <React.Fragment key={folder.id}>
                  <span className="path-separator">/</span>
                  <button className="gumb outline path-item" style={{ padding: '2px 10px', fontSize: 15 }} onClick={() => handleBreadcrumbClick(idx)}>
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="karticaZadatka">
            {user.isAdmin && (
                    <div className="tr" style={{ background: 'rgba(var(--isticanje-rgb), 0.08)', color: 'var(--isticanje)', borderRadius: 8, margin: '8px 0', padding: '10px 18px', fontWeight: 500, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon icon="solar:info-circle-broken" style={{ fontSize: 22, color: 'var(--isticanje)', marginRight: 8, flexShrink: 0 }} />
                      <span>Svi dokumenti koji se dodaju putem Google drive sučelja automatski su javno dostupni i vidljivi svim korisnicima aplikacije.</span>
                    </div>
                  )}
              {loading ? (
                <LoadingShell message="Učitavanje datoteka s Google Drive-a..." />
              ) : files.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', fontSize: 18 }}>Nema datoteka u ovoj mapi</div>
              ) : (
                <div className="tablica">
                  {/* Info message for admins inside tablica */}
                  
                  <div className="tr naziv">
                    <div className="th">Naziv</div>
                    <div className="th">Tip</div>
                    <div className="th">Akcije</div>
                  </div>
                  {files.map(file => (
                    <div key={file.id} className="tr redak">
                      <div className="th file-title" style={{ maxWidth: 300, overflow: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon icon={file.mimeType === 'application/vnd.google-apps.folder' ? 'mdi:folder' : 'mdi:file-document-outline'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                      </div>
                      <div className="th">{file.mimeType === 'application/vnd.google-apps.folder' ? 'Mapa' : (file.mimeType.split('/')[1] || 'Datoteka')}</div>
                      <div className="th">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {file.mimeType === 'application/vnd.google-apps.folder' ? (
                            <>
                              <button
                                className="action-btn btn abExpand"
                                onClick={() => handleFolderClick(file)}
                                style={{ backgroundColor: 'var(--isticanje-svijetlo)', cursor: 'pointer' }}
                                title="Otvori mapu"
                              >
                                <Icon icon="solar:folder-open-broken" />
                              </button>
                              <button
                                className="action-btn btn"
                                onClick={() => handleFolderDetails(file)}
                                style={{ backgroundColor: 'var(--isticanje-svijetlo)', cursor: 'pointer' }}
                                title="Detalji"
                              >
                                <Icon icon="solar:round-double-alt-arrow-down-broken" />
                              </button>
                            </>
                          ) : (
                            <>
                              <a
                                className="gumb action-btn"
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 14 }}
                                title="Otvori u Driveu"
                                onClick={e => e.stopPropagation()}
                              >
                                <Icon icon="mdi:open-in-new" /> Drive
                              </a>
                              <a
                                className="gumb action-btn"
                                href={file.webContentLink || file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.name}
                                style={{ fontSize: 14 }}
                                title="Preuzmi"
                                onClick={e => e.stopPropagation()}
                              >
                                <Icon icon="solar:file-download-broken" /> Preuzmi
                              </a>
                              {file.creatorId === user.id && (
                                <button
                                  className="action-btn abDelete"
                                  title="Obriši datoteku"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm('Jeste li sigurni da želite obrisati ovu datoteku?')) return;
                                    try {
                                      await ApiConfig.api.delete(`/api/drive/${user.schoolId}/files/${file.id}`);
                                      showNotification('success', 'Datoteka uspješno obrisana');
                                      fetchFiles(user.schoolId, currentFolderId);
                                    } catch (error) {
                                      showNotification('error', 'Greška pri brisanju datoteke');
                                    }
                                  }}
                                >
                                  <Icon icon="solar:trash-bin-trash-broken" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {showFolderDetails && selectedFolder && (
        <div className="popup">
          <div className="div div-clmn">
            <div className="div-radio">
              <h3>Detalji mape - {selectedFolder.name}</h3>
              <button
                className="gumb action-btn zatvoriBtn"
                onClick={() => {
                  setShowFolderDetails(false);
                  setSelectedFolder(null);
                }}
              >
                <Icon icon="solar:close-circle-broken" /> Zatvori
              </button>
            </div>
            <div className="tablica">
              <div className="tr naziv">
                <div className="th">Informacije</div>
                <div className="th">Vrijednost</div>
              </div>
              <div className="tr redak">
                <div className="th">Naziv</div>
                <div className="th">{selectedFolder.name}</div>
              </div>
              <div className="tr redak">
                <div className="th">Tip</div>
                <div className="th">Mapa</div>
              </div>
              <div className="tr redak">
                <div className="th">Kreirao</div>
                <div className="th">{selectedFolder.creatorName || '-'}</div>
              </div>
              <div className="tr redak">
                <div className="th">Datum kreiranja</div>
                <div className="th">{selectedFolder.createdAt ? new Date(selectedFolder.createdAt).toLocaleDateString('hr-HR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
              </div>
              <div className="tr redak">
                <div className="th">Status</div>
                <div className="th" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedFolder.creatorId === user.id ? (
                    <div className="toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        className={`toggle-switch ${selectedFolder.isPublic ? 'active' : ''}`}
                        onClick={async () => {
                          try {
                            await ApiConfig.api.put(`/api/documents/${selectedFolder.documentId}`, {
                              ...selectedFolder,
                              isPublic: !selectedFolder.isPublic
                            });
                            setSelectedFolder({
                              ...selectedFolder,
                              isPublic: !selectedFolder.isPublic
                            });
                            showNotification(`success`, `Mapa je sada ${!selectedFolder.isPublic ? 'javna' : 'privatna'}`);
                            fetchFiles(user.schoolId, currentFolderId);
                          } catch (error) {
                            showNotification('error', 'Greška pri promjeni vidljivosti mape');
                          }
                        }}
                        style={{
                          width: '48px',
                          height: '24px',
                          backgroundColor: selectedFolder.isPublic ? 'rgb(var(--isticanje))' : 'rgba(var(--isticanje), 0.3)',
                          borderRadius: '12px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease'
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: selectedFolder.isPublic ? '26px' : '2px',
                            transition: 'left 0.3s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                        {selectedFolder.isPublic ? 'Javno' : 'Privatno'}
                      </span>
                    </div>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: selectedFolder.isPublic ? 'rgb(var(--isticanje))' : 'var(--text)' }}>
                      <Icon icon={selectedFolder.isPublic ? "solar:global-broken" : "solar:lock-keyhole-minimalistic-linear"} style={{ fontSize: '1.2rem' }} />
                      {selectedFolder.isPublic ? 'Javno' : 'Privatno'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="div-radio">
              {selectedFolder.creatorId === user.id && (
                <>
                  <button
                    className="gumb action-btn"
                    onClick={async () => {
                      const newName = prompt('Unesite novi naziv mape:', selectedFolder.name);
                      if (!newName || newName === selectedFolder.name) return;
                      try {
                        await ApiConfig.api.put(`/api/documents/${selectedFolder.documentId}`, {
                          ...selectedFolder,
                          name: newName
                        });
                        setSelectedFolder({ ...selectedFolder, name: newName });
                        showNotification('success', 'Mapa uspješno preimenovana');
                        fetchFiles(user.schoolId, currentFolderId);
                      } catch (error) {
                        showNotification('error', 'Greška pri preimenovanju mape');
                      }
                    }}
                  >
                    <Icon icon="solar:pen-broken" /> Preimenuj
                  </button>
                  <button
                    className="gumb action-btn abDelete"
                    onClick={async () => {
                      if (!window.confirm('Jeste li sigurni da želite obrisati ovu mapu i sve njezine sadržaje?')) return;
                      try {
                        await ApiConfig.api.delete(`/api/drive/${user.schoolId}/files/${selectedFolder.id}`);
                        showNotification('success', 'Mapa uspješno obrisana');
                        setShowFolderDetails(false);
                        setSelectedFolder(null);
                        fetchFiles(user.schoolId, currentFolderId);
                      } catch (error) {
                        showNotification('error', 'Greška pri brisanju mape');
                      }
                    }}
                  >
                    <Icon icon="solar:trash-bin-trash-broken" /> Obriši
                  </button>
                </>
              )}
              <button
                className="gumb action-btn zatvoriBtn"
                onClick={() => {
                  setShowFolderDetails(false);
                  setSelectedFolder(null);
                }}
              >
                <Icon icon="solar:close-circle-broken" /> Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upload modal will go here */}
      {showUploadModal && (
        <div className="popup">
          <div style={{ minWidth: 340, maxWidth: 420, margin: '0 auto' }}>
            <div className="div div-clmn">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Dodaj na Drive</h3>
                <button
                  type="button"
                  className="gumb action-btn zatvoriBtn"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setNewFolderName('');
                  }}
                >
                  <Icon icon="solar:close-circle-broken" />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <button
                  className={`gumb action-btn${uploadTab === 'file' ? ' active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setUploadTab('file')}
                  type="button"
                >
                  <Icon icon="solar:file-text-broken" /> Datoteka
                </button>
                <button
                  className={`gumb action-btn${uploadTab === 'folder' ? ' active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setUploadTab('folder')}
                  type="button"
                >
                  <Icon icon="solar:folder-add" /> Nova mapa
                </button>
              </div>
              {uploadTab === 'file' ? (
                <form onSubmit={handleUpload}>
                  <div className="div" style={{ marginBottom: 18 }}>
                    <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Odaberi datoteku:</label>
                    <input
                      type="file"
                      onChange={e => setUploadFile(e.target.files[0])}
                      disabled={loading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  {uploadFile && (
                    <div className="div" style={{ marginBottom: 18, color: '#555', fontSize: 15 }}>
                      <Icon icon="solar:file-text-broken" style={{ marginRight: 8, fontSize: 20, verticalAlign: 'middle' }} />
                      {uploadFile.name}
                    </div>
                  )}
                  <div className="div-radio" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="action-btn zatvoriBtn"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setNewFolderName('');
                      }}
                      disabled={loading}
                    >
                      Zatvori
                    </button>
                    <button
                      type="submit"
                      className="action-btn spremiBtn"
                      disabled={!uploadFile || loading}
                      style={{ minWidth: 140 }}
                    >
                      {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="loading-spinner" style={{ width: 22, height: 22, borderWidth: 3 }}></span>
                          Učitavanje...
                        </span>
                      ) : (
                        <><Icon icon="solar:upload" /> Učitaj</>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newFolderName.trim()) return;
                    try {
                      setLoading(true);
                      await ApiConfig.api.post(`/api/drive/${user.schoolId}/folders`, {
                        name: newFolderName,
                        parentFolderId: currentFolderId || ''
                      });
                      showNotification('success', 'Mapa uspješno kreirana na Google Drive-u!');
                      setNewFolderName('');
                      setShowUploadModal(false);
                      fetchFiles(user.schoolId, currentFolderId);
                    } catch (error) {
                      showNotification('error', 'Greška pri kreiranju mape na Google Drive-u');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <div className="div" style={{ marginBottom: 18 }}>
                    <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Naziv nove mape:</label>
                    <input
                      type="text"
                      className='input-login-signup'
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      disabled={loading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div className="div-radio" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="action-btn zatvoriBtn"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setNewFolderName('');
                      }}
                      disabled={loading}
                    >
                      Zatvori
                    </button>
                    <button
                      type="submit"
                      className="action-btn spremiBtn"
                      disabled={!newFolderName.trim() || loading}
                      style={{ minWidth: 140 }}
                    >
                      {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="loading-spinner" style={{ width: 22, height: 22, borderWidth: 3 }}></span>
                          Kreiranje...
                        </span>
                      ) : (
                        <><Icon icon="solar:folder-add" /> Kreiraj</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriveDocs; 