const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');

/**
 * Split a PDF buffer into individual page buffers
 * @param {Buffer} pdfBuffer - The input PDF buffer
 * @returns {Promise<Buffer[]>} Array of buffers, one for each page
 */
const splitPdfIntoPages = async (pdfBuffer) => {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pages = [];

    // Create a new document for each page
    for (let i = 0; i < pageCount; i++) {
      const newPdfDoc = await PDFDocument.create();
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(copiedPage);
      const pageBuffer = await newPdfDoc.save();
      pages.push(Buffer.from(pageBuffer));
    }

    return pages;
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw new Error('Failed to split PDF into pages');
  }
};

/**
 * Extract OIB from PDF text content
 * @param {Buffer} pdfBuffer - The input PDF buffer
 * @returns {Promise<string|null>} Extracted OIB or null if not found
 */
const extractOibFromPdf = async (pdfBuffer) => {
  try {
    // Parse PDF to text
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Debug: Log the extracted text
    console.log('Extracted text:', text);

    // Look specifically for OIB after PRIMATELJ section
    const primateljSection = text.split('PRIMATELJ:')[1];
    if (!primateljSection) {
      console.log('No PRIMATELJ section found');
      return null;
    }

    // Find OIB in PRIMATELJ section
    const oibPattern = /OIB:\s*(\d{11})/;
    const match = primateljSection.match(oibPattern);

    if (!match) {
      console.log('No OIB found in PRIMATELJ section');
      return null;
    }

    const studentOib = match[1];
    console.log('Found student OIB:', studentOib);
    return studentOib;
  } catch (error) {
    console.error('Error extracting OIB:', error);
    return null;
  }
};

module.exports = {
  splitPdfIntoPages,
  extractOibFromPdf
}; 