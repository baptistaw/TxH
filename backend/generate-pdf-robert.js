const pdfService = require('./src/services/pdfService');
const fs = require('fs');
const path = require('path');

const CASE_ID = 'cmi4pswrq02t1u2jhwm18n4n5'; // Robert Guillen

(async () => {
  try {
    console.log('Generando PDF para Robert Guillen...');
    console.log('Case ID:', CASE_ID);

    // Generar PDF
    const pdfBuffer = await pdfService.generateCasePDF(CASE_ID);

    // Guardar en descargas
    const outputPath = '/home/william-baptista/Descargas/robert_guillen_NUEVO_TEST.pdf';
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log('\n✅ PDF generado exitosamente!');
    console.log('📁 Ubicación:', outputPath);
    console.log('📏 Tamaño:', (pdfBuffer.length / 1024).toFixed(2), 'KB');

  } catch (error) {
    console.error('\n❌ Error generando PDF:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
})();
