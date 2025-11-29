// scripts/explore-historical-excel.js
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

console.log('\n📊 EXPLORANDO ARCHIVO EXCEL HISTÓRICO\n');

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('Hojas disponibles:');
  console.log('='.repeat(80));

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n📋 ${sheetName}`);
    console.log(`   Filas: ${data.length}`);

    if (data.length > 0) {
      const headers = data[0];
      console.log(`   Columnas (${headers.length}): ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`);

      // Show sample of first data row
      if (data.length > 1) {
        console.log(`   Muestra fila 2:`);
        const firstRow = data[1];
        headers.slice(0, 5).forEach((header, idx) => {
          console.log(`     ${header}: ${firstRow[idx]}`);
        });
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Exploración completada\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
