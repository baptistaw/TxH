const XLSX = require('xlsx');
const wb = XLSX.readFile('/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx');
const trasplante = XLSX.utils.sheet_to_json(wb.Sheets['DatosTrasplante']);

// Buscar Daniel Picón
const picon = trasplante.find(t => String(t.CI).includes('3282071'));

console.log('Datos de Daniel Picón en el Excel:');
console.log('CI:', picon.CI);
console.log('FechaHoraInicio:', picon.FechaHoraInicio, '(tipo:', typeof picon.FechaHoraInicio, ')');
console.log('FechaHoraFin:', picon.FechaHoraFin, '(tipo:', typeof picon.FechaHoraFin, ')');
console.log('Duracion:', picon.Duracion, '(tipo:', typeof picon.Duracion, ')');

// Convertir fechas
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date;
}

const inicio = excelDateToJSDate(picon.FechaHoraInicio);
const fin = excelDateToJSDate(picon.FechaHoraFin);

console.log('\nFechas convertidas:');
console.log('Inicio:', inicio);
console.log('Fin:', fin);

// Verificar varios pacientes
console.log('\n' + '='.repeat(80));
console.log('Verificando primeros 10 pacientes:');
trasplante.slice(0, 10).forEach(t => {
  const ini = excelDateToJSDate(t.FechaHoraInicio);
  const end = excelDateToJSDate(t.FechaHoraFin);
  const duracionCalculada = ini && end ? Math.round((end - ini) / (1000 * 60)) : null;

  console.log(`\nCI: ${t.CI}`);
  console.log(`  Inicio (raw): ${t.FechaHoraInicio}`);
  console.log(`  Fin (raw): ${t.FechaHoraFin}`);
  console.log(`  Inicio: ${ini ? ini.toLocaleString('es-UY') : 'N/A'}`);
  console.log(`  Fin: ${end ? end.toLocaleString('es-UY') : 'N/A'}`);
  console.log(`  Duración (Excel): ${t.Duracion} minutos`);
  console.log(`  Duración (calculada): ${duracionCalculada} minutos`);
  console.log(`  ¿Mismo valor?: ${ini && end && ini.getTime() === end.getTime() ? 'SÍ ⚠️' : 'NO'}`);
});
