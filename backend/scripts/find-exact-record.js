const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function findRecord() {
  console.log('\n=== BUSCANDO REGISTRO EXACTO 30-04-2024 09:00:22 (NILDA GODOY) ===\n');

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

  const targetCI = '35702396';

  // Buscar TODOS los registros de Nilda del 30-04-2024
  console.log('TODOS LOS REGISTROS DE NILDA GODOY (35702396) DEL 30-04-2024:\n');

  for (const sheetName of intraopSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    let foundInSheet = false;

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

          if (dia === 30 && mes === 4 && anio === 2024) {
            if (!foundInSheet) {
              console.log(`\n📄 HOJA: ${sheetName}`);
              foundInSheet = true;
            }

            const hora = fecha.getHours();
            const minutos = fecha.getMinutes();
            const segundos = fecha.getSeconds();

            console.log(`  Fila ${rowNumber}: ${fecha.toISOString()} (${hora}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')})`);
            console.log(`    FC: ${row.getCell(12).value}, PAS: ${row.getCell(14).value}, PAD: ${row.getCell(15).value}`);

            // Buscar datos de laboratorio
            const hb = row.getCell(65).value;
            const na = row.getCell(68).value;
            const lactato = row.getCell(77).value;

            if (hb || na || lactato) {
              console.log(`    Labs: Hb=${hb}, Na=${na}, Lactato=${lactato}`);
            }
          }
        }
      }
    });
  }

  // Ahora buscar específicamente el registro con los valores que conocemos del POST_REPERFUSION
  console.log('\n\n=== BUSCANDO REGISTRO CON Hb=7.2, Na=138, Lactato=2.1 ===\n');

  for (const sheetName of intraopSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

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

          if (dia === 30 && mes === 4 && anio === 2024) {
            const hb = parseFloat(row.getCell(65).value);
            const na = parseFloat(row.getCell(68).value);
            const lactato = parseFloat(row.getCell(77).value);

            // Buscar coincidencia con los valores conocidos
            if (Math.abs(hb - 7.2) < 0.01 && Math.abs(na - 138) < 0.01 && Math.abs(lactato - 2.1) < 0.01) {
              console.log(`\n🎯 ¡ENCONTRADO!`);
              console.log(`  HOJA: ${sheetName}`);
              console.log(`  Fila: ${rowNumber}`);
              console.log(`  Fecha: ${fecha.toISOString()}`);
              console.log(`  Hb: ${hb}, Na: ${na}, Lactato: ${lactato}`);
              console.log(`  FC: ${row.getCell(12).value}, SatO2: ${row.getCell(13).value}`);
            }
          }
        }
      }
    });
  }
}

findRecord().catch(console.error);
