const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('\n📊 ANÁLISIS DE RETRASPLANTES:\n');
console.log('='.repeat(80));

const sheet = workbook.Sheets['DatosTrasplante'];
const data = XLSX.utils.sheet_to_json(sheet);

// Filtrar solo los que tienen FechaHoraInicio (trasplantes reales)
const transplants = data.filter(row => row.FechaHoraInicio);

console.log(`Total registros en DatosTrasplante: ${data.length}`);
console.log(`Trasplantes con FechaHoraInicio: ${transplants.length}\n`);

// Agrupar por CI para encontrar retrasplantes
const ciGroups = {};
transplants.forEach(row => {
  const ciStr = String(row.CI || '').split(':')[0].trim();
  const validation = normalizarCI(ciStr);

  if (validation.ci) {
    if (!ciGroups[validation.ci]) {
      ciGroups[validation.ci] = [];
    }
    ciGroups[validation.ci].push({
      fecha: row.FechaHoraInicio,
      retrasplante: row.Retrasplante
    });
  }
});

const pacientesUnicos = Object.keys(ciGroups).length;
const pacientesConRetrasplante = Object.values(ciGroups).filter(g => g.length > 1).length;
const totalTrasplantes = transplants.length;

console.log(`Pacientes únicos con trasplante: ${pacientesUnicos}`);
console.log(`Pacientes con 2+ trasplantes: ${pacientesConRetrasplante}`);
console.log(`Total procedimientos de trasplante: ${totalTrasplantes}\n`);

// Mostrar pacientes con múltiples trasplantes
console.log('='.repeat(80));
console.log('\nPacientes con RETRASPLANTE (múltiples procedimientos):\n');

const retransplantPatients = Object.entries(ciGroups)
  .filter(([ci, procedures]) => procedures.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

retransplantPatients.forEach(([ci, procedures], idx) => {
  console.log(`${idx + 1}. CI: ${ci} - ${procedures.length} trasplantes`);
  procedures.forEach((p, i) => {
    console.log(`   Trasplante ${i + 1}: Fecha=${p.fecha}, Marcado como retrasplante=${p.retrasplante || 'NO'}`);
  });
  console.log('');
});

console.log('='.repeat(80));
console.log(`\nRESUMEN:`);
console.log(`  Pacientes únicos trasplantados: ${pacientesUnicos}`);
console.log(`  Total procedimientos de trasplante: ${totalTrasplantes}`);
console.log(`  Pacientes con retrasplante: ${pacientesConRetrasplante}`);
console.log(`  Falta para 330: ${330 - totalTrasplantes}`);
