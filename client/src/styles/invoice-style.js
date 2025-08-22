// This needs to be a JavaScript file because React-PDF requires StyleSheet.create
import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
});

Font.register({
  family: 'Roboto-Bold',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf'
});

export const invoiceStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10, // Reduced font size
    fontFamily: 'Roboto',
    backgroundColor: 'white',
    color: 'black'
  },
  header: {
    marginBottom: 20, // Reduced margin
    borderBottom: '1 solid black',
    paddingBottom: 10 // Reduced padding
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 5 // Reduced margin
  },
  logo: {
    width: 80,  // Reduced logo size
    height: 'auto',
    marginBottom: 5 // Reduced margin
  },
  schoolInfo: {
    marginBottom: 5, // Reduced margin
    color: 'black'
  },
  schoolName: {
    fontSize: 14, // Reduced font size
    marginBottom: 3, // Reduced margin
    color: 'black',
    fontFamily: 'Roboto-Bold'
  },
  schoolAddress: {
    fontSize: 10, // Reduced font size
    marginBottom: 2, // Reduced margin
    color: 'black'
  },
  schoolDetails: {
    fontSize: 10, // Reduced font size
    marginBottom: 1, // Reduced margin
    color: 'black'
  },
  invoiceTitle: {
    fontSize: 12, // Reduced font size
    marginBottom: 5, // Reduced margin
    color: 'black'
  },
  invoiceDetails: {
    fontSize: 10, // Reduced font size
    marginBottom: 10 // Reduced margin
  },
  studentInfo: {
    marginBottom: 15, // Reduced margin
    marginTop: 5 // Reduced margin
  },
  studentName: {
    fontSize: 10, // Reduced font size
    marginBottom: 3, // Reduced margin
    color: 'black',
    fontFamily: 'Roboto-Bold'
  },
  studentAddress: {
    fontSize: 10, // Reduced font size
    color: 'black',
    marginTop: 1 // Reduced margin
  },
  section: {
    marginBottom: 10 // Reduced margin
  },
  sectionTitle: {
    fontSize: 10, // Reduced font size
    marginBottom: 3, // Reduced margin
    color: 'black'
  },
  programInfo: {
    marginBottom: 10 // Reduced margin
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3 // Reduced margin
  },
  label: {
    width: 80, // Reduced width
    fontWeight: 'bold'
  },
  value: {
    flex: 1
  },
  table: {
    marginTop: 10 // Reduced margin
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: 'black',
    backgroundColor: '#f5f5f5',
    padding: 5 // Reduced padding
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 5 // Reduced padding
  },
  tableCell: {
    flex: 1,
    padding: 3, // Reduced padding
    fontSize: 8 // Reduced font size
  },
  total: {
    marginTop: 15, // Reduced margin
    paddingTop: 5, // Reduced padding
    borderTopWidth: 1,
    borderTopColor: '#2C3E50',
    alignItems: 'flex-end'
  },
  totalAmount: {
    fontSize: 14, // Reduced font size
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: 'black',
    paddingTop: 20
  },
  paymentInfo: {
    marginTop: 10
  },
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  qrCodeContainer: {
    alignItems: 'flex-end',
    marginLeft: 20,
    marginTop: 20
  },
  qrCode: {
    width: 80,
    height: 80,
    marginBottom: 10
  },
  qrCodeLabel: {
    fontSize: 8, // Reduced font size
    textAlign: 'center',
    color: 'black'
  },
  period: {
    marginTop: 3, // Reduced margin
    fontSize: 10, // Reduced font size
    fontWeight: 'bold'
  },
  pdvInfo: {
    marginTop: 10, // Reduced margin
    padding: 5, // Reduced padding
    backgroundColor: '#f5f5f5'
  },
  legalNotice: {
    marginTop: 10, // Reduced margin
    padding: 5, // Reduced padding
    fontSize: 6 // Reduced font size
  },
  smallText: {
    fontSize: 6, // Reduced font size
    marginBottom: 3 // Reduced margin
  },
  barcodesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10, // Reduced margin
    paddingTop: 5, // Reduced padding
    borderTop: '1 solid black'
  },
  pdf417Container: {
    alignItems: 'flex-end',
    flex: 1
  },
  pdf417: {
    width: 150, // Reduced width
    height: 50, // Reduced height
    marginBottom: 5
  },
  barcodeLabel: {
    fontSize: 8, // Reduced font size
    textAlign: 'center',
    color: 'black'
  },
   invoiceInfo: {
    width: '50%',
    alignItems: 'flex-end',
    flexDirection: 'row', // Display in a row
    justifyContent: 'space-between'
  },
   invoiceInfoText: {  // Style for invoice info text
    textAlign: 'right',
    fontSize: 10 //Match Details
  },
  invoiceTitle: {
    fontSize: 12, // Reduced font size
    marginBottom: 5, // Reduced margin
    color: 'black',
  },
   page: {
    padding: 30,
    fontSize: 9, // Reduced font size
    fontFamily: 'Roboto',
    backgroundColor: 'white',
    color: 'black'
  },
   tableCell: {
    flex: 1,
    padding: 3, // Reduced padding
    fontSize: 8 // Reduced font size
  },
});