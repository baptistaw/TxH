const ExcelJS = require('exceljs');
const path = require('path');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function analyzeExcel() {
  console.log('\n=== ANALIZANDO EXCEL - TRASPLANTE 30-04-24 ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  // Los registros intraop están en hojas separadas por fase
  const intraopSheetNames = [
    'IntraopInducc',
    'IntraopDisec',
    'IntraopAnhep',
    'IntraopPreReperf',
    'IntraopPostRepef',
    'IntropFinVB',
    'IntraopCierre'
  ];

  const records35702396 = [];
  const records20193126 = [];

  // Buscar en cada hoja de intraop
  for (const sheetName of intraopSheetNames) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      console.log(`⚠️  Hoja ${sheetName} no encontrada`);
      continue;
    }

    console.log(`\nAnalizando hoja: ${sheetName} (${sheet.rowCount} filas)`);

    // Mostrar primeras 3 filas como ejemplo
    let sampleCount = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        console.log('  HEADER:', row.values);
        return;
      }
      if (sampleCount < 3) {
        const ci = row.getCell(1).value;
        const fecha = row.getCell(2).value;
        console.log(`  Ejemplo fila ${rowNumber}: CI="${ci}" (type: ${typeof ci}), Fecha="${fecha}" (type: ${typeof fecha})`);
        sampleCount++;
      }
    });

    let count35702396 = 0;
    let count20193126 = 0;

    // Buscar registros del 30-04-24
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Las columnas son: 1=FechaT, 2=CI, 3=Fecha
      const ciRaw = row.getCell(2).value; // CI está en columna 2
      const ci = ciRaw?.toString().trim();
      const fechaHora = row.getCell(3).value; // Fecha está en columna 3

      // Convertir fecha
      let fecha = null;
      if (fechaHora instanceof Date) {
        fecha = fechaHora;
      } else if (typeof fechaHora === 'string') {
        fecha = new Date(fechaHora);
      } else if (typeof fechaHora === 'number') {
        // Excel date serial number
        fecha = new Date((fechaHora - 25569) * 86400 * 1000);
      }

      if (fecha && !isNaN(fecha.getTime())) {
        const dia = fecha.getDate();
        const mes = fecha.getMonth(); // 0-indexed, April = 3
        const anio = fecha.getFullYear();

        if (dia === 30 && mes === 3 && anio === 2024) { // April = month 3
          const record = {
            rowNumber,
            sheet: sheetName,
            ci,
            fechaHora: fecha,
            // Extraer otros datos relevantes de la fila
            // Según el header: FC (col 12), SatO2 (col 13), PAS (col 14), PAD (col 15), PAm (col 16)
            hr: row.getCell(12).value, // FC
            satO2: row.getCell(13).value,
            pas: row.getCell(14).value, // PAS
            pad: row.getCell(15).value, // PAD
            pam: row.getCell(16).value  // PAm
          };

          if (ci === '35702396') {
            records35702396.push(record);
            count35702396++;
          } else if (ci === '20193126') {
            records20193126.push(record);
            count20193126++;
          }
        }
      }
    });

    if (count35702396 > 0 || count20193126 > 0) {
      console.log(`  ✓ Encontrados: ${count35702396} registros de CI 35702396, ${count20193126} registros de CI 20193126`);
    }
  }

  console.log(`\n📊 REGISTROS ENCONTRADOS EN EL EXCEL:`);
  console.log(`CI 35702396 (Nilda Godoy): ${records35702396.length} registros`);
  console.log(`CI 20193126 (Rubén Ramirez): ${records20193126.length} registros`);

  // Mostrar registros de Nilda Godoy
  if (records35702396.length > 0) {
    console.log(`\n\n=== REGISTROS DE NILDA GODOY (35702396) ===`);
    console.log(`Total: ${records35702396.length} registros\n`);

    records35702396.sort((a, b) => a.fechaHora - b.fechaHora);

    console.log('Primeros 10 registros:');
    for (let i = 0; i < Math.min(10, records35702396.length); i++) {
      const r = records35702396[i];
      console.log(`Fila ${r.rowNumber}: ${r.fechaHora.toISOString()} - HR: ${r.hr}, PAS: ${r.pas}, PAM: ${r.pam}`);
    }

    console.log(`\nÚltimos 5 registros:`);
    for (let i = Math.max(0, records35702396.length - 5); i < records35702396.length; i++) {
      const r = records35702396[i];
      console.log(`Fila ${r.rowNumber}: ${r.fechaHora.toISOString()} - HR: ${r.hr}, PAS: ${r.pas}, PAM: ${r.pam}`);
    }

    console.log(`\nRango de tiempo:`);
    console.log(`Primer registro: ${records35702396[0].fechaHora.toISOString()}`);
    console.log(`Último registro: ${records35702396[records35702396.length - 1].fechaHora.toISOString()}`);
  }

  // Mostrar registros de Rubén Ramirez
  if (records20193126.length > 0) {
    console.log(`\n\n=== REGISTROS DE RUBÉN RAMIREZ (20193126) ===`);
    console.log(`Total: ${records20193126.length} registros\n`);

    records20193126.sort((a, b) => a.fechaHora - b.fechaHora);

    console.log('Todos los registros:');
    for (const r of records20193126) {
      console.log(`Fila ${r.rowNumber}: ${r.fechaHora.toISOString()} - HR: ${r.hr}, PAS: ${r.pas}, PAM: ${r.pam}`);
    }

    console.log(`\nRango de tiempo:`);
    console.log(`Primer registro: ${records20193126[0].fechaHora.toISOString()}`);
    console.log(`Último registro: ${records20193126[records20193126.length - 1].fechaHora.toISOString()}`);
  }
}

analyzeExcel()
  .catch(console.error);
