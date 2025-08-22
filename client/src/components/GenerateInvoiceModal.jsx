import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { pdf } from '@react-pdf/renderer';
import RenderPDF from './RenderPDF';

const GenerateInvoiceModal = ({
  student,
  program,
  onGenerate,
  onCancel,
  invoiceSettings,
  previewInvoice,
  handleProgramTypeSelect,
  selectedType
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPercentage, setGeneratingPercentage] = useState(0);

  if (!student || !program || !invoiceSettings || !previewInvoice) {
    return null;
  }
  console.log("Data before GenerateInvoiceModal:", {
    student,
    program,
    invoiceSettings,
    previewInvoice,
    selectedType
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setGeneratingPercentage(0);

      if (!student || !program || !invoiceSettings || !previewInvoice) {
        throw new Error('Missing required data for invoice generation');
      }

      // Generate PDF blob
      const blob = await pdf(
        <RenderPDF
          invoice={previewInvoice}
          school={invoiceSettings}
          student={student}
          program={program}
        />
      ).toBlob();
      console.log('PDF blob generated');

      // Create form data
      const formData = new FormData();
      formData.append('pdfFile', blob, 'invoice.pdf');
      
      // Call the parent's onGenerate function
      await onGenerate(formData);
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setIsGenerating(false);
      setGeneratingPercentage(0);
    }
  };

  return (
    <div className="popup generate-invoice-modal">
      <div className="div div-clmn">
        <h3>Generiranje novog računa</h3>

        <div className="invoice-details">
          <div className="section">
            <h4>Podaci o učeniku</h4>
            <p><strong>Ime i prezime:</strong> {student.ime} {student.prezime}</p>
            <p><strong>OIB:</strong> {student.oib || 'Nije unesen'}</p>
            <p><strong>Adresa:</strong> {student.formattedAddress || 'Nije unesena'}</p>
            <p><strong>Email:</strong> {student.email}</p>
          </div>

          <div className="section">
            <h4>Program</h4>
            <p><strong>Naziv:</strong> {program.naziv}</p>
            <div className="program-types">
              <p><strong>Tip programa:</strong></p>
              <select
                id="programType"
                name="programType"
                value={selectedType || ''}
                onChange={(e) => handleProgramTypeSelect(e.target.value)}
                className="program-type-select"
              >
                <option value="">Odaberi tip</option>
                {program.tipovi?.map(tip => (
                  <option
                    key={tip.tip}
                    value={tip.tip}
                    style={tip.tip === student.programType?.[program.id] ? {
                      fontWeight: 'bold',
                      backgroundColor: 'var(--background-light)'
                    } : {}}
                  >
                    {tip.tip === 'grupno' ? 'Grupno' :
                     tip.tip === 'individualno1' ? 'Individualno 1x tjedno' :
                     tip.tip === 'individualno2' ? 'Individualno 2x tjedno' :
                     'Poseban program'} - {tip.cijena} EUR
                    {tip.tip === student.programType?.[program.id] ? ' (Zadano)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p><strong>Cijena:</strong> {previewInvoice?.amount || 0} EUR</p>
          </div>

          <div className="section">
            <h4>Postavke računa</h4>
            <p><strong>Rok plaćanja:</strong> {invoiceSettings?.paymentDue || '30'} dana</p>
            <p><strong>Način plaćanja:</strong> {invoiceSettings?.paymentMethod || 'Transakcijski račun'}</p>
            <p><strong>IBAN:</strong> {invoiceSettings?.iban}</p>
          </div>
        </div>

        <div className="div-radio">
          <button
            className="gumb action-btn zatvoriBtn"
            onClick={onCancel}
            disabled={isGenerating}
          >
            <Icon icon="solar:close-circle-broken" /> Odustani
          </button>
          <button
            className="gumb action-btn spremiBtn"
            onClick={handleGenerate}
            disabled={!selectedType || isGenerating}
          >
            <Icon icon="solar:file-check-broken" />
            {isGenerating
              ? `Generiranje... ${generatingPercentage.toFixed(0)}%`
              : 'Generiraj račun'
            }
          </button>
        </div>

        {isGenerating && (
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${generatingPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;