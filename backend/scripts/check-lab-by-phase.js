// scripts/check-lab-by-phase.js
// Verificar en qué fases hay datos de laboratorio en el Excel
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

const sheets = {
  'IntraopInducc': 'INDUCCION',
  'IntraopDisec': 'DISECCION',
  'IntraopAnhep': 'ANHEPATICA',
  'IntraopPreReperf': 'PRE_REPERFUSION',
  'IntraopPostRepef': 'POST_REPERFUSION',
  'IntropFinVB': 'VIA_BILIAR',
  'IntraopCierre': 'CIERRE'
};

function checkLabByPhase() {
  console.log('\n🔬 VERIFICAR DATOS DE LABORATORIO POR FASE\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    Object.entries(sheets).forEach(([sheetName, phaseName]) => {
      console.log(`\n📄 ${sheetName} (${phaseName})\n`);

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log('   ❌ Hoja no encontrada\n');
        return;
      }

      // Leer con defval para obtener TODAS las columnas
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

      console.log(`   Total registros: ${data.length}`);

      if (data.length === 0) {
        console.log('   ⚠️  Sin datos\n');
        return;
      }

      // Verificar si tiene columnas de laboratorio
      const columns = Object.keys(data[0]);
      const hasHb = columns.includes('Hb');
      const hasLactato = columns.includes('Lactato');
      const hasNa = columns.includes('Na+');
      const hasPH = columns.includes('pH');

      console.log(`   Columnas totales: ${columns.length}`);
      console.log(`   ¿Tiene columna Hb? ${hasHb ? '✓' : '❌'}`);
      console.log(`   ¿Tiene columna Lactato? ${hasLactato ? '✓' : '❌'}`);
      console.log(`   ¿Tiene columna Na+? ${hasNa ? '✓' : '❌'}`);
      console.log(`   ¿Tiene columna pH? ${hasPH ? '✓' : '❌'}`);

      if (hasHb || hasLactato || hasNa || hasPH) {
        // Contar registros con datos
        const withHb = data.filter(r => r['Hb'] !== null && r['Hb'] !== undefined && r['Hb'] !== '').length;
        const withLactato = data.filter(r => r['Lactato'] !== null && r['Lactato'] !== undefined && r['Lactato'] !== '').length;
        const withNa = data.filter(r => r['Na+'] !== null && r['Na+'] !== undefined && r['Na+'] !== '').length;
        const withPH = data.filter(r => r['pH'] !== null && r['pH'] !== undefined && r['pH'] !== '').length;

        console.log(`\n   📊 Registros con datos:\n`);
        console.log(`      Hb:      ${withHb.toString().padStart(4)} (${((withHb / data.length) * 100).toFixed(1)}%)`);
        console.log(`      Lactato: ${withLactato.toString().padStart(4)} (${((withLactato / data.length) * 100).toFixed(1)}%)`);
        console.log(`      Na+:     ${withNa.toString().padStart(4)} (${((withNa / data.length) * 100).toFixed(1)}%)`);
        console.log(`      pH:      ${withPH.toString().padStart(4)} (${((withPH / data.length) * 100).toFixed(1)}%)`);

        // Mostrar ejemplo de un registro CON datos
        const ejemplo = data.find(r => r['Hb'] || r['Lactato'] || r['Na+']);
        if (ejemplo) {
          console.log(`\n   📋 Ejemplo de registro con datos:\n`);
          console.log(`      CI: ${ejemplo['CI']}`);
          console.log(`      Fecha: ${ejemplo['Fecha']}`);
          if (ejemplo['Hb']) console.log(`      Hb: ${ejemplo['Hb']}`);
          if (ejemplo['Hto']) console.log(`      Hto: ${ejemplo['Hto']}`);
          if (ejemplo['Na+']) console.log(`      Na+: ${ejemplo['Na+']}`);
          if (ejemplo['K+']) console.log(`      K+: ${ejemplo['K+']}`);
          if (ejemplo['Lactato']) console.log(`      Lactato: ${ejemplo['Lactato']}`);
          if (ejemplo['pH']) console.log(`      pH: ${ejemplo['pH']}`);
        }
      } else {
        console.log(`\n   ❌ Esta fase NO tiene columnas de laboratorio en el Excel`);
      }

      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

checkLabByPhase();
