// scripts/analyze-excel-lab-columns.js
// Analizar qué columnas de laboratorio existen en el Excel
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function analyzeLabColumns() {
  console.log('\n🔬 ANÁLISIS DE COLUMNAS DE LABORATORIO EN EXCEL\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    // Hojas de intraoperatorio
    const intraopSheets = [
      'IntraopInducc',
      'IntraopDisec',
      'IntraopAnhep',
      'IntraopPreReperf',
      'IntraopPostRepef',
      'IntropFinVB',
      'IntraopCierre'
    ];

    intraopSheets.forEach(sheetName => {
      console.log(`\n📄 HOJA: ${sheetName}\n`);

      if (!workbook.Sheets[sheetName]) {
        console.log('   ❌ Hoja no encontrada\n');
        return;
      }

      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (data.length === 0) {
        console.log('   ⚠️  Sin datos\n');
        return;
      }

      console.log(`   Total registros: ${data.length}\n`);

      // Obtener todas las columnas
      const allColumns = Object.keys(data[0]);

      // Filtrar columnas relacionadas con laboratorio
      const labKeywords = [
        'hb', 'hgb', 'hemoglobin', 'hemato', 'hto',
        'plaq', 'plate',
        'pt', 'inr', 'fibri', 'aptt', 'tp', 'kptt',
        'na', 'sodio', 'sodium',
        'k', 'potasio', 'potassium',
        'ca', 'calcio', 'calcium',
        'mg', 'magnesio', 'magnesium',
        'cl', 'cloro', 'chlor',
        'ph',
        'pao2', 'paco2', 'pvo2', 'pvco2',
        'hco3', 'bicarb',
        'be', 'eb', 'exceso',
        'gluc', 'glic', 'glucose',
        'lact', 'lactato',
        'crea', 'creat',
        'urea', 'bun', 'azot',
        'sgot', 'ast', 'tgo',
        'sgpt', 'alt', 'tgp',
        'bili', 'bilirr',
        'alb', 'albumin',
        'prot', 'protein'
      ];

      const labColumns = allColumns.filter(col =>
        labKeywords.some(keyword =>
          col.toLowerCase().includes(keyword)
        )
      );

      if (labColumns.length === 0) {
        console.log('   ❌ No se encontraron columnas de laboratorio\n');
      } else {
        console.log('   ✓ Columnas de laboratorio encontradas:\n');
        labColumns.forEach(col => {
          // Contar cuántos registros tienen datos en esta columna
          const nonEmpty = data.filter(row => {
            const val = row[col];
            return val !== undefined && val !== null && val !== '' && val !== ' ' && val !== 'undefined';
          }).length;

          const percentage = ((nonEmpty / data.length) * 100).toFixed(1);

          console.log(`      ${col.padEnd(30)} : ${nonEmpty.toString().padStart(4)} registros (${percentage}%)`);
        });
        console.log('');
      }

      // Mostrar ejemplo del primer registro con datos de lab
      const exampleRecord = data.find(row =>
        labColumns.some(col => row[col] !== undefined && row[col] !== null && row[col] !== '')
      );

      if (exampleRecord) {
        console.log('   📋 EJEMPLO DE REGISTRO (primero con datos de lab):\n');
        labColumns.forEach(col => {
          if (exampleRecord[col] !== undefined && exampleRecord[col] !== null && exampleRecord[col] !== '') {
            console.log(`      ${col}: ${exampleRecord[col]}`);
          }
        });
        console.log('');
      }
    });

    console.log('='.repeat(80));
    console.log('\n✅ Análisis completado\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

analyzeLabColumns();
