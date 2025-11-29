// scripts/test-excel-read.js
// Probar diferentes métodos de lectura del Excel
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function testExcelRead() {
  console.log('\n🧪 PROBANDO DIFERENTES MÉTODOS DE LECTURA DEL EXCEL\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['IntraopAnhep'];

    // MÉTODO 1: sheet_to_json por defecto
    console.log('\n📄 MÉTODO 1: sheet_to_json (por defecto)\n');
    const data1 = XLSX.utils.sheet_to_json(sheet);

    if (data1.length > 0) {
      const columns1 = Object.keys(data1[0]);
      console.log(`Columnas leídas: ${columns1.length}`);
      console.log(`Primera columna: ${columns1[0]}`);
      console.log(`Última columna: ${columns1[columns1.length - 1]}`);

      // Verificar si tiene datos de laboratorio
      const hasHb = columns1.some(c => c.toLowerCase().includes('hb'));
      const hasLactato = columns1.some(c => c.toLowerCase().includes('lactato'));

      console.log(`\n¿Tiene columna Hb? ${hasHb ? '✓' : '❌'}`);
      console.log(`¿Tiene columna Lactato? ${hasLactato ? '✓' : '❌'}\n`);

      if (!hasHb) {
        console.log('❌ Las columnas de laboratorio NO se leyeron con el método por defecto\n');
      }
    }

    // MÉTODO 2: sheet_to_json con opción defval
    console.log('='.repeat(80));
    console.log('\n📄 MÉTODO 2: sheet_to_json con defval (incluir celdas vacías)\n');

    const data2 = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (data2.length > 0) {
      const columns2 = Object.keys(data2[0]);
      console.log(`Columnas leídas: ${columns2.length}`);
      console.log(`Primera columna: ${columns2[0]}`);
      console.log(`Última columna: ${columns2[columns2.length - 1]}`);

      const hasHb = columns2.some(c => c.toLowerCase().includes('hb'));
      const hasLactato = columns2.some(c => c.toLowerCase().includes('lactato'));

      console.log(`\n¿Tiene columna Hb? ${hasHb ? '✓' : '❌'}`);
      console.log(`¿Tiene columna Lactato? ${hasLactato ? '✓' : '❌'}\n`);

      if (hasHb) {
        console.log('✅ ¡Las columnas de laboratorio SÍ se leyeron con defval!\n');

        // Mostrar ejemplo de datos de laboratorio
        console.log('📋 Primer registro con datos de lab:\n');
        const ejemplo = data2.find(row =>
          row['Hb'] || row['Lactato'] || row['Na+'] || row['K+']
        );

        if (ejemplo) {
          console.log(`   Hb: ${ejemplo['Hb']}`);
          console.log(`   Hto: ${ejemplo['Hto']}`);
          console.log(`   Na+: ${ejemplo['Na+']}`);
          console.log(`   K+: ${ejemplo['K+']}`);
          console.log(`   Lactato: ${ejemplo['Lactato']}`);
          console.log(`   Glicemia: ${ejemplo['Glicemia']}`);
          console.log(`   pH: ${ejemplo['pH']}`);
          console.log('');
        }
      }
    }

    // Contar cuántos registros tienen datos de laboratorio
    console.log('='.repeat(80));
    console.log('\n📊 ESTADÍSTICAS DE DATOS DE LABORATORIO:\n');

    const withHb = data2.filter(row => row['Hb'] !== null && row['Hb'] !== undefined && row['Hb'] !== '').length;
    const withLactato = data2.filter(row => row['Lactato'] !== null && row['Lactato'] !== undefined && row['Lactato'] !== '').length;
    const withNa = data2.filter(row => row['Na+'] !== null && row['Na+'] !== undefined && row['Na+'] !== '').length;
    const withK = data2.filter(row => row['K+'] !== null && row['K+'] !== undefined && row['K+'] !== '').length;

    console.log(`Registros en IntraopAnhep: ${data2.length}`);
    console.log(`  Con Hb: ${withHb} (${((withHb / data2.length) * 100).toFixed(1)}%)`);
    console.log(`  Con Lactato: ${withLactato} (${((withLactato / data2.length) * 100).toFixed(1)}%)`);
    console.log(`  Con Na+: ${withNa} (${((withNa / data2.length) * 100).toFixed(1)}%)`);
    console.log(`  Con K+: ${withK} (${((withK / data2.length) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Prueba completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

testExcelRead();
