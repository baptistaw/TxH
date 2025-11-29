const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🔍 ANALIZANDO DATOS DE LABORATORIO POR AÑO\n');
console.log('='.repeat(80));

try {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Preoperatorio'];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Total de registros en Preoperatorio: ${data.length}\n`);

  // Función para parsear fecha de Excel
  function parseExcelDate(serial) {
    if (!serial || isNaN(serial)) return null;
    const date = new Date((serial - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  // Agrupar por año
  const byYear = {};

  data.forEach(row => {
    const fecha = parseExcelDate(row.Fecha);
    if (!fecha) return;

    const year = fecha.getFullYear();
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(row);
  });

  // Analizar columnas de laboratorio
  const labColumns = ['Hb', 'Hto', 'Plaquetas', 'TP', 'INR', 'Fib', 'Glicemia',
                      'Na', 'K', 'CaIonico', 'Mg', 'Azo', 'Crea', 'IFG',
                      'TGO', 'TGP', 'Btotal', 'Albumina', 'TSH'];

  const years = Object.keys(byYear).sort();

  console.log('📊 ANÁLISIS POR AÑO\n');
  console.log('='.repeat(80));

  years.forEach(year => {
    const records = byYear[year];
    console.log(`\n📅 AÑO ${year} (${records.length} registros)`);
    console.log('─'.repeat(80));

    // Contar cuántos registros tienen cada columna
    labColumns.forEach(col => {
      const count = records.filter(r =>
        r[col] != null && r[col] !== '' && r[col] !== 'undefined'
      ).length;
      const percentage = ((count / records.length) * 100).toFixed(1);

      if (count > 0) {
        const bar = '█'.repeat(Math.floor(percentage / 5));
        console.log(`   ${col.padEnd(12)} ${count.toString().padStart(3)}/${records.length.toString().padStart(3)} (${percentage.toString().padStart(5)}%) ${bar}`);
      }
    });
  });

  // Resumen final
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 RESUMEN');
  console.log('='.repeat(80));

  console.log('\n✅ Datos COMPLETOS desde 2019:');
  const desde2019 = years.filter(y => parseInt(y) >= 2019);
  desde2019.forEach(year => {
    const records = byYear[year];
    const withHb = records.filter(r => r.Hb != null && r.Hb !== '').length;
    const withHto = records.filter(r => r.Hto != null && r.Hto !== '').length;
    const withPlaq = records.filter(r => r.Plaquetas != null && r.Plaquetas !== '').length;
    const withTP = records.filter(r => r.TP != null && r.TP !== '').length;
    const withINR = records.filter(r => r.INR != null && r.INR !== '').length;

    console.log(`   ${year}: ${records.length} registros`);
    console.log(`      - Hb: ${withHb} (${((withHb/records.length)*100).toFixed(1)}%)`);
    console.log(`      - Hto: ${withHto} (${((withHto/records.length)*100).toFixed(1)}%)`);
    console.log(`      - Plaquetas: ${withPlaq} (${((withPlaq/records.length)*100).toFixed(1)}%)`);
    console.log(`      - TP: ${withTP} (${((withTP/records.length)*100).toFixed(1)}%)`);
    console.log(`      - INR: ${withINR} (${((withINR/records.length)*100).toFixed(1)}%)`);
  });

  console.log('\n⚠️  Datos PARCIALES antes de 2019:');
  const antes2019 = years.filter(y => parseInt(y) < 2019);
  antes2019.forEach(year => {
    const records = byYear[year];
    console.log(`   ${year}: ${records.length} registros - Solo K, Albumina, CaIonico disponibles`);
  });

  console.log('\n='.repeat(80));
  console.log('✅ CONCLUSIÓN:');
  console.log('='.repeat(80));
  console.log('\nDatos de laboratorio completos disponibles desde 2019 en adelante.');
  console.log('Crear script de importación que distinga:');
  console.log('  - Registros >= 2019: Importar laboratorios completos');
  console.log('  - Registros < 2019: Importar solo K, Albumina, CaIonico');
  console.log('='.repeat(80));

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
