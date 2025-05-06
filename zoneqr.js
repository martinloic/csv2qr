const fs = require('fs');
const csv = require('csv-parser');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');

// Read the CSV file
const csvFilePath = 'data.csv'; // Path to your CSV file
const qrData = [];

fs.createReadStream(csvFilePath)
  .pipe(csv({ separator: ';' })) // Use ';' as the separator for the CSV
  .on('data', (row) => {
    if (row.code && typeof row.code === 'string' && row.zone && typeof row.zone === 'string') {
      qrData.push({ code: row.code, zone: row.zone });
    } else {
      console.warn('Invalid CSV row or missing column:', row);
    }
  })
  .on('end', async () => {
    if (qrData.length > 0) {
      try {
        await generatePDF(qrData);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    } else {
      console.error('No valid data found in the CSV file.');
    }
  });

// Generate a PDF with QR codes
async function generatePDF(qrData) {
  const doc = new PDFDocument({
    size: [283.46, 425.2], // Dimensions in points (10 cm x 15 cm)
    margin: 10
  });
  const pdfFilePath = path.join(__dirname, 'outputnew.pdf'); // Path for the PDF file
  const writeStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(writeStream);

  let yPosition = 10;
  const qrCodeSize = 100;
  const maxQRPerPage = 4;

  for (let index = 0; index < qrData.length; index++) {
    const { code, zone } = qrData[index];
    const url = await QRCode.toDataURL(code);

    // Check if a new page should be added
    if (index > 0 && index % maxQRPerPage === 0) {
      doc.addPage({
        size: [283.46, 425.2], // Dimensions in points (10 cm x 15 cm)
        margin: 10
      });
      yPosition = 10;
    }

    doc.moveTo(10, yPosition)
       .lineTo(273.46, yPosition)
       .dash(5, { space: 8 })
       .stroke();

    // Add the QR code and text
    doc.image(url, 10, yPosition, { width: qrCodeSize });
    doc.font('Helvetica-Bold');
    doc.fontSize(33).text(code, 110, yPosition + 31, { width: 150, align: 'left' });
    doc.font('Helvetica');

    // Add the zone below the code
    doc.fontSize(12).text(`ZONE: ${zone}`, 110, yPosition + 60, { width: 150, align: 'left' });

    // Add a dotted line below the QR code and text
    doc.moveTo(10, yPosition + qrCodeSize)
       .lineTo(273.46, yPosition + qrCodeSize)
       .dash(5, { space: 8 })
       .stroke();

    // Update the y position for the next line
    yPosition += qrCodeSize; // Add 20 to include the height of the zone text
  }

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('PDF generated successfully:', pdfFilePath);
      resolve();
    });
    writeStream.on('error', reject);
  });
}
