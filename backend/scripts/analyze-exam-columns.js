const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🔍 ANALIZANDO COLUMNAS DE EXÁMENES COMPLEMENTARIOS\n');
console.log('='.repeat(80));

try {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Preoperatorio'];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Total de registros: ${data.length}\n`);

  // Obtener todas las columnas
  const allColumns = Object.keys(data[0]);

  console.log('📋 TODAS LAS COLUMNAS:\n');
  allColumns.forEach((col, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(3)}. ${col}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔍 BUSCANDO COLUMNAS CON REFERENCIAS A ARCHIVOS\n');

  // Buscar columnas que puedan contener referencias a archivos
  const examKeywords = ['ecg', 'eco', 'rx', 'tc', 'tomo', 'peg', 'espiro',
                        'doppler', 'imagen', 'archivo', 'file', 'adjunto',
                        'attachment', 'scan', 'estudio', 'exam'];

  const potentialExamCols = allColumns.filter(col => {
    const colLower = col.toLowerCase();
    return examKeywords.some(keyword => colLower.includes(keyword));
  });

  if (potentialExamCols.length > 0) {
    console.log(`✅ Encontradas ${potentialExamCols.length} columnas potenciales:\n`);
    potentialExamCols.forEach(col => {
      // Contar registros con datos
      const nonEmpty = data.filter(row =>
        row[col] != null && row[col] !== '' && row[col] !== 'undefined'
      ).length;

      console.log(`   📋 ${col}`);
      console.log(`      Registros con datos: ${nonEmpty}/${data.length}`);

      // Mostrar muestra de valores
      const samples = data
        .filter(row => row[col] != null && row[col] !== '' && row[col] !== 'undefined')
        .slice(0, 3)
        .map(row => row[col]);

      if (samples.length > 0) {
        console.log(`      Muestras:`);
        samples.forEach(sample => {
          const sampleStr = String(sample).substring(0, 80);
          console.log(`        - ${sampleStr}`);
        });
      }
      console.log();
    });
  }

  // Buscar columnas que contengan "/" o rutas de archivos
  console.log('\n' + '='.repeat(80));
  console.log('🔍 BUSCANDO COLUMNAS CON RUTAS DE ARCHIVOS\n');

  const pathColumns = [];
  allColumns.forEach(col => {
    const samplesWithPaths = data
      .filter(row => {
        const value = String(row[col] || '');
        return value.includes('/') || value.includes('\\') ||
               value.includes('.pdf') || value.includes('.jpg') ||
               value.includes('.png') || value.includes('.jpeg') ||
               value.includes('.doc') || value.includes('.xls');
      })
      .slice(0, 3);

    if (samplesWithPaths.length > 0) {
      pathColumns.push({
        column: col,
        count: data.filter(row => {
          const value = String(row[col] || '');
          return value.includes('/') || value.includes('\\');
        }).length,
        samples: samplesWithPaths.map(r => r[col])
      });
    }
  });

  if (pathColumns.length > 0) {
    console.log(`✅ Encontradas ${pathColumns.length} columnas con rutas:\n`);
    pathColumns.forEach(({ column, count, samples }) => {
      console.log(`   📁 ${column}`);
      console.log(`      Registros con rutas: ${count}/${data.length}`);
      console.log(`      Muestras:`);
      samples.forEach(sample => {
        const sampleStr = String(sample).substring(0, 100);
        console.log(`        - ${sampleStr}`);
      });
      console.log();
    });
  } else {
    console.log('⚠️  No se encontraron columnas con rutas de archivos\n');
  }

  console.log('='.repeat(80));

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
