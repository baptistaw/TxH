const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🔍 ANALIZANDO DATOS DE APPSHEET\n');
console.log('='.repeat(80));
console.log(`Archivo: ${excelPath}\n`);

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('📋 Hojas disponibles en AppSheet:');
  console.log(workbook.SheetNames.join(', '));
  console.log('\n' + '='.repeat(80));

  // Buscar hojas con datos de laboratorio
  const labKeywords = ['hb', 'hemoglobin', 'hto', 'hematocrit', 'plaq', 'platelet',
                        'tp', 'inr', 'fib', 'fibrinogen', 'na', 'sodio', 'sodium',
                        'k', 'potasio', 'potassium', 'crea', 'creatinin',
                        'azo', 'urea', 'gluc', 'glicemia', 'tgo', 'tgp', 'sgot', 'sgpt',
                        'bili', 'albumin', 'calcio', 'magnesio'];

  const examKeywords = ['ecg', 'eco', 'ecocard', 'tomo', 'tc', 'rx', 'radiogra',
                        'peg', 'espiro', 'doppler', 'scanner', 'imagen', 'estudio'];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      console.log(`\n📄 Hoja: "${sheetName}" - VACÍA`);
      return;
    }

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

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📄 Hoja: "${sheetName}"`);
    console.log('─'.repeat(80));
    console.log(`   Total filas: ${data.length}`);
    console.log(`   Total columnas: ${columns.length}`);

    // Mostrar TODAS las columnas
    console.log(`\n   📊 TODAS LAS COLUMNAS (${columns.length}):`);
    columns.forEach((col, idx) => {
      // Contar filas con datos en esta columna
      const nonEmptyCount = data.filter(row =>
        row[col] != null && row[col] !== '' && row[col] !== 'undefined'
      ).length;
      const percentage = ((nonEmptyCount / data.length) * 100).toFixed(1);

      const mark = labCols.includes(col) ? '🧪' : examCols.includes(col) ? '📋' : '  ';
      console.log(`      ${mark} ${(idx + 1).toString().padStart(3)}. ${col.padEnd(30)} → ${nonEmptyCount.toString().padStart(4)} filas (${percentage}%)`);
    });

    if (labCols.length > 0) {
      console.log(`\n   ✅ COLUMNAS DE LABORATORIO DETECTADAS (${labCols.length}):`);
      labCols.forEach(col => {
        const nonEmptyCount = data.filter(row =>
          row[col] != null && row[col] !== '' && row[col] !== 'undefined'
        ).length;
        console.log(`      🧪 ${col} → ${nonEmptyCount} filas con datos`);
      });
    }

    if (examCols.length > 0) {
      console.log(`\n   ✅ COLUMNAS DE EXÁMENES DETECTADAS (${examCols.length}):`);
      examCols.forEach(col => {
        const nonEmptyCount = data.filter(row =>
          row[col] != null && row[col] !== '' && row[col] !== 'undefined'
        ).length;
        console.log(`      📋 ${col} → ${nonEmptyCount} filas con datos`);
      });
    }

    // Muestra de datos
    console.log(`\n   💾 MUESTRA DE DATOS (primera fila):`);
    const sampleRow = data[0];
    const maxSampleCols = Math.min(10, columns.length);
    for (let i = 0; i < maxSampleCols; i++) {
      const col = columns[i];
      const value = sampleRow[col];
      const valueStr = value != null ? String(value).substring(0, 50) : '(vacío)';
      console.log(`      ${col}: ${valueStr}`);
    }
    if (columns.length > 10) {
      console.log(`      ... y ${columns.length - 10} columnas más`);
    }
  });

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMEN');
  console.log('='.repeat(80));
  console.log('\nHojas analizadas:', workbook.SheetNames.length);
  console.log('\nBusca en la salida anterior:');
  console.log('  🧪 = Columnas de laboratorio detectadas');
  console.log('  📋 = Columnas de exámenes complementarios detectadas');
  console.log('\nSi encuentras hojas con datos completos de laboratorio o exámenes,');
  console.log('podemos crear scripts de importación específicos.');
  console.log('='.repeat(80));

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
