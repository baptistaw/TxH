// scripts/nivel2-import-missing-transplants.js
// NIVEL 2: Identificar e importar los 6 trasplantes faltantes del Excel
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

function parseASA(asa) {
  if (!asa) return null;
  const asaStr = String(asa).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV', 'V', 'VI'].includes(asaStr)) {
    return asaStr;
  }
  return null;
}

async function findAndImportMissing() {
  console.log('\n🔍 NIVEL 2: IDENTIFICAR E IMPORTAR TRASPLANTES FALTANTES\n');
  console.log('='.repeat(80));

  try {
    // PASO 1: Leer trasplantes del Excel
    const workbook = XLSX.readFile(excelPath);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);

    console.log(`\nTrasplantes en Excel: ${trasplanteData.length}`);

    // PASO 2: Leer trasplantes de la BD
    const casesInDB = await prisma.transplantCase.findMany({
      include: { patient: true },
      orderBy: { startAt: 'asc' }
    });

    console.log(`Trasplantes en BD: ${casesInDB.length}`);
    console.log(`Diferencia esperada: ${trasplanteData.length - casesInDB.length}\n`);

    // PASO 3: Crear un mapa de casos en BD por CI + fecha
    const dbCasesMap = new Map();
    casesInDB.forEach(c => {
      if (c.startAt) {
        const dateKey = new Date(c.startAt).toISOString().split('T')[0];
        const key = `${c.patientId}_${dateKey}`;
        dbCasesMap.set(key, c);
      }
    });

    // PASO 4: Identificar trasplantes del Excel que NO están en BD
    const missing = [];

    for (let i = 0; i < trasplanteData.length; i++) {
      const row = trasplanteData[i];

      const ciValidation = normalizarCI(row.CI);
      if (!ciValidation.ci) continue;

      const ci = ciValidation.ci;
      const startAt = excelDateToJSDate(row.FechaHoraInicio);

      if (!startAt) {
        // Trasplantes sin fecha de inicio - estos también están faltando
        missing.push({
          index: i,
          ci,
          ciRaw: ciValidation.ciRaw,
          startAt: null,
          row
        });
      } else {
        const dateKey = startAt.toISOString().split('T')[0];
        const key = `${ci}_${dateKey}`;

        if (!dbCasesMap.has(key)) {
          missing.push({
            index: i,
            ci,
            ciRaw: ciValidation.ciRaw,
            startAt,
            dateKey,
            row
          });
        }
      }
    }

    console.log('='.repeat(80));
    console.log(`\n📊 TRASPLANTES FALTANTES IDENTIFICADOS: ${missing.length}\n`);

    if (missing.length === 0) {
      console.log('✅ No hay trasplantes faltantes. Todos están en la BD.\n');
      await prisma.$disconnect();
      return;
    }

    console.log('📋 DETALLE:\n');
    missing.forEach((m, idx) => {
      console.log(`${idx + 1}. CI: ${m.ci}, Fecha: ${m.startAt ? m.dateKey : 'SIN FECHA'}, Retx: ${m.row.Retrasplante}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🚀 IMPORTANDO TRASPLANTES FALTANTES...\n');

    let imported = 0;
    let errors = [];

    for (const m of missing) {
      try {
        // Verificar que el paciente existe
        let patient = await prisma.patient.findUnique({
          where: { id: m.ci }
        });

        if (!patient) {
          // Crear paciente si no existe
          patient = await prisma.patient.create({
            data: {
              id: m.ci,
              ciRaw: m.ciRaw,
              ciSuspicious: false,
              name: `Paciente ${m.ci}`, // Nombre placeholder
              transplanted: true,
            }
          });
          console.log(`  ✓ Paciente creado: ${m.ci}`);
        }

        // Crear caso de trasplante (solo campos que existen en TransplantCase)
        const transplantCase = await prisma.transplantCase.create({
          data: {
            patientId: m.ci,
            startAt: m.startAt,
            endAt: null,
            duration: null,

            // Procedencia y tipo
            provenance: m.row.Procedencia || null,
            isRetransplant: m.row.Retrasplante === 'SI' || m.row.Retrasplante === 'Sí',
            isHepatoRenal: m.row.HepatoRenal === 'SI' || m.row.HepatoRenal === 'Sí',

            // Observaciones
            observations: m.row.Observaciones || null,
          }
        });

        imported++;
        console.log(`  ✅ Importado: ${m.ci} (${m.startAt ? m.dateKey : 'SIN FECHA'})`);

      } catch (error) {
        errors.push({
          ci: m.ci,
          date: m.dateKey || 'SIN FECHA',
          error: error.message
        });
        console.log(`  ❌ Error importando ${m.ci}: ${error.message}`);
      }
    }

    // REPORTE FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN\n');
    console.log('='.repeat(80));
    console.log(`✅ Trasplantes importados: ${imported}`);
    console.log(`❌ Errores: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('❌ ERRORES:\n');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. CI: ${err.ci}, Fecha: ${err.date}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    // VERIFICACIÓN FINAL
    console.log('='.repeat(80));
    console.log('\n🔍 VERIFICACIÓN POST-IMPORTACIÓN\n');

    const totalCases = await prisma.transplantCase.count();
    console.log(`Total casos de trasplante en BD: ${totalCases}`);
    console.log(`Total en Excel: ${trasplanteData.length}`);
    console.log(`Diferencia restante: ${trasplanteData.length - totalCases}\n`);

    console.log('✅ Importación de Nivel 2 completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findAndImportMissing();
