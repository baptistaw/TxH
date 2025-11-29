// scripts/analyze-procedimientos-types.js
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

    // Analizar la columna "Tipo" para ver qué tipo de procedimientos hay
    const tipos = {};
    let withAnest = 0;
    let withoutAnest = 0;

    console.log('📋 Primeros 20 registros con tipo de procedimiento:\n');

    for (let i = 2; i <= procSheet.rowCount; i++) {
      const row = procSheet.getRow(i);

      const ci = row.getCell(2).value;
      const tipo = row.getCell(12).value; // Tipo está en columna 12
      const procedimiento = row.getCell(10).value; // Procedimiento en columna 10
      const anest1 = row.getCell(5).value;
      const anest2 = row.getCell(6).value;

      if (!ci) continue;

      // Contar tipos
      const tipoStr = tipo ? String(tipo).trim() : 'Sin tipo';
      tipos[tipoStr] = (tipos[tipoStr] || 0) + 1;

      // Contar con/sin anestesista
      if (anest1 || anest2) {
        withAnest++;
      } else {
        withoutAnest++;
      }

      // Mostrar primeros 20 ejemplos
      if (i <= 21) {
        console.log(`Fila ${i}:`);
        console.log(`  CI: ${ci}`);
        console.log(`  Procedimiento: ${procedimiento}`);
        console.log(`  Tipo: ${tipo}`);
        console.log(`  Anest1: ${anest1}`);
        console.log(`  Anest2: ${anest2}`);
        console.log('');
      }
    }

    console.log('\n📊 Distribución por tipo de procedimiento:');
    Object.entries(tipos).sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => {
      console.log(`  ${tipo}: ${count}`);
    });

    console.log('\n📊 Anestesistas:');
    console.log(`  Con anestesista: ${withAnest}`);
    console.log(`  Sin anestesista: ${withoutAnest}`);
    console.log(`  Total: ${withAnest + withoutAnest}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyze();
