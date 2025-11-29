const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('\n📊 ANÁLISIS DE REGISTROS INTRAOPERATORIOS EN EXCEL\n');
console.log('='.repeat(80));

const sheets = {
  'IntraopInducc': 'INDUCCION',
  'IntraopDisec': 'DISECCION',
  'IntraopAnhep': 'ANHEPATICA',
  'IntraopPreReperf': 'PRE_REPERFUSION',
  'IntraopPostRepef': 'POST_REPERFUSION',
  'IntropFinVB': 'VIA_BILIAR',
  'IntraopCierre': 'CIERRE'
};

for (const [sheetName, phase] of Object.entries(sheets)) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) continue;

  const data = XLSX.utils.sheet_to_json(sheet);

  // Contar registros por CI
  const ciCount = {};
  const validCIs = [];

  data.forEach(row => {
    if (row.CI) {
      const ciStr = String(row.CI).split(':')[0].trim();
      const validation = normalizarCI(ciStr);

      if (validation.ci) {
        const ci = validation.ci;
        ciCount[ci] = (ciCount[ci] || 0) + 1;
        if (!validCIs.includes(ci)) validCIs.push(ci);
      }
    }
  });

  // Mostrar estadísticas
  const counts = Object.values(ciCount);
  const totalRecords = counts.reduce((a, b) => a + b, 0);
  const avgPerCI = validCIs.length > 0 ? totalRecords / validCIs.length : 0;
  const maxRecords = counts.length > 0 ? Math.max(...counts) : 0;

  console.log(`\n📄 ${sheetName} (${phase}):`);
  console.log(`  Total registros en Excel: ${data.length}`);
  console.log(`  Pacientes únicos (CI válida): ${validCIs.length}`);
  console.log(`  Total registros con CI válida: ${totalRecords}`);
  console.log(`  Promedio de registros por paciente: ${avgPerCI.toFixed(1)}`);
  console.log(`  Máximo de registros para un paciente: ${maxRecords}`);

  // Mostrar ejemplo de pacientes con múltiples registros
  const cisWithMultiple = Object.entries(ciCount).filter(([ci, count]) => count > 2).slice(0, 3);
  if (cisWithMultiple.length > 0) {
    console.log(`  Ejemplos de pacientes con múltiples registros:`);
    cisWithMultiple.forEach(([ci, count]) => {
      console.log(`    - CI ${ci}: ${count} registros`);
    });
  }
}
