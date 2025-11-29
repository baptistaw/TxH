// scripts/deep-excel-analysis.js
// Análisis profundo del Excel para encontrar TODOS los datos de laboratorio
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function deepAnalysis() {
  console.log('\n🔬 ANÁLISIS PROFUNDO DEL EXCEL - BÚSQUEDA DE DATOS DE LABORATORIO\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    // Analizar hoja Preoperatorio en detalle
    console.log('\n📄 HOJA PREOPERATORIO - ANÁLISIS COMPLETO\n');

    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);

    console.log(`Total registros: ${preopData.length}\n`);

    // Mostrar un registro completo de ejemplo
    if (preopData.length > 0) {
      console.log('📋 EJEMPLO DE REGISTRO COMPLETO (índice 0):\n');
      const example = preopData[0];
      Object.entries(example).forEach(([key, value]) => {
        console.log(`   ${key.padEnd(30)} : ${value}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Buscar otras hojas que puedan tener datos de laboratorio
    const potentialLabSheets = workbook.SheetNames.filter(name =>
      name.toLowerCase().includes('lab') ||
      name.toLowerCase().includes('analisis') ||
      name.toLowerCase().includes('paraclinico') ||
      name.toLowerCase().includes('examen')
    );

    if (potentialLabSheets.length > 0) {
      console.log('\n📊 HOJAS POTENCIALES CON DATOS DE LABORATORIO:\n');
      potentialLabSheets.forEach(name => {
        console.log(`   - ${name}`);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        console.log(`     Registros: ${data.length}`);
        if (data.length > 0) {
          console.log(`     Columnas: ${Object.keys(data[0]).length}`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));

    // Analizar IntraopInducc en detalle (primera fase intraoperatoria)
    console.log('\n📄 HOJA IntraopInducc - ANÁLISIS COMPLETO\n');

    const inducc = XLSX.utils.sheet_to_json(workbook.Sheets['IntraopInducc']);

    console.log(`Total registros: ${inducc.length}\n`);

    if (inducc.length > 0) {
      console.log('📋 EJEMPLO DE REGISTRO COMPLETO:\n');
      const example = inducc[0];
      Object.entries(example).forEach(([key, value]) => {
        console.log(`   ${key.padEnd(30)} : ${value}`);
      });

      console.log('\n📋 OTRO EJEMPLO (índice 5):\n');
      if (inducc.length > 5) {
        const example2 = inducc[5];
        Object.entries(example2).forEach(([key, value]) => {
          console.log(`   ${key.padEnd(30)} : ${value}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));

    // Verificar si hay hojas ocultas
    console.log('\n🔍 VERIFICACIÓN DE HOJAS OCULTAS:\n');

    workbook.SheetNames.forEach((name, idx) => {
      const sheet = workbook.Sheets[name];
      const isHidden = sheet['!hidden'];
      if (isHidden) {
        console.log(`   ⚠️  ${name} está oculta`);
      }
    });

    console.log('\n✅ Análisis profundo completado\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

deepAnalysis();
