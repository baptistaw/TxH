const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function findData() {
  console.log('\n=== BUSCANDO REGISTROS 30-04-24 EN EXCEL ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const sheetName = 'IntraopDisec'; // Empezamos con Disección
  const sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    console.log('No se encontró la hoja');
    return;
  }

  console.log(`Analizando hoja: ${sheetName}`);
  console.log(`Total filas: ${sheet.rowCount}\n`);

  let found35702396 = [];
  let found20193126 = [];

  // Buscar por cada fila
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const ci = row.getCell(2).value; // Columna CI
    const fechaRaw = row.getCell(3).value; // Columna Fecha

    // Convertir CI a string
    let ciStr = null;
    if (ci !== null && ci !== undefined) {
      let rawStr = '';
      if (typeof ci === 'object' && ci.result !== undefined) {
        rawStr = ci.result.toString().trim();
      } else {
        rawStr = ci.toString().trim();
      }
      // Extraer solo el CI (antes del ":")
      if (rawStr.includes(':')) {
        ciStr = rawStr.split(':')[0].trim();
      } else {
        ciStr = rawStr;
      }
    }

    // Intentar parsear fecha si es un número (serial date de Excel)
    let fecha = null;
    if (typeof fechaRaw === 'number') {
      // Convertir serial date de Excel a JavaScript Date
      // Excel fecha serial: días desde 1900-01-01 (con ajuste por bug de 1900)
      const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
      fecha = new Date(excelEpoch.getTime() + fechaRaw * 86400 * 1000);
    } else if (fechaRaw instanceof Date) {
      fecha = fechaRaw;
    } else if (typeof fechaRaw === 'string') {
      fecha = new Date(fechaRaw);
    }

    // Verificar si es del 30-04-24
    if (fecha && !isNaN(fecha.getTime())) {
      const dia = fecha.getDate();
      const mes = fecha.getMonth() + 1; // Ahora 1-indexed para comparar
      const anio = fecha.getFullYear();

      if (dia === 30 && mes === 4 && anio === 2024) {
        const record = {
          rowNumber,
          ci: ciStr,
          fecha: fecha.toISOString(),
          hr: row.getCell(12).value,
          pas: row.getCell(14).value
        };

        if (ciStr === '35702396') {
          found35702396.push(record);
        } else if (ciStr === '20193126') {
          found20193126.push(record);
        }

        // Mostrar TODOS los registros del 30-04-24 para debug
        const fechaTrasplante = row.getCell(1).value;
        console.log(`Fila ${rowNumber}: FechaT=${fechaTrasplante}, CI=${ciStr}, Fecha=${fecha.toISOString()}, HR=${row.getCell(12).value}, PAS=${row.getCell(14).value}`);
      }
    }
  });

  console.log(`\n\n📊 RESULTADOS:`);
  console.log(`Registros de CI 35702396: ${found35702396.length}`);
  console.log(`Registros de CI 20193126: ${found20193126.length}`);

  if (found35702396.length > 0) {
    console.log(`\nRegistros de 35702396:`);
    for (const r of found35702396) {
      console.log(`  Fila ${r.rowNumber}: ${r.fecha} - HR:${r.hr}, PAS:${r.pas}`);
    }
  }

  if (found20193126.length > 0) {
    console.log(`\nRegistros de 20193126:`);
    for (const r of found20193126) {
      console.log(`  Fila ${r.rowNumber}: ${r.fecha} - HR:${r.hr}, PAS:${r.pas}`);
    }
  }

  // Ahora buscar en todas las hojas
  console.log('\n\n=== BUSCANDO EN TODAS LAS HOJAS INTRAOP ===\n');

  const intraopSheets = [
    'IntraopInducc',
    'IntraopDisec',
    'IntraopAnhep',
    'IntraopPreReperf',
    'IntraopPostRepef',
    'IntropFinVB',
    'IntraopCierre'
  ];

  let total35702396 = 0;
  let total20193126 = 0;

  for (const sheetName of intraopSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    let count35702396 = 0;
    let count20193126 = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const ci = row.getCell(2).value;
      const fechaRaw = row.getCell(3).value;

      let ciStr = null;
      if (ci !== null && ci !== undefined) {
        let rawStr = '';
        if (typeof ci === 'object' && ci.result !== undefined) {
          rawStr = ci.result.toString().trim();
        } else {
          rawStr = ci.toString().trim();
        }
        // Extraer solo el CI (antes del ":")
        if (rawStr.includes(':')) {
          ciStr = rawStr.split(':')[0].trim();
        } else {
          ciStr = rawStr;
        }
      }

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

        if (dia === 30 && mes === 4 && anio === 2024) {
          if (ciStr === '35702396') {
            count35702396++;
          } else if (ciStr === '20193126') {
            count20193126++;
          }
        }
      }
    });

    if (count35702396 > 0 || count20193126 > 0) {
      console.log(`${sheetName}: CI 35702396=${count35702396}, CI 20193126=${count20193126}`);
    }

    total35702396 += count35702396;
    total20193126 += count20193126;
  }

  console.log(`\n📊 TOTALES:`);
  console.log(`CI 35702396 (Nilda Godoy): ${total35702396} registros`);
  console.log(`CI 20193126 (Rubén Ramirez): ${total20193126} registros`);
}

findData().catch(console.error);
