import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Icon } from '@iconify/react';

const InvoiceTemplate = ({ 
  invoice, 
  school, 
  student, 
  program, 
  selectedType,
  onTypeSelect,
  onSend, 
  onCancel 
}) => {
  return (
    <div className="popup">
      <div className="popup-content">
        <div className="popup-header">
          <h3>Pregled računa</h3>
          <button className="close-btn" onClick={onCancel}>
            <Icon icon="solar:close-circle-broken" />
          </button>
        </div>
        <div className="popup-body">
          <div className="preview-container">
            {/* Add program type selection */}
            <div className="program-type-selection">
              <label>Tip programa:</label>
              <select 
                value={selectedType || ''} 
                onChange={(e) => onTypeSelect(e.target.value)}
                required
              >
                <option value="">Odaberite tip programa</option>
                {program?.tipovi.map(({ tip, cijena }) => (
                  <option key={tip} value={tip}>
                    {tip === 'grupno' && 'Grupno'}
                    {tip === 'individualno1' && 'Individualno 1x tjedno'}
                    {tip === 'individualno2' && 'Individualno 2x tjedno'}
                    {tip === 'none' && 'Poseban program'}
                    {` (${cijena} EUR)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Rest of the invoice preview */}
            <div className="invoice-preview">
              <div className="header">
                <div className="school-info">
                  <h4>{school?.naziv}</h4>
                  <p>{school?.adresa}</p>
                  <p>OIB: {school?.oib}</p>
                </div>
                <div className="invoice-info">
                  <h4>RAČUN br. {invoice.invoiceNumber}</h4>
                  <p>Datum: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="student-info">
                <h4>{student?.ime} {student?.prezime}</h4>
                <p>{student?.adresa?.ulica} {student?.adresa?.kucniBroj}</p>
                <p>{student?.adresa?.mjesto}</p>
                <p>OIB: {student?.oib}</p>
              </div>
              <div className="program-info">
                <table>
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Tip</th>
                      <th>Razdoblje</th>
                      <th>Iznos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{program?.naziv}</td>
                      <td>
                        {selectedType === 'grupno' && 'Grupno'}
                        {selectedType === 'individualno1' && 'Individualno 1x tjedno'}
                        {selectedType === 'individualno2' && 'Individualno 2x tjedno'}
                        {selectedType === 'none' && 'Poseban program'}
                      </td>
                      <td>{invoice.month}/{invoice.year}</td>
                      <td>{invoice.amount} EUR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="popup-footer">
            <button className="action-btn zatvoriBtn" onClick={onCancel}>
                Zatvori
            </button>
            <button 
              className="action-btn spremiBtn" 
              onClick={onSend}
              disabled={!selectedType}
            >
              <Icon icon="solar:file-download-broken" /> Generiraj račun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate; 