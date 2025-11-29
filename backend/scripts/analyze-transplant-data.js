const XLSX = require('xlsx');
const { normalizarCI } = require('/home/william-baptista/TxH/anestesia-trasplante/backend/scripts/ci-validator');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('\n📊 ANÁLISIS DE DATOS DE TRASPLANTE:\n');
console.log('='.repeat(80));

const sheet = workbook.Sheets['DatosTrasplante'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`Total registros en DatosTrasplante: ${data.length}\n`);

// Contar registros con FechaHoraInicio
const conFechaInicio = data.filter(row => row.FechaHoraInicio).length;
const sinFechaInicio = data.length - conFechaInicio;

console.log(`Registros CON FechaHoraInicio: ${conFechaInicio}`);
console.log(`Registros SIN FechaHoraInicio: ${sinFechaInicio}\n`);

// Mostrar ejemplos sin fecha de inicio
console.log('Ejemplos de registros SIN FechaHoraInicio (primeros 10):\n');
const sinFecha = data.filter(row => !row.FechaHoraInicio).slice(0, 10);
sinFecha.forEach((row, idx) => {
  const ciStr = String(row.CI || '').split(':')[0].trim();
  const validation = normalizarCI(ciStr);
  console.log(`${idx + 1}. CI: ${validation.ci || 'N/A'}`);
  console.log(`   Campos disponibles: ${Object.keys(row).filter(k => row[k]).join(', ')}`);
  console.log('');
});

// Verificar si hay un campo que indique el tipo de procedimiento
console.log('='.repeat(80));
console.log('\nTODOS los campos en DatosTrasplante:');
if (data.length > 0) {
  const allKeys = new Set();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  Array.from(allKeys).sort().forEach((key, idx) => {
    console.log(`  ${idx + 1}. ${key}`);
  });
}

// Ver un registro completo con FechaHoraInicio
console.log('\n' + '='.repeat(80));
console.log('\nEjemplo de registro COMPLETO con FechaHoraInicio:\n');
const conFecha = data.find(row => row.FechaHoraInicio);
if (conFecha) {
  console.log(JSON.stringify(conFecha, null, 2));
}
