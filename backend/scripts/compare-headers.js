const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function compareHeaders() {
  console.log('\n=== COMPARANDO HEADERS DE HOJAS INTRAOP ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const sheets = [
    'IntraopInducc',
    'IntraopDisec',
    'IntraopAnhep',
    'IntraopPreReperf',
    'IntraopPostRepef',
    'IntropFinVB',
    'IntraopCierre'
  ];

  for (const sheetName of sheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      console.log(`⚠️  ${sheetName}: No encontrada`);
      continue;
    }

    const headerRow = sheet.getRow(1);
    const labHeaders = {};

    console.log(`\n📄 ${sheetName}:`);

    // Buscar columnas de laboratorio específicas
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().toLowerCase();

      if (header && (
        header.includes('hb') && !header.includes('hco3') ||
        header === 'hto' ||
        header.includes('na+') ||
        header.includes('k+') ||
        header.includes('lactato') ||
        header === 'ph' ||
        header.includes('plaquetas') ||
        header.includes('fibrinogeno')
      )) {
        labHeaders[cell.value] = colNumber;
      }
    });

    // Mostrar posiciones de columnas importantes
    console.log('  Laboratorios:');
    for (const [name, col] of Object.entries(labHeaders)) {
      console.log(`    Col ${col}: ${name}`);
    }
  }
}

compareHeaders().catch(console.error);
