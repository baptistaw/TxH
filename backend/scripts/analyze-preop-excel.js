const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const workbook = XLSX.readFile(excelPath);

// Ver todas las columnas de Preoperatorio
const sheetPreop = workbook.Sheets['Preoperatorio'];
const dataPreop = XLSX.utils.sheet_to_json(sheetPreop);

console.log('📊 PREOPERATORIO - Todas las columnas (' + Object.keys(dataPreop[0]).length + '):');
Object.keys(dataPreop[0]).forEach((col, idx) => {
  console.log('  ' + (idx+1) + '. ' + col);
});

// Verificar si hay columnas de exámenes complementarios
const columns = Object.keys(dataPreop[0]);
const hasECG = columns.some(k => k.toLowerCase().includes('ecg'));
const hasEco = columns.some(k => k.toLowerCase().includes('eco'));
const hasTomo = columns.some(k => k.toLowerCase().includes('tomo') || k.toLowerCase().includes('tc'));
const hasRx = columns.some(k => k.toLowerCase().includes('rx'));
const hasLabs = columns.some(k => k.toLowerCase().includes('hb') || k.toLowerCase().includes('hemoglo'));

console.log('\n🔍 Columnas relacionadas con exámenes:');
console.log('  - ECG:', hasECG);
console.log('  - Ecocardiograma:', hasEco);
console.log('  - Tomografía:', hasTomo);
console.log('  - Rx:', hasRx);
console.log('  - Laboratorios (Hb, etc):', hasLabs);

// Contar cuántas filas tienen datos en K, CaIonico, Albumina
const rowsWithK = dataPreop.filter(r => r.K != null && r.K !== '').length;
const rowsWithCa = dataPreop.filter(r => r.CaIonico != null && r.CaIonico !== '').length;
const rowsWithAlbumin = dataPreop.filter(r => r.Albumina != null && r.Albumina !== '').length;

console.log('\n📈 Datos disponibles en Preoperatorio:');
console.log('  - Total de filas:', dataPreop.length);
console.log('  - Filas con K:', rowsWithK);
console.log('  - Filas con CaIonico:', rowsWithCa);
console.log('  - Filas con Albumina:', rowsWithAlbumin);

// Buscar en otras hojas posibles datos de laboratorios o exámenes complementarios
console.log('\n\n📋 Analizando otras hojas...\n');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (data.length > 0) {
    const cols = Object.keys(data[0]);

    // Buscar columnas relacionadas con laboratorios o exámenes
    const labCols = cols.filter(c =>
      c.toLowerCase().includes('hb') ||
      c.toLowerCase().includes('hto') ||
      c.toLowerCase().includes('plaq') ||
      c.toLowerCase().includes('tp') ||
      c.toLowerCase().includes('inr') ||
      c.toLowerCase().includes('na') ||
      c.toLowerCase().includes('sodio') ||
      c.toLowerCase().includes('crea')
    );

    const examCols = cols.filter(c =>
      c.toLowerCase().includes('ecg') ||
      c.toLowerCase().includes('eco') ||
      c.toLowerCase().includes('tomo') ||
      c.toLowerCase().includes('tc') ||
      c.toLowerCase().includes('rx')
    );

    if (labCols.length > 0 || examCols.length > 0) {
      console.log(`  📄 ${sheetName}:`);
      console.log(`     Total columnas: ${cols.length}`);
      console.log(`     Total filas: ${data.length}`);
      if (labCols.length > 0) {
        console.log(`     Columnas de laboratorio: ${labCols.join(', ')}`);
      }
      if (examCols.length > 0) {
        console.log(`     Columnas de exámenes: ${examCols.join(', ')}`);
      }
      console.log('');
    }
  }
});
