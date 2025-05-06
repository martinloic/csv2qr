const fs = require('fs');
const csv = require('csv-parser');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');

// Lire le fichier CSV
const csvFilePath = 'data.csv'; // Chemin vers votre fichier CSV
const qrData = [];

fs.createReadStream(csvFilePath)
  .pipe(csv({ separator: ';' })) // Utiliser le séparateur ';' pour le CSV
  .on('data', (row) => {
    if (row.code && typeof row.code === 'string' && row.zone && typeof row.zone === 'string') {
      qrData.push({ code: row.code, zone: row.zone });
    } else {
      console.warn('Ligne CSV invalide ou colonne manquante:', row);
    }
  })
  .on('end', async () => {
    if (qrData.length > 0) {
      try {
        await generatePDF(qrData);
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
      }
    } else {
      console.error('Aucune donnée valide trouvée dans le fichier CSV.');
    }
  });

// Générer un PDF avec les QR codes
async function generatePDF(qrData) {
  const doc = new PDFDocument({
    size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
    margin: 10
  });
  const pdfFilePath = path.join(__dirname, 'outputnew.pdf'); // Chemin du fichier PDF à la racine
  const writeStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(writeStream);

  let yPosition = 10;
  const qrCodeSize = 100;
  const maxQRPerPage = 4;

  for (let index = 0; index < qrData.length; index++) {
    const { code, zone } = qrData[index];
    const url = await QRCode.toDataURL(code);

    // Vérifier si on doit ajouter une nouvelle page
    if (index > 0 && index % maxQRPerPage === 0) {
      doc.addPage({
        size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
        margin: 10
      });
      yPosition = 10;
    }

    doc.moveTo(10, yPosition)
    .lineTo(273.46, yPosition)
    .dash(5, { space: 8 })
    .stroke();

    // Ajouter le QR code et le texte
    doc.image(url, 10, yPosition, { width: qrCodeSize });
    doc.font('Helvetica-Bold');
    doc.fontSize(33).text(code, 110, yPosition + 31, { width: 150, align: 'left' });
    doc.font('Helvetica');

    // Ajouter la zone sous le code
    doc.fontSize(12).text(`ZONE : ${zone}`, 110, yPosition + 60, { width: 150, align: 'left' });

    // Ajouter une ligne en pointillés sous le QR code et le texte
    doc.moveTo(10, yPosition + qrCodeSize)
       .lineTo(273.46, yPosition + qrCodeSize)
       .dash(5, { space: 8 })
       .stroke();

    // Mettre à jour la position y pour la ligne suivante
    yPosition += qrCodeSize; // Ajout de 20 pour inclure la hauteur du texte de la zone
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
