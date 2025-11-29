const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('🔍 BUSCANDO DATOS DE LABORATORIO EN TODAS LAS HOJAS\n');
console.log('='.repeat(80));

const labKeywords = ['hb', 'hemoglobin', 'hto', 'hematocrit', 'plaq', 'platelet',
                      'tp', 'inr', 'fib', 'fibrinogen', 'na', 'sodio', 'sodium',
                      'k', 'potasio', 'potassium', 'crea', 'creatinin',
                      'azo', 'urea', 'gluc', 'glicemia', 'tgo', 'tgp', 'sgot', 'sgpt',
                      'bili', 'albumin'];

const examKeywords = ['ecg', 'eco', 'ecocard', 'tomo', 'tc', 'rx', 'radiogra',
                      'peg', 'espiro', 'doppler', 'scanner'];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (data.length === 0) return;

  const columns = Object.keys(data[0]);

  // Buscar columnas de laboratorio
  const labCols = columns.filter(col => {
    const colLower = col.toLowerCase();
    return labKeywords.some(keyword => colLower.includes(keyword));
  });

  // Buscar columnas de exámenes
  const examCols = columns.filter(col => {
    const colLower = col.toLowerCase();
    return examKeywords.some(keyword => colLower.includes(keyword));
  });

  if (labCols.length > 0 || examCols.length > 0) {
    console.log(`\n📄 Hoja: ${sheetName}`);
    console.log(`   Total filas: ${data.length}`);
    console.log(`   Total columnas: ${columns.length}`);

    if (labCols.length > 0) {
      console.log(`\n   ✅ COLUMNAS DE LABORATORIO (${labCols.length}):`);
      labCols.forEach(col => {
        const nonEmptyCount = data.filter(row =>
          row[col] != null && row[col] !== '' && row[col] !== 'undefined'
        ).length;
        const percentage = ((nonEmptyCount / data.length) * 100).toFixed(1);
        console.log(`      • ${col.padEnd(25)} → ${nonEmptyCount.toString().padStart(4)} filas con datos (${percentage}%)`);
      });
    }

    if (examCols.length > 0) {
      console.log(`\n   ✅ COLUMNAS DE EXÁMENES COMPLEMENTARIOS (${examCols.length}):`);
      examCols.forEach(col => {
        const nonEmptyCount = data.filter(row =>
          row[col] != null && row[col] !== '' && row[col] !== 'undefined'
        ).length;
        const percentage = ((nonEmptyCount / data.length) * 100).toFixed(1);
        console.log(`      • ${col.padEnd(25)} → ${nonEmptyCount.toString().padStart(4)} filas con datos (${percentage}%)`);
      });
    }

    // Mostrar muestra de datos
    console.log(`\n   📋 MUESTRA DE DATOS (primera fila con datos):`);
    const sampleRow = data.find(row => {
      return [...labCols, ...examCols].some(col =>
        row[col] != null && row[col] !== '' && row[col] !== 'undefined'
      );
    });

    if (sampleRow) {
      [...labCols, ...examCols].forEach(col => {
        if (sampleRow[col] != null && sampleRow[col] !== '' && sampleRow[col] !== 'undefined') {
          console.log(`      ${col}: ${sampleRow[col]}`);
        }
      });
    }

    console.log('\n' + '-'.repeat(80));
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('📊 RESUMEN');
console.log('='.repeat(80));
console.log('\nConclusión:');
console.log('  Si no hay columnas de laboratorio detallado (Hb, Hto, Plaquetas, TP, INR, etc.)');
console.log('  en ninguna hoja, significa que estos datos NO están en el archivo Excel.');
console.log('\n  Posiblemente están en:');
console.log('    - AppSheet (sistema original)');
console.log('    - Google Sheets separado');
console.log('    - Otro archivo Excel no migrado');
console.log('='.repeat(80));
