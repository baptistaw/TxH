// scripts/check-excel-procedures-sheet.js
const ExcelJS = require('exceljs');

async function checkProceduresSheet() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
    console.log('📊 Analizando hoja Porcedimientos\n');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Porcedimientos');

    if (!sheet) {
      console.log('❌ No se encontró la hoja Porcedimientos');
      return;
    }

    console.log(`Filas totales: ${sheet.rowCount}\n`);

    // Obtener headers
    const headerRow = sheet.getRow(1);
    const headers = [];

    console.log('Columnas:');
    headerRow.eachCell((cell, colNumber) => {
      const headerName = cell.value;
      headers.push({ col: colNumber, name: headerName });
      console.log(`  ${colNumber}. ${headerName}`);
    });

    console.log('\n');

    // Buscar columnas de anestesista
    const anestesCol1 = headers.find(h =>
      h.name && String(h.name).toLowerCase().includes('anestesista1')
    );

    const anestesCol2 = headers.find(h =>
      h.name && String(h.name).toLowerCase().includes('anestesista2')
    );

    if (!anestesCol1) {
      console.log('❌ No se encontró columna Anestesista1');
      return;
    }

    console.log(`✅ Columna Anestesista1 encontrada: ${anestesCol1.name} (columna ${anestesCol1.col})`);
    if (anestesCol2) {
      console.log(`✅ Columna Anestesista2 encontrada: ${anestesCol2.name} (columna ${anestesCol2.col})\n`);
    }

    // Analizar valores
    let filled = 0;
    let empty = 0;
    const anestesValues = new Map(); // nombre => count

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const anestesCell = row.getCell(anestesCol1.col);
      const value = anestesCell.value;

      if (value && String(value).trim() !== '') {
        filled++;
        const name = String(value).trim();
        anestesValues.set(name, (anestesValues.get(name) || 0) + 1);
      } else {
        empty++;
      }
    }

    console.log(`Estadísticas:`);
    console.log(`  - Con anestesiólogo asignado: ${filled}`);
    console.log(`  - Sin anestesiólogo asignado: ${empty}`);
    console.log(`  - Total de registros: ${sheet.rowCount - 1}`);
    console.log(`  - Anestesiólogos únicos: ${anestesValues.size}\n`);

    console.log(`Anestesiólogos encontrados (ordenados por cantidad):`);
    const sorted = Array.from(anestesValues.entries()).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([name, count], index) => {
      console.log(`  ${index + 1}. ${name} (${count} procedimientos)`);
    });

    // Mostrar algunos procedimientos sin anestesiólogo
    if (empty > 0) {
      console.log(`\n⚠️  Ejemplos de procedimientos SIN anestesiólogo (primeros 10):\n`);
      let count = 0;
      const ciCol = headers.find(h => h.name && String(h.name).toLowerCase() === 'ci');
      const fechaCol = headers.find(h => h.name && String(h.name).toLowerCase().includes('fecha'));

      for (let i = 2; i <= sheet.rowCount && count < 10; i++) {
        const row = sheet.getRow(i);
        const anestesCell = row.getCell(anestesCol.col);
        const value = anestesCell.value;

        if (!value || String(value).trim() === '') {
          count++;
          console.log(`Fila ${i}:`);
          if (ciCol) {
            const ci = row.getCell(ciCol.col).value;
            console.log(`  CI: ${ci || '(vacío)'}`);
          }
          if (fechaCol) {
            const fecha = row.getCell(fechaCol.col).value;
            console.log(`  Fecha: ${fecha || '(vacío)'}`);
          }
          // Mostrar todas las columnas para este registro
          headers.slice(0, 10).forEach(h => {
            const cell = row.getCell(h.col);
            console.log(`  ${h.name}: ${cell.value || '-'}`);
          });
          console.log('');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProceduresSheet();
