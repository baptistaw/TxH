// scripts/deep-investigation-crossed-cis.js
// Investigación profunda del patrón de CIs cruzadas en el Excel
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

function cleanCI(ci) {
  if (!ci || ci === 'undefined') return null;
  const ciStr = String(ci);
  let ciProcesar = ciStr;

  if (ciStr.includes(':')) {
    ciProcesar = ciStr.split(':')[0].trim();
  }

  const validation = normalizarCI(ciProcesar);
  return validation.ci;
}

async function deepInvestigation() {
  console.log('\n🔍 INVESTIGACIÓN PROFUNDA: PATRÓN DE CIs CRUZADAS\n');
  console.log('='.repeat(80));

  try {
    // PASO 1: Examinar estructura del Excel
    console.log('\n📑 PASO 1: ESTRUCTURA DEL EXCEL\n');

    const workbook = XLSX.readFile(excelPath);
    console.log(`Hojas en el Excel:`);
    workbook.SheetNames.forEach((name, idx) => {
      console.log(`  ${idx + 1}. ${name}`);
    });

    // Buscar hojas de correcciones o notas
    const correctionSheets = workbook.SheetNames.filter(name =>
      name.toLowerCase().includes('correccion') ||
      name.toLowerCase().includes('nota') ||
      name.toLowerCase().includes('fix') ||
      name.toLowerCase().includes('error')
    );

    if (correctionSheets.length > 0) {
      console.log(`\n⚠️  Hojas potenciales de correcciones encontradas:`);
      correctionSheets.forEach(name => console.log(`    - ${name}`));
    } else {
      console.log(`\n✓ No se encontraron hojas específicas de correcciones`);
    }

    // PASO 2: Obtener todos los trasplantes y registros intraop
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 PASO 2: ANÁLISIS DE FECHAS CON REGISTROS CRUZADOS\n');

    const cases = await prisma.transplantCase.findMany({
      where: { startAt: { not: null } },
      include: { patient: true },
      orderBy: { startAt: 'asc' }
    });

    const intraopRecords = await prisma.intraopRecord.findMany({
      include: { case: { include: { patient: true } } },
      orderBy: { timestamp: 'asc' }
    });

    // Agrupar por fecha (solo día)
    const casesByDate = {};
    cases.forEach(c => {
      if (c.startAt) {
        const dateKey = new Date(c.startAt).toISOString().split('T')[0];
        if (!casesByDate[dateKey]) casesByDate[dateKey] = [];
        casesByDate[dateKey].push({
          ci: c.patientId,
          name: c.patient.name,
          startAt: c.startAt
        });
      }
    });

    const intraopByDate = {};
    intraopRecords.forEach(r => {
      const dateKey = new Date(r.timestamp).toISOString().split('T')[0];
      if (!intraopByDate[dateKey]) intraopByDate[dateKey] = new Set();
      intraopByDate[dateKey].add(r.case.patientId);
    });

    // Encontrar fechas donde los CIs no coinciden
    const crossedDates = [];
    Object.keys(intraopByDate).forEach(date => {
      const caseCIs = new Set((casesByDate[date] || []).map(c => c.ci));
      const intraopCIs = intraopByDate[date];

      const orphanCIs = [...intraopCIs].filter(ci => !caseCIs.has(ci));
      const missingCIs = [...caseCIs].filter(ci => !intraopCIs.has(ci));

      if (orphanCIs.length > 0 || missingCIs.length > 0) {
        crossedDates.push({
          date,
          caseCIs: [...caseCIs],
          intraopCIs: [...intraopCIs],
          orphanCIs,
          missingCIs,
          cases: casesByDate[date] || []
        });
      }
    });

    console.log(`Total de fechas con desajuste: ${crossedDates.length}\n`);

    // PASO 3: Analizar el patrón en el Excel
    console.log('='.repeat(80));
    console.log('\n📋 PASO 3: ANÁLISIS EN EXCEL (hoja IntraopCierre)\n');

    const intraopSheet = workbook.Sheets['IntraopCierre'];
    const intraopData = XLSX.utils.sheet_to_json(intraopSheet);

    console.log(`Total de registros en IntraopCierre: ${intraopData.length}\n`);

    // Examinar los primeros registros para entender estructura
    console.log('Primeros 5 registros (estructura):');
    intraopData.slice(0, 5).forEach((row, idx) => {
      const ci = cleanCI(row.CI);
      const fecha = excelDateToJSDate(row.Fecha);
      console.log(`  ${idx + 1}. CI: ${ci}, Fecha: ${fecha ? fecha.toISOString().split('T')[0] : 'Sin fecha'}, Fase: ${row.Fase || 'Sin fase'}`);
    });

    // PASO 4: Mapeo detallado de cada fecha cruzada
    console.log('\n' + '='.repeat(80));
    console.log('\n🔎 PASO 4: MAPEO DETALLADO DE FECHAS CRUZADAS\n');

    const potentialMapping = {};

    for (const crossed of crossedDates.slice(0, 15)) { // Mostrar primeras 15
      console.log(`\n📅 FECHA: ${crossed.date}`);
      console.log(`  Trasplantes en BD:`);

      if (crossed.cases.length === 0) {
        console.log(`    ❌ Ninguno`);
      } else {
        crossed.cases.forEach(c => {
          console.log(`    ✓ ${c.name} (CI: ${c.ci})`);
        });
      }

      console.log(`  CIs con registros intraop en BD:`);
      if (crossed.intraopCIs.length === 0) {
        console.log(`    ❌ Ninguno`);
      } else {
        crossed.intraopCIs.forEach(ci => {
          const isOrphan = crossed.orphanCIs.includes(ci);
          console.log(`    ${isOrphan ? '❌' : '✓'} CI: ${ci} ${isOrphan ? '(HUÉRFANO)' : ''}`);
        });
      }

      // Buscar en Excel qué CIs aparecen en esta fecha
      const excelRecordsThisDate = intraopData.filter(row => {
        const fecha = excelDateToJSDate(row.Fecha);
        if (!fecha) return false;
        return fecha.toISOString().split('T')[0] === crossed.date;
      });

      console.log(`  Registros en Excel para esta fecha: ${excelRecordsThisDate.length}`);

      // Contar CIs únicas en Excel
      const cisInExcel = {};
      excelRecordsThisDate.forEach(row => {
        const ci = cleanCI(row.CI);
        if (ci) {
          if (!cisInExcel[ci]) cisInExcel[ci] = 0;
          cisInExcel[ci]++;
        }
      });

      console.log(`  CIs en Excel:`);
      Object.entries(cisInExcel).forEach(([ci, count]) => {
        console.log(`    - ${ci}: ${count} registros`);
      });

      // Si hay exactamente 1 trasplante y 1 CI huérfana, es una corrección potencial
      if (crossed.cases.length === 1 && crossed.orphanCIs.length === 1) {
        const correctCI = crossed.cases[0].ci;
        const wrongCI = crossed.orphanCIs[0];
        potentialMapping[wrongCI] = potentialMapping[wrongCI] || [];
        potentialMapping[wrongCI].push({
          date: crossed.date,
          shouldBe: correctCI,
          patientName: crossed.cases[0].name
        });
        console.log(`  ⚠️  CORRECCIÓN POTENCIAL: ${wrongCI} → ${correctCI}`);
      }
    }

    // PASO 5: Resumen de mapeo potencial
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 PASO 5: RESUMEN DE CORRECCIONES POTENCIALES\n');

    const mappingEntries = Object.entries(potentialMapping);

    if (mappingEntries.length === 0) {
      console.log('❌ No se encontraron patrones claros de corrección automática.');
      console.log('   Se requiere revisión manual de cada caso.\n');
    } else {
      console.log(`✓ Se encontraron ${mappingEntries.length} CIs con correcciones potenciales:\n`);

      mappingEntries.forEach(([wrongCI, corrections]) => {
        console.log(`CI incorrecta: ${wrongCI}`);
        corrections.forEach(corr => {
          console.log(`  Fecha ${corr.date}: debería ser ${corr.shouldBe} (${corr.patientName})`);
        });
        console.log('');
      });

      // Verificar consistencia
      console.log('='.repeat(80));
      console.log('\n🔍 VERIFICACIÓN DE CONSISTENCIA:\n');

      let consistent = true;
      mappingEntries.forEach(([wrongCI, corrections]) => {
        const uniqueTargets = new Set(corrections.map(c => c.shouldBe));
        if (uniqueTargets.size > 1) {
          console.log(`⚠️  CI ${wrongCI} tiene múltiples targets:`);
          uniqueTargets.forEach(target => {
            const dates = corrections.filter(c => c.shouldBe === target).map(c => c.date);
            console.log(`    → ${target}: fechas ${dates.join(', ')}`);
          });
          consistent = false;
        }
      });

      if (consistent) {
        console.log('✅ Todas las CIs incorrectas mapean consistentemente a una sola CI correcta.\n');
        console.log('📝 Mapeo final propuesto:\n');
        mappingEntries.forEach(([wrongCI, corrections]) => {
          console.log(`  ${wrongCI} → ${corrections[0].shouldBe} (${corrections[0].patientName})`);
        });
      } else {
        console.log('\n❌ Se encontraron inconsistencias. Revisión manual requerida.\n');
      }
    }

    // PASO 6: Buscar registros del Excel que deberían estar en DatosTrasplante
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 PASO 6: VERIFICAR SI HAY TRASPLANTES FALTANTES\n');

    const trasplanteSheet = workbook.Sheets['DatosTrasplante'];
    const trasplanteData = XLSX.utils.sheet_to_json(trasplanteSheet);

    console.log(`Trasplantes en Excel (DatosTrasplante): ${trasplanteData.length}`);
    console.log(`Trasplantes en BD: ${cases.length}`);
    console.log(`Diferencia: ${trasplanteData.length - cases.length} trasplantes\n`);

    if (trasplanteData.length > cases.length) {
      console.log('⚠️  Hay trasplantes en el Excel que no están en la BD.');
      console.log('   Esto podría explicar algunos "huérfanos".\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deepInvestigation();
