// scripts/extract-real-emails.js
// Extraer emails reales de la hoja Equipo

const XLSX = require('xlsx');
const path = require('path');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

try {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  EXTRACCIÓN DE EMAILS REALES DE LA HOJA EQUIPO');
  console.log('════════════════════════════════════════════════════════\n');

  const workbook = XLSX.readFile(excelPath);

  if (!workbook.SheetNames.includes('Equipo')) {
    console.error('❌ No se encontró la hoja "Equipo"');
    console.log('Hojas disponibles:', workbook.SheetNames.join(', '));
    process.exit(1);
  }

  const worksheet = workbook.Sheets['Equipo'];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✓ Total de registros en la hoja Equipo: ${data.length}\n`);
  console.log('Estructura de datos:');
  console.log(JSON.stringify(data[0], null, 2));

  console.log('\n\nTodos los registros con emails:\n');
  console.log('═'.repeat(80));

  data.forEach((row, index) => {
    console.log(`\n${index + 1}. Registro:`);
    Object.keys(row).forEach(key => {
      console.log(`   ${key}: ${row[key]}`);
    });
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}
