// scripts/analyze-procedimientos-correct.js
const ExcelJS = require('exceljs');

async function analyze() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const procSheet = workbook.getWorksheet('Porcedimientos');
    if (!procSheet) {
      console.log('❌ No se encontró la hoja Porcedimientos');
      return;
    }

    console.log('📊 Analizando hoja Porcedimientos correctamente\n');

    let totalRows = 0;
    let withAnest1 = 0;
    let withAnest2 = 0;
    let withBoth = 0;
    let withNone = 0;

    const anest1Values = [];
    const anest2Values = [];

    for (let i = 2; i <= procSheet.rowCount; i++) {
      const row = procSheet.getRow(i);
      const ci = row.getCell(2).value;

      // Solo contar filas con CI (datos reales)
      if (!ci) continue;

      totalRows++;

      const anest1 = row.getCell(5).value;
      const anest2 = row.getCell(6).value;

      const has1 = anest1 && String(anest1).trim() !== '';
      const has2 = anest2 && String(anest2).trim() !== '';

      if (has1) {
        withAnest1++;
        anest1Values.push(String(anest1));
      }
      if (has2) {
        withAnest2++;
        anest2Values.push(String(anest2));
      }

      if (has1 && has2) {
        withBoth++;
      } else if (!has1 && !has2) {
        withNone++;
      }
    }

    console.log('📊 Resultados:');
    console.log(`  Total de filas con datos (CI): ${totalRows}`);
    console.log(`  Filas con Anestesista1: ${withAnest1}`);
    console.log(`  Filas con Anestesista2: ${withAnest2}`);
    console.log(`  Filas con ambos anestesistas: ${withBoth}`);
    console.log(`  Filas sin anestesista: ${withNone}`);

    console.log('\n📋 Primeros 10 valores de Anestesista1:');
    anest1Values.slice(0, 10).forEach((val, idx) => {
      console.log(`  ${idx + 1}. ${val}`);
    });

    console.log('\n📋 Todos los valores de Anestesista2:');
    anest2Values.forEach((val, idx) => {
      console.log(`  ${idx + 1}. ${val}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyze();
