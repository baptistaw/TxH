const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function findRecord() {
  console.log('\n=== BUSCANDO REGISTRO DE 09:00 PARA CI 35702396 ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const intraopSheets = [
    'IntraopInducc',
    'IntraopDisec',
    'IntraopAnhep',
    'IntraopPreReperf',
    'IntraopPostRepef',
    'IntropFinVB',
    'IntraopCierre'
  ];

  // Buscar el registro de 09:00 (aprox) para CI 35702396
  const targetCI = '35702396';
  const targetHour = 9; // 09:00 AM

  for (const sheetName of intraopSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    console.log(`\nBuscando en hoja: ${sheetName}`);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const ciRaw = row.getCell(2).value;
      let ciStr = null;
      if (ciRaw !== null && ciRaw !== undefined) {
        let rawStr = ciRaw.toString().trim();
        if (rawStr.includes(':')) {
          ciStr = rawStr.split(':')[0].trim();
        } else {
          ciStr = rawStr;
        }
      }

      if (ciStr === targetCI) {
        const fechaRaw = row.getCell(3).value;
        let fecha = null;

        if (typeof fechaRaw === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          fecha = new Date(excelEpoch.getTime() + fechaRaw * 86400 * 1000);
        } else if (fechaRaw instanceof Date) {
          fecha = fechaRaw;
        }

        if (fecha && !isNaN(fecha.getTime())) {
          const dia = fecha.getDate();
          const mes = fecha.getMonth() + 1;
          const anio = fecha.getFullYear();
          const hora = fecha.getHours();
          const minutos = fecha.getMinutes();

          // Buscar registros del 30-04-2024 alrededor de las 09:00
          if (dia === 30 && mes === 4 && anio === 2024 && hora >= 9 && hora <= 10) {
            console.log(`\n  ✓ ENCONTRADO en fila ${rowNumber}:`);
            console.log(`    Fecha: ${fecha.toISOString()}`);
            console.log(`    Hora local: ${hora}:${minutos.toString().padStart(2, '0')}`);
            console.log(`    FC: ${row.getCell(12).value}`);
            console.log(`    PAS: ${row.getCell(14).value}`);
            console.log(`    Hb: ${row.getCell(65).value}`); // Columna Hb
            console.log(`    Na: ${row.getCell(68).value}`); // Columna Na+
            console.log(`    Lactato: ${row.getCell(77).value}`); // Columna Lactato
          }
        }
      }
    });
  }
}

findRecord().catch(console.error);
