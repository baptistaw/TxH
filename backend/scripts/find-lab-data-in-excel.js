// scripts/find-lab-data-in-excel.js
// Buscar en TODAS las hojas del Excel los datos de laboratorio
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function findLabData() {
  console.log('\n🔍 BÚSQUEDA DE DATOS DE LABORATORIO EN TODO EL EXCEL\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    console.log(`\n📚 Hojas encontradas en el Excel:\n`);
    workbook.SheetNames.forEach((name, idx) => {
      console.log(`   ${idx + 1}. ${name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🔬 ANÁLISIS DETALLADO DE CADA HOJA:\n');

    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n📄 ${sheetName}`);
      console.log('-'.repeat(80));

      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (data.length === 0) {
        console.log('   (vacía)\n');
        return;
      }

      console.log(`   Registros: ${data.length}`);

      // Obtener TODAS las columnas
      const columns = Object.keys(data[0]);
      console.log(`   Columnas: ${columns.length}\n`);

      // Mostrar TODAS las columnas (primeras 50)
      console.log('   Lista de columnas:');
      columns.slice(0, 50).forEach((col, idx) => {
        console.log(`      ${(idx + 1).toString().padStart(3)}. ${col}`);
      });

      if (columns.length > 50) {
        console.log(`      ... y ${columns.length - 50} más`);
      }

      console.log('');

      // Buscar columnas que parecen ser de laboratorio
      const labKeywords = ['hb', 'hto', 'plaq', 'na', 'k', 'ca', 'ph', 'gluc', 'lact', 'creat', 'inr', 'pt'];
      const potentialLabCols = columns.filter(col =>
        labKeywords.some(kw => col.toLowerCase().includes(kw)) &&
        !col.toLowerCase().includes('ml') &&  // Excluir fluidos
        !col.toLowerCase().includes('(u)') &&  // Excluir unidades de hemoderivados
        !col.toLowerCase().includes('bolo') && // Excluir bolos de fármacos
        !col.toLowerCase().includes('ic')      // Excluir infusiones continuas
      );

      if (potentialLabCols.length > 0) {
        console.log('   ⭐ POSIBLES COLUMNAS DE LABORATORIO:');
        potentialLabCols.forEach(col => {
          // Contar valores no vacíos
          const nonEmpty = data.filter(row => {
            const val = row[col];
            return val !== undefined && val !== null && val !== '' && val !== ' ' && val !== 'undefined';
          }).length;

          console.log(`      ✓ ${col.padEnd(40)} (${nonEmpty} valores)`);
        });
        console.log('');
      }
    });

    console.log('='.repeat(80));
    console.log('\n✅ Búsqueda completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

findLabData();
