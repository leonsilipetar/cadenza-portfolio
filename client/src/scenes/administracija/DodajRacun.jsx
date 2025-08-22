import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import './DodajRacun.css';

const DodajRacun = ({ students = [], programs = [], onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    programId: '',
    month: new Date().toLocaleString('hr-HR', { month: 'long' }).toLowerCase(),
    year: new Date().getFullYear(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2>Generiraj novi račun</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Učenik:</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
            >
              <option value="">Odaberi učenika</option>
              {Array.isArray(students) && students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.ime} {student.prezime}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Program:</label>
            <select
              value={formData.programId}
              onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
              required
            >
              <option value="">Odaberi program</option>
              {Array.isArray(programs) && programs.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.naziv} - {program.tip} ({program.cijena} EUR)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Mjesec:</label>
            <select
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              required
            >
              {[
                'siječanj', 'veljača', 'ožujak', 'travanj',
                'svibanj', 'lipanj', 'srpanj', 'kolovoz',
                'rujan', 'listopad', 'studeni', 'prosinac'
              ].map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Godina:</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min={2000}
              max={2100}
              required
            />
          </div>

          <div className="button-group">
            <button type="submit" className="gumb">
              <Icon icon="solar:file-check-broken" /> Generiraj račun
            </button>
            <button type="button" className="gumb cancel" onClick={onCancel}>
              <Icon icon="solar:close-circle-broken" /> Odustani
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DodajRacun;
