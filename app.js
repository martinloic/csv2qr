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
    // Supposons que chaque ligne du CSV contient une URL ou un texte à encoder en QR code
    if (row.code && typeof row.code === 'string') {
      qrCodes.push(row.code); // Remplacez 'url' par le nom de la colonne appropriée
    } else {
      console.warn('Ligne CSV invalide ou colonne "code" manquante:', row);
    }
  })
  .on('end', () => {
    if (qrCodes.length > 0) {
      generatePDF(qrCodes);
    } else {
      console.error('Aucune donnée valide trouvée dans le fichier CSV.');
    }
  });

// Générer un PDF avec les QR codes
function generatePDF(qrCodes) {
  const doc = new PDFDocument({
    size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
    margin: 10
  });
  const pdfFilePath = path.join(__dirname, 'output.pdf'); // Chemin du fichier PDF à la racine
  const writeStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(writeStream);

  let qrCodesProcessed = 0;
  let yPosition = 10;
  const qrCodeSize = 100;
  const maxQRPerPage = 4;

  qrCodes.forEach((text, index) => {
    QRCode.toDataURL(text, (err, url) => {
      if (err) {
        console.error('Erreur lors de la génération du QR code:', err);
        return;
      }

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

      qrCodesProcessed++;

      if (qrCodesProcessed === qrCodes.length) {
        doc.end();
        writeStream.on('finish', () => {
          console.log('PDF généré avec succès:', pdfFilePath);
          // Vous pouvez ajouter ici le code pour imprimer le PDF si nécessaire
        });
      }
    });
  });
}
