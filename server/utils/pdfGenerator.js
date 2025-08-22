const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const PDF417 = require('pdf417-generator');
const { createCanvas } = require('canvas');
const path = require('path');

const generateInvoicePDF = async (invoice, invoiceSettings, student, program) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a new PDF document with UTF-8 encoding and embedded fonts
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        lang: 'hr-HR',
        autoFirstPage: true,
        info: {
          Title: `${invoice.type === 'članarina' ? 'Članarina' : 'Račun'}-${invoice.invoiceNumber}`,
          Author: invoiceSettings.nazivObrta,
          Subject: invoice.type === 'članarina' ? 'Članarina' : 'Račun',
          Producer: 'MAI System'
        },
        pdfVersion: '1.7',
        tagged: true,
        displayTitle: true,
        bufferPages: true
      });

      // Set UTF-8 encoding
      doc.info.Producer = 'MAI System (UTF-8)';
      doc.info.Encoding = 'UTF-8';

      // Register the new font
      doc.registerFont('Croatian', path.join(__dirname, 'fonts', 'HedvigLettersSans-Regular.ttf'));
      doc.font('Croatian');

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Format addresses
      const fullAddress = `${invoiceSettings.address}, ${invoiceSettings.postalCode} ${invoiceSettings.city}`;
      const studentAddress = student?.adresa ?
        `${student.adresa.ulica} ${student.adresa.kucniBroj}, ${student.adresa.mjesto}` :
        '';

      // QR Code Generation
      const qrData = [
        'www.e-URA.hr',
        '01',
        invoiceSettings.nazivObrta,
        invoiceSettings.oib,
        invoiceSettings.iban.replace(/\s/g, ''),
        `91-${invoice.invoiceNumber}`,
        '3',
        `${student?.ime || ''} ${student?.prezime || ''}`.trim(),
        student?.oib || '',
        new Date().toLocaleDateString('hr-HR').replace(/\./g, ''),
        `${invoice.invoiceNumber}/1/1`,
        new Date(invoice?.dueDate).toLocaleDateString('hr-HR').replace(/\./g, ''),
        (Number(invoice.amount) || 0).toFixed(2),
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        (Number(invoice.amount) || 0).toFixed(2),
        '0.00'
      ].join('\n');

      // Generate PDF417 barcode
      const pdf417Data = `HRVHUB30
EUR
${(Number(invoice.amount) || 0).toFixed(2)}
${(student?.ime || '').trim()} ${(student?.prezime || '').trim()}
${invoiceSettings.nazivObrta.trim()}
${invoiceSettings.address.trim()}
${invoiceSettings.postalCode.trim()} ${invoiceSettings.city.trim()}
${invoiceSettings.iban.replace(/\s/g, '')}
HR99
${invoice.invoiceNumber}
COST
${invoice.type === 'članarina' ? 'Članarina' : 'Račun'} za ${invoice.month}/${invoice.year}`;

      // Create canvas for PDF417 barcode
      const canvas = new createCanvas();
      PDF417.draw(pdf417Data, canvas);
      const pdf417Url = canvas.toDataURL();

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 200,
        scale: 8
      });

      // Calculate due date (15 days from issue date)
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 15);

      // Add content to PDF with absolute positioning
      const margin = 50;
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points

      // Title
      doc.fontSize(20)
         .text(`${invoice.type === 'članarina' ? 'ČLANARINA' : 'RAČUN'}`, margin, 50, { align: 'center', width: pageWidth - 2 * margin });

      // Invoice number and dates
      doc.fontSize(12)
         .text(`${invoice.type === 'članarina' ? 'ČLANARINA' : 'RAČUN'} br. ${invoice.invoiceNumber}`, pageWidth - margin - 200, 100, { width: 200, align: 'right' });
      doc.text(`Datum izdavanja: ${issueDate.toLocaleDateString('hr-HR')}`, pageWidth - margin - 200, 115, { width: 200, align: 'right' });
      doc.text(`Dospijeće: ${dueDate.toLocaleDateString('hr-HR')}`, pageWidth - margin - 200, 130, { width: 200, align: 'right' });

      // Company info
      doc.text(invoiceSettings.nazivObrta, margin, 100);
      doc.text(fullAddress, margin, 115);
      doc.text(`OIB: ${invoiceSettings.oib}`, margin, 130);
      doc.text(`IBAN: ${invoiceSettings.iban}`, margin, 145);

      // QR code
      doc.text(`QR kod za plaćanje`, margin, 180);
      doc.image(qrCodeUrl, margin, 200, { fit: [120, 120] });

      // Student info
      doc.text(`PRIMATELJ:`, margin, 330);
      doc.text(`${student?.ime || ''} ${student?.prezime || ''}`, margin, 345);
      if (studentAddress) {
        doc.text(studentAddress, margin, 360);
      }
      doc.text(`OIB: ${student?.oib || ''}`, margin, 375);

      // Table section
      doc.text(`STAVKE ${invoice.type === 'članarina' ? 'ČLANARINE' : 'RAČUNA'}`, margin, 410, { underline: true });
      doc.rect(margin, 430, pageWidth - 2 * margin, 25).fill('#f0f0f0').stroke();
      doc.fillColor('black');
      doc.text(`Naziv usluge`, margin + 10, 436);
      doc.text('J.mj.', margin + 300, 436);
      doc.text('Cijena', margin + 400, 436);

      // Table content - handle multiple programs
      let yPosition = 455;
      let totalAmount = 0;

      // Check if program is an array
      const programs = Array.isArray(program) ? program : [program];

      programs.forEach((prog, index) => {
        const programDesc = `${prog?.naziv || ''} ${prog.tip !== 'none' ? `(${prog.tip})` : ''}`;
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 25).stroke();
        doc.text(programDesc, margin + 10, yPosition + 6);
        doc.text(`KOM`, margin + 300, yPosition + 6);
        doc.text(`${(Number(prog.cijena) || 0).toFixed(2)} EUR`, margin + 400, yPosition + 6);

        totalAmount += Number(prog.cijena) || 0;
        yPosition += 25;
      });

      // Total section - moved down to account for multiple programs
      doc.rect(pageWidth - margin - 200, yPosition + 10, 200, 25).stroke();
      doc.text(`Ukupno za platiti:`, pageWidth - margin - 190, yPosition + 16);
      doc.text(`${totalAmount.toFixed(2)} EUR`, pageWidth - margin - 80, yPosition + 16);

      // Payment details - adjusted positions based on table height
      doc.text(`Način plaćanja`, margin, yPosition + 50, { underline: true });
      doc.text(`Transakcijski račun`, margin, yPosition + 65);
      doc.text(`IBAN: ${invoiceSettings.iban}`, margin, yPosition + 80);
      doc.text(`Model i poziv na broj: ${invoice.invoiceNumber}`, margin, yPosition + 95);
      doc.text(`Svrha: ${invoice.type === 'članarina' ? 'Članarina' : 'Račun'} za ${getMonthName(invoice.month)} ${invoice.year}`, margin, yPosition + 110);

      // PDF417 barcode - adjusted position
      doc.text('2D barkod za plaćanje', margin, yPosition + 140);
      doc.image(pdf417Url, margin, yPosition + 155, { fit: [250, 80] });

      // Footer - adjusted position
      doc.fontSize(8)
         .text(`${invoice.type === 'članarina' ? 'Članarina' : 'Račun'} je ${invoice.type === 'članarina' ? 'izdana' : 'izdan'} elektronički i pravovaljan${invoice.type === 'članarina' ? 'a' : ''} je bez žiga i potpisa.`,
               margin, pageHeight - 70, { align: 'center', width: pageWidth - 2 * margin });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to get month name in Croatian
function getMonthName(monthNumber) {
  const months = [
    'siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj',
    'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'
  ];
  return months[monthNumber - 1];
}

module.exports = {
  generateInvoicePDF
};