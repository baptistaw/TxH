const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const wb = XLSX.readFile(excelPath);

// Leer headers
const headers = XLSX.utils.sheet_to_json(wb.Sheets['DatosTrasplante'], { header: 1 })[0];

console.log('='.repeat(80));
console.log('TODAS LAS COLUMNAS EN DatosTrasplante:');
console.log('='.repeat(80));
headers.forEach((h, i) => {
  console.log(`[${i}] ${h}`);
});

// Leer datos
const data = XLSX.utils.sheet_to_json(wb.Sheets['DatosTrasplante']);

// Buscar Daniel Picón
const picon = data.find(row => String(row.CI).includes('3282071'));

console.log('\n' + '='.repeat(80));
console.log('DATOS DE DANIEL PICÓN:');
console.log('='.repeat(80));

if (picon) {
  Object.keys(picon).forEach(key => {
    console.log(`${key}: ${picon[key]}`);
  });
}
