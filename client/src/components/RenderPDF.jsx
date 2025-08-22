import React, { useState, useEffect, useRef } from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { generateHUB3AString } from '../utils/paymentUtils';
import { invoiceStyles as styles } from '../styles/invoice-style';
import generateBarcode from "pdf417";

const RenderPDF = ({ invoice, school, student, program, onReady, onProgress }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [pdf417Url, setPdf417Url] = useState(null);
  const [logoDataUri, setLogoDataUri] = useState(null);
  const [logoLoadingError, setLogoLoadingError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [createdAt, setCreatedAt] = useState(null);

  useEffect(() => {
    let mounted = true;

    const generateBarcodes = async () => {
      if (!school?.iban || !invoice?.amount) {
        console.error('Missing required data:', { iban: school?.iban, amount: invoice?.amount });
        return;
      }

      try {
        if (mounted) {
          onProgress?.(10);
          console.log('Progress: 10%');
        }

        const paymentData = {
          amount: invoice.amount,
          invoiceNumber: invoice.invoiceNumber,
          iban: school.iban,
          studentName: `${student?.ime || ''} ${student?.prezime || ''}`,
          purpose: `Školarina za ${invoice.month}/${invoice.year}`
        };

        if (mounted) {
          onProgress?.(20);
          console.log('Progress: 20% - Payment data prepared');
        }

        const hub3aString = generateHUB3AString(paymentData, school);

        console.log('Generated HUB3A string:', hub3aString);

        if (mounted) {
          onProgress?.(40);
          console.log('Progress: 40% - HUB3A string generated');
        }

        // Generate QR Code
        let tempQrUrl = null;

        try {
          console.log('Generating QR code...');
          const qrData = [
            'www.e-URA.hr',
            '01',
            'MUSIC ART INCUBATOR d.o.o.',
            '61044880248',
            (school?.iban || '').replace(/\s/g, ''),
            `91-${invoice.invoiceNumber}`,
            '3',
            `${student?.ime || ''} ${student?.prezime || ''}`.trim(),
            student?.oib || '',
            new Date().toLocaleDateString('hr-HR').replace(/\./g, ''),
            `${invoice.invoiceNumber}/1/1`,
            new Date(invoice?.dueDate).toLocaleDateString('hr-HR').replace(/\./g, ''),
            invoice.amount.toFixed(2),
            '0.00',
            '0.00',
            '0.00',
            '0.00',
            '0.00',
            '0.00',
            '0.00',
            invoice.amount.toFixed(2),
            '0.00'
          ].join('\n');

          tempQrUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            margin: 4,
            width: 200,
            color: { dark: '#000000', light: '#ffffff' }
          });
          console.log('QR code generated successfully');
        } catch (err) {
          console.error('QR generation failed:', err);
        }

        if (mounted) {
          onProgress?.(60);
          console.log('Progress: 60% - QR code generated');
        }

        // Generate PDF417
        try {
          console.log('Generating PDF417 barcode...');
          const barcodeUrl = generateBarcode(hub3aString, 5, 2);
          setPdf417Url(barcodeUrl);
        } catch (err) {
          console.error('PDF417 generation failed:', err);
          setPdf417Url(null);
        }

        if (mounted) {
          console.log('Setting final states...');
          onProgress?.(80);
          setQrCodeUrl(tempQrUrl);
          setIsReady(true);
          onProgress?.(100);
          console.log('Progress: 100% - All states set');
          onReady?.(tempQrUrl, tempQrUrl);
        }
      } catch (error) {
        console.error('Error in generateBarcodes:', error);
        if (mounted) {
          setIsReady(true);
          onReady?.();
        }
      }
    };

    generateBarcodes();
    return () => {
      mounted = false;
    };
  }, [invoice, school, student, onReady, onProgress]);

  useEffect(() => {
    // Set createdAt to current date/time when component mounts
    setCreatedAt(new Date());
  }, []);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { default: logo } = await import('../assets/MAI Logo.png');
        setLogoDataUri(logo);
        setLogoLoadingError(null);
      } catch (error) {
        console.error('Failed to load logo:', error);
        setLogoLoadingError(error);
        setLogoDataUri(null);
      }
    };

    loadImage();
  }, []);

  const studentAddress = student?.adresa || {};
  const schoolAddress = school?.adresa || {};

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getMonthName = (monthNum) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString('hr-HR', { month: 'long' });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.schoolInfo}>
            <View style={styles.logoContainer}>
              {logoDataUri && (
                <Image
                  src={logoDataUri}
                  style={styles.logo}
                  cache={false}
                />
              )}
            </View>
            <Text style={styles.schoolName}>{school?.companyName || ''}</Text>
            <Text style={styles.schoolAddress}>{schoolAddress?.address || ''}</Text>
            <Text style={styles.schoolAddress}>{schoolAddress?.city || ''}</Text>
            <Text style={styles.schoolAddress}>{schoolAddress?.postalCode || ''}</Text>
            <Text style={styles.schoolDetails}>OIB: {school?.oib || ''}</Text>
          </View>

          {/* Invoice Info with QR Code */}
          <View style={styles.invoiceInfo}>
            <View>
              <Text style={styles.invoiceTitle}>RAČUN br. {invoice?.invoiceNumber}</Text>
              <Text style={styles.invoiceDetails}>Datum isporuke: {formatDate(createdAt)}</Text>
              <Text style={styles.invoiceDetails}>Dospijeće: {formatDate(invoice?.dueDate)}</Text>
            </View>
            {qrCodeUrl && (
              <View style={styles.qrCodeContainer}>
                <Image src={qrCodeUrl} style={styles.qrCode} cache={false} />
                <Text style={styles.qrCodeLabel}>QR kod za plaćanje</Text>
              </View>
            )}
          </View>
        </View>

        {/* Student Info */}
        <View style={styles.studentInfo}>
          <Text style={styles.sectionTitle}>PRIMATELJ:</Text>
          <Text style={styles.studentName}>{student?.ime || ''} {student?.prezime || ''}</Text>
          <Text style={styles.studentAddress}>
            {studentAddress?.ulica || ''} {studentAddress?.kucniBroj || ''}{studentAddress?.mjesto ? `, ${studentAddress.mjesto}` : ''}
          </Text>
          <Text style={styles.studentAddress}>OIB: {student?.oib || ''}</Text>
        </View>

        {/* Program Details */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { flexDirection: 'row' }]}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Naziv usluge</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>J.mj.</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>Cijena</Text>
          </View>
          <View style={[styles.tableRow, { flexDirection: 'row' }]}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Program {(program?.naziv || '').toUpperCase()}</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>KOM</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{Number(invoice?.amount || 0).toFixed(2)} EUR</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.total}>
          <Text style={styles.totalAmount}>Ukupno za platiti: {Number(invoice?.amount || 0).toFixed(2)} EUR</Text>
        </View>

        {/* Payment Details and PDF417 Barcode */}
        <View style={[styles.footer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
          <View style={styles.paymentInfo}>
            <Text style={styles.sectionTitle}>Način plaćanja</Text>
            <Text style={styles.text}>Transakcijski račun</Text>
            <Text style={styles.text}>IBAN: {school?.iban || ''}</Text>
            <Text style={styles.text}>Model i poziv na broj: {invoice?.invoiceNumber || ''}</Text>
            <Text style={styles.text}>Svrha: Školarina za {getMonthName(invoice?.month)} {invoice?.year}</Text>
          </View>
          {pdf417Url && (
            <View style={styles.pdf417Container}>
              <Image src={pdf417Url} style={styles.pdf417} cache={false} />
              <Text style={styles.barcodeLabel}>2D barkod za plaćanje</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default RenderPDF;