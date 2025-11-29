const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function readRow() {
  console.log('\n=== LEYENDO FILA 273 DE IntraopPostRepef ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const sheet = workbook.getWorksheet('IntraopPostRepef');

  if (!sheet) {
    console.log('No se encontró la hoja IntraopPostRepef');
    return;
  }

  // Leer header
  const headerRow = sheet.getRow(1);
  console.log('HEADERS:');
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= 30) { // Mostrar primeras 30 columnas
      console.log(`  Col ${colNumber}: ${cell.value}`);
    }
  });

  // Leer fila 273
  const row273 = sheet.getRow(273);
  console.log('\n\nFILA 273:');
  console.log('='.repeat(80));

  const values = {};
  row273.eachCell((cell, colNumber) => {
    if (colNumber <= 30) {
      const header = headerRow.getCell(colNumber).value || `Col${colNumber}`;
      console.log(`  ${header}: ${cell.value}`);
      values[header] = cell.value;
    }
  });

  // Parsear la fecha de la columna "Fecha"
  const fechaRaw = row273.getCell(3).value; // Columna "Fecha"

  let fecha = null;
  if (typeof fechaRaw === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    fecha = new Date(excelEpoch.getTime() + fechaRaw * 86400 * 1000);
  } else if (fechaRaw instanceof Date) {
    fecha = fechaRaw;
  }

  console.log('\n\nFECHA PARSEADA:');
  console.log(`  Raw value: ${fechaRaw} (type: ${typeof fechaRaw})`);
  console.log(`  Parsed: ${fecha ? fecha.toISOString() : 'NULL'}`);
  console.log(`  Hora local Uruguay: ${fecha ? fecha.toLocaleString('es-UY', { timeZone: 'America/Montevideo' }) : 'NULL'}`);

  // Leer datos de laboratorio
  console.log('\n\nDATOS DE LABORATORIO (si disponibles):');
  console.log(`  Hb (Col 65): ${row273.getCell(65).value}`);
  console.log(`  Hto (Col 66): ${row273.getCell(66).value}`);
  console.log(`  Na+ (Col 67): ${row273.getCell(67).value}`);
  console.log(`  K+ (Col 68): ${row273.getCell(68).value}`);
  console.log(`  Ca++ (Col 69): ${row273.getCell(69).value}`);
  console.log(`  pH (Col 70): ${row273.getCell(70).value}`);
  console.log(`  Lactato (Col 76): ${row273.getCell(76).value}`);
  console.log(`  Plaquetas (Col 83): ${row273.getCell(83).value}`);
  console.log(`  Fibrinogeno (Col 84): ${row273.getCell(84).value}`);
}

readRow().catch(console.error);
