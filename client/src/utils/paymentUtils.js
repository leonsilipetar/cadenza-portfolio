export const generateHUB3AString = (paymentData, school) => {
  // Format amount to have exactly 2 decimal places
  const amountNum = parseFloat(paymentData.amount).toFixed(2);
  const amount = amountNum.replace('.', '');
  const paddedAmount = amount.padStart(15, '0');
  
  // Clean and format IBAN
  const iban = (school.iban || '').replace(/\s/g, '');
  
  // Format reference number
  const model = 'HR00';
  const reference = paymentData.invoiceNumber;
  
  // Payment purpose code
  const purposeCode = 'SCUL';
  
  // Clean and format recipient info
  const recipient = (school.name || '').substring(0, 25);
  const recipientAddress = (school.address || '').substring(0, 25);
  
  // Clean and format payer info
  const payer = paymentData.studentName.substring(0, 30);
  
  // Payment description
  const purpose = paymentData.purpose;
  
  // Construct HUB3A string
  return [
    'HRVHUB30',
    `EUR${paddedAmount}`,
    iban,
    `${model}${reference}`,
    purposeCode,
    recipient,
    recipientAddress,
    payer,
    '',  // Empty address line
    purpose
  ].join('\n');
}; 