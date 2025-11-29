// scripts/analyze-excel-procedures-clinician.js
const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcelClinician() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
    console.log('📊 Analizando Excel:', excelPath, '\n');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    // Buscar hoja de procedimientos/cirugías
    console.log('📋 Hojas disponibles:');
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.name} (${sheet.rowCount} filas)`);
    });
    console.log('');

    // Buscar hojas relacionadas con procedimientos
    const procedureSheets = workbook.worksheets.filter(sheet =>
      sheet.name.toLowerCase().includes('procedimiento') ||
      sheet.name.toLowerCase().includes('cirugia') ||
      sheet.name.toLowerCase().includes('quirurgico') ||
      sheet.name.toLowerCase().includes('intraop')
    );

    if (procedureSheets.length === 0) {
      console.log('⚠️  No se encontraron hojas de procedimientos. Mostrando todas las hojas:');

      for (const sheet of workbook.worksheets) {
        console.log(`\n📄 Hoja: ${sheet.name}`);
        console.log('Columnas:');

        const headerRow = sheet.getRow(1);
        const headers = [];
        headerRow.eachCell((cell, colNumber) => {
          headers.push({ col: colNumber, name: cell.value });
          console.log(`  ${colNumber}. ${cell.value}`);
        });

        // Buscar columnas relacionadas con clínico/anestesiólogo
        const clinicianCols = headers.filter(h =>
          h.name && String(h.name).toLowerCase().includes('anestest') ||
          h.name && String(h.name).toLowerCase().includes('medic') ||
          h.name && String(h.name).toLowerCase().includes('doctor') ||
          h.name && String(h.name).toLowerCase().includes('clinic')
        );

        if (clinicianCols.length > 0) {
          console.log('\n  🩺 Columnas de clínico encontradas:');
          clinicianCols.forEach(col => {
            console.log(`    - Columna ${col.col}: ${col.name}`);
          });

          // Mostrar algunos valores de ejemplo
          console.log('\n  📝 Ejemplos de datos (primeras 5 filas):');
          for (let i = 2; i <= Math.min(6, sheet.rowCount); i++) {
            const row = sheet.getRow(i);
            console.log(`\n  Fila ${i}:`);
            clinicianCols.forEach(col => {
              const cell = row.getCell(col.col);
              console.log(`    ${col.name}: ${cell.value || '(vacío)'}`);
            });
          }
        }
      }
    } else {
      console.log(`\n✅ Encontradas ${procedureSheets.length} hoja(s) de procedimientos:\n`);

      for (const sheet of procedureSheets) {
        console.log(`\n📄 Analizando hoja: ${sheet.name}`);
        console.log(`Filas totales: ${sheet.rowCount}\n`);

        // Obtener headers
        const headerRow = sheet.getRow(1);
        const headers = [];

        console.log('Todas las columnas:');
        headerRow.eachCell((cell, colNumber) => {
          const headerName = cell.value;
          headers.push({ col: colNumber, name: headerName });
          console.log(`  ${colNumber}. ${headerName}`);
        });

        // Buscar columna de clínico
        const clinicianCol = headers.find(h =>
          h.name && (
            String(h.name).toLowerCase().includes('anestest') ||
            String(h.name).toLowerCase().includes('medic') ||
            String(h.name).toLowerCase().includes('doctor') ||
            String(h.name).toLowerCase().includes('clinic')
          )
        );

        if (clinicianCol) {
          console.log(`\n🩺 Columna de clínico: ${clinicianCol.name} (columna ${clinicianCol.col})\n`);

          // Contar valores vacíos vs llenos
          let filled = 0;
          let empty = 0;
          const clinicianValues = new Set();

          for (let i = 2; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);
            const clinicianCell = row.getCell(clinicianCol.col);
            const value = clinicianCell.value;

            if (value && String(value).trim() !== '') {
              filled++;
              clinicianValues.add(String(value).trim());
            } else {
              empty++;
            }
          }

          console.log(`Estadísticas:`);
          console.log(`  - Con clínico asignado: ${filled}`);
          console.log(`  - Sin clínico asignado: ${empty}`);
          console.log(`  - Total de registros: ${sheet.rowCount - 1}`);
          console.log(`  - Clínicos únicos: ${clinicianValues.size}\n`);

          console.log(`Clínicos encontrados:`);
          Array.from(clinicianValues).sort().forEach((clinician, index) => {
            console.log(`  ${index + 1}. ${clinician}`);
          });

          // Mostrar ejemplos de filas con clínico
          console.log(`\n📝 Ejemplos de registros con clínico (primeros 5):`);
          let count = 0;
          for (let i = 2; i <= sheet.rowCount && count < 5; i++) {
            const row = sheet.getRow(i);
            const clinicianCell = row.getCell(clinicianCol.col);
            const value = clinicianCell.value;

            if (value && String(value).trim() !== '') {
              count++;
              console.log(`\nFila ${i}:`);
              headers.slice(0, 5).forEach(h => {
                const cell = row.getCell(h.col);
                console.log(`  ${h.name}: ${cell.value || '-'}`);
              });
              console.log(`  ${clinicianCol.name}: ${value}`);
            }
          }
        } else {
          console.log('\n⚠️  No se encontró columna de clínico/anestesiólogo');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeExcelClinician();
