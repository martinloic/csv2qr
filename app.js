const fs = require('fs');
const csv = require('csv-parser');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');

// Lire le fichier CSV
const csvFilePath = 'data.csv'; // Chemin vers votre fichier CSV
const qrCodes = [];

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    if (row.code && typeof row.code === 'string') {
      qrCodes.push(row.code);
    } else {
      console.warn('Ligne CSV invalide ou colonne "code" manquante:', row);
    }
  })
  .on('end', async () => {
    if (qrCodes.length > 0) {
      try {
        await generatePDF(qrCodes);
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
      }
    } else {
      console.error('Aucune donnée valide trouvée dans le fichier CSV.');
    }
  });

// Générer un PDF avec les QR codes
async function generatePDF(qrCodes) {
  const doc = new PDFDocument({
    size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
    margin: 10
  });
  const pdfFilePath = path.join(__dirname, 'output.pdf'); // Chemin du fichier PDF à la racine
  const writeStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(writeStream);

  let yPosition = 10;
  const qrCodeSize = 100;
  const maxQRPerPage = 4;

  for (let index = 0; index < qrCodes.length; index++) {
    const text = qrCodes[index];
    const url = await QRCode.toDataURL(text);

    // Vérifier si on doit ajouter une nouvelle page
    if (index > 0 && index % maxQRPerPage === 0) {
      doc.addPage({
        size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
        margin: 10
      });
      yPosition = 10;
    }

    // Ajouter le QR code et le texte
    doc.image(url, 10, yPosition, { width: qrCodeSize });
    doc.font('Helvetica-Bold');
    doc.fontSize(33).text(text, 110, yPosition + 36, { width: 150, align: 'left' });
    doc.font('Helvetica');

    // Ajouter une ligne en pointillés sous le QR code et le texte
    doc.moveTo(10, yPosition + qrCodeSize)
       .lineTo(273.46, yPosition + qrCodeSize)
       .dash(5, { space: 5 })
       .stroke();

    // Mettre à jour la position y pour la ligne suivante
    yPosition += qrCodeSize; // 50 pour inclure la hauteur du texte, la ligne en pointillés et une marge
  }

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('PDF généré avec succès:', pdfFilePath);
      resolve();
    });
    writeStream.on('error', reject);
  });
}
