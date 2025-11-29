// scripts/get-clinician-157194-name.js
const ExcelJS = require('exceljs');

async function getName() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Porcedimientos');

    console.log('🔍 Buscando registros con clinician ID 157194:\n');

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const anest1 = row.getCell(5).value;
      const anest2 = row.getCell(6).value;

      const anest1Str = anest1 ? String(anest1) : '';
      const anest2Str = anest2 ? String(anest2) : '';

      if (anest1Str.includes('157194') || anest2Str.includes('157194')) {
        console.log(`Fila ${i}:`);
        console.log(`  Anestesista1: ${anest1}`);
        console.log(`  Anestesista2: ${anest2}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getName();
