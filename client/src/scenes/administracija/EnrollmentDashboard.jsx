import React, { useEffect, useState } from 'react';
import ApiConfig from '../../components/apiConfig';
import '../../scenes/SignUpForm.css';
import { Icon } from '@iconify/react';
import NavigacijaAdmin from './NavigacijaAdmin';
import NavTopAdministracija from './NavTopAdmin.jsx';

const EnrollmentDashboard = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025/2026'); // Default to current enrollment year

  useEffect(() => {
    const fetchEnrollments = async () => {
      setLoading(true);
      try {
        let url = '/api/enrollment/list';
        const params = new URLSearchParams();
        
        // Add school year parameter
        if (selectedYear) {
          params.append('schoolYear', selectedYear);
        }
        
        if (filter === 'active') {
          params.append('active', 'true');
        } else if (filter === 'inactive') {
          params.append('active', 'false');
        }
        // For 'all', don't add active parameter
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log('📋 Frontend: Making API call to:', url);
        const res = await ApiConfig.api.get(url);
        console.log('📋 Frontend: Received response:', res.data);
        setEnrollments(res.data.enrollments || []);
      } catch (err) {
        console.error('📋 Frontend: Error fetching enrollments:', err);
        setError('Greška pri dohvaćanju upisa.');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, [filter, selectedYear]); // Add selectedYear to dependencies

  const filtered = enrollments.filter(e => {
    const name = (e.user?.ime + ' ' + e.user?.prezime).toLowerCase();
    const email = (e.user?.email || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    if (filtered.length === 0) {
      alert('Nema podataka za export!');
      return;
    }

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Create CSV content with semicolon separator (better for Excel)
    const headers = [
      'Ime i prezime',
      'Email', 
      'Škola',
      'Program',
      'Mentor',
      'Status',
      'Datum potvrde',
      'Školska godina'
    ];

    const csvContent = [
      headers.join(';'),
      ...filtered.map(e => [
        escapeCSV(`${e.user?.ime || ''} ${e.user?.prezime || ''}`),
        escapeCSV(e.user?.email || ''),
        escapeCSV(e.school?.name || 'Nije uneseno'),
        escapeCSV(e.program?.naziv || 'Nije uneseno'),
        escapeCSV(e.mentor?.ime ? `${e.mentor.ime} ${e.mentor.prezime}` : 'Nije uneseno'),
        escapeCSV(e.agreementAccepted ? 'Potvrđeno' : 'Nije potvrđeno'),
        escapeCSV(e.agreementAcceptedAt ? new Date(e.agreementAcceptedAt).toLocaleDateString('hr-HR') : 'Nije potvrđeno'),
        escapeCSV(selectedYear)
      ].join(';'))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Create and download file
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `upisi-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <NavigacijaAdmin otvoreno="enrollments" />
    <NavTopAdministracija naslov="Upisi u šk. god." />
    <div className="main">
    <div className="signup-container">
      <h2>Upisi - Pregled školske godine</h2>
      <div className="form-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="form-group" style={{ minWidth: 200 }}>
          <input
            type="text"
            className="form-group-input"
            placeholder="Pretraži po imenu ili emailu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ minWidth: 150 }}>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
            <option value="2027/2028">2027/2028</option>
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 150 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="active">Aktivni</option>
            <option value="inactive">Neaktivni</option>
            <option value="all">Svi</option>
          </select>
        </div>
        <button className="submit-btn" onClick={handleExport} style={{ minWidth: 120 }}>
          <Icon icon="solar:download-broken" /> Export CSV
        </button>
      </div>
      
    </div>
      {loading ? (
        <div>Učitavanje...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="tablica">
          <div className="tr naziv">
            <div className="th">Ime i prezime</div>
            <div className="th">Email</div>
            <div className="th mobile-none">Škola</div>
            <div className="th mobile-none">Program</div>
            <div className="th mobile-none">Mentor</div>
            <div className="th">Status</div>
            <div className="th mobile-none">Datum potvrde</div>
          </div>
          {filtered.length === 0 ? (
            <div className="karticaZadatka">
              <p>{searchTerm ? 'Nema rezultata za pretragu!' : 'Nema upisa u bazi!'}</p>
            </div>
          ) : (
            filtered.map(e => (
              <div
                className={`tr redak ${!e.active ? 'inactive' : ''}`}
                key={e.id}
                style={{ background: e.active ? 'inherit' : 'rgba(248, 215, 218, 0.3)' }}
              >
                <div className="th">{e.user?.ime} {e.user?.prezime}</div>
                <div className="th">{e.user?.email}</div>
                <div className="th mobile-none">{e.school?.name || 'Nije uneseno'}</div>
                <div className="th mobile-none">{e.program?.naziv || 'Nije uneseno'}</div>
                <div className="th mobile-none">
                  {e.mentor?.ime ? `${e.mentor.ime} ${e.mentor.prezime}` : 'Nije uneseno'}
                </div>
                <div className="th">
                  <span className={`status-badge ${e.agreementAccepted ? 'confirmed' : 'pending'}`}>
                    {e.agreementAccepted ? 'Potvrđeno' : 'Nije potvrđeno'}
                  </span>
                </div>
                <div className="th mobile-none">
                  {e.agreementAcceptedAt ? new Date(e.agreementAcceptedAt).toLocaleDateString('hr-HR') : 'Nije potvrđeno'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default EnrollmentDashboard; 