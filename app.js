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
      console.warn('Ligne CSV invalide ou colonne "url" manquante:', row);
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
  
  
    qrCodes.forEach((text, index) => {
      QRCode.toDataURL(text, (err, url) => {
        if (err) {
          console.error('Erreur lors de la génération du QR code:', err);
          return;
        }
  
        // Vérifier si on doit ajouter une nouvelle page
        if (yPosition + 100 > doc.page.height - 10) {
          doc.addPage({
            size: [283.46, 425.2], // Dimensions en points (10 cm x 15 cm)
            margin: 10
          });
          yPosition = 20;
        }
  
        doc.image(url, 20, yPosition, { width: 100 });

        // Définir la police en gras
        doc.font('Helvetica-Bold');
        doc.fontSize(15).text(`${text}`, 130, yPosition + 20, { width: 120, align: 'left' });

        // Réinitialiser la police à la police par défaut
        doc.font('Helvetica');

        // doc.fontSize(15).text(text, 130, yPosition + 20, { width: 120, align: 'left' });

        doc.moveTo(10, yPosition)
           .lineTo(273.46, yPosition)
           .dash(5, { space: 5 })
           .stroke();
        // yPosition += 10;
        yPosition += 100;
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
  