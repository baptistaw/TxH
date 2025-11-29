// scripts/import-procedure-intraop.js
// Importar registros intraoperatorios de procedimientos NO trasplante
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Helper functions
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

function parseNumber(value) {
  if (!value || value === 'undefined' || value === '' || value === ' ') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseIntForFluids(value) {
  if (!value || value === 'undefined' || value === '' || value === ' ') return 0;
  const num = Number.parseInt(value);
  return isNaN(num) ? 0 : num;
}

function cleanCI(ci) {
  if (!ci || ci === 'undefined') return null;
  // Manejar el caso donde CI viene con timestamp (ej: "999999: 10/18/2019 08:38:00")
  const ciStr = String(ci);
  let ciProcesar = ciStr;

  if (ciStr.includes(':')) {
    ciProcesar = ciStr.split(':')[0].trim();
  }

  // Normalizar la CI con el validador
  const validation = normalizarCI(ciProcesar);
  return validation.ci; // Retorna la CI normalizada con DV o null si es inválida
}

async function importProcedureIntraop() {
  console.log('\n📊 IMPORTANDO REGISTROS INTRAOPERATORIOS DE PROCEDIMIENTOS\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const intraopData = XLSX.utils.sheet_to_json(workbook.Sheets['IntraopProced']);

    console.log(`\nRegistros en Excel:`);
    console.log(`  IntraopProced: ${intraopData.length}\n`);

    // Obtener mapeo de CI a procedureId
    console.log('📋 Obteniendo mapeo de pacientes a procedimientos...\n');

    const procedures = await prisma.procedure.findMany({
      select: {
        id: true,
        patientId: true,
        startAt: true
      },
      orderBy: { startAt: 'asc' }
    });

    console.log(`✓ Encontrados ${procedures.length} procedimientos en la BD\n`);
    console.log('='.repeat(80));

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const row of intraopData) {
      try {
        const ci = cleanCI(row.CI);
        if (!ci) {
          skipped++;
          continue;
        }

        // Buscar el procedimiento para este paciente
        // Si hay múltiples procedimientos, usar el que coincida mejor con la fecha
        const timestamp = excelDateToJSDate(row.Fecha);
        if (!timestamp) {
          skipped++;
          continue;
        }

        // Buscar procedimientos del paciente
        const patientProcedures = procedures.filter(p => p.patientId === ci);

        if (patientProcedures.length === 0) {
          // Paciente no tiene procedimientos registrados, saltar
          skipped++;
          continue;
        }

        // Si hay varios procedimientos, elegir el más cercano a la fecha del registro
        let selectedProcedure = patientProcedures[0];
        if (patientProcedures.length > 1 && patientProcedures[0].startAt) {
          let minDiff = Math.abs(new Date(timestamp) - new Date(patientProcedures[0].startAt));

          for (const proc of patientProcedures) {
            if (proc.startAt) {
              const diff = Math.abs(new Date(timestamp) - new Date(proc.startAt));
              if (diff < minDiff) {
                minDiff = diff;
                selectedProcedure = proc;
              }
            }
          }
        }

        // Crear registro intraoperatorio
        await prisma.procedureIntraopRecord.create({
          data: {
            procedureId: selectedProcedure.id,
            timestamp: timestamp,

            // Hemodinamia básica
            heartRate: parseNumber(row.FC) ? parseInt(parseNumber(row.FC)) : null,
            pas: parseNumber(row.PAS) ? parseInt(parseNumber(row.PAS)) : null,
            pad: parseNumber(row.PAD) ? parseInt(parseNumber(row.PAD)) : null,
            pam: parseNumber(row.PAm) ? parseInt(parseNumber(row.PAm)) : null,
            satO2: parseNumber(row.SatO2) ? parseInt(parseNumber(row.SatO2)) : null,
            temp: parseNumber(row.Temp),
            fio2: parseNumber(row.FIO2),

            // Ventilación básica
            tidalVolume: parseNumber(row.VC) ? parseInt(parseNumber(row.VC)) : null,
            respRate: parseNumber(row.Fr) ? parseInt(parseNumber(row.Fr)) : null,
            peep: parseNumber(row.PEEP) ? parseInt(parseNumber(row.PEEP)) : null,
            peakPressure: parseNumber(row.PVA) ? parseInt(parseNumber(row.PVA)) : null,

            // Fármacos
            inhalAgent: row.AgenteInhalatorio === 'SI' ? 'SI' : null,
            opioids: row['Opiaceos Bolo'] === 'SI' || row['Opiaceos IC'] === 'SI' ||
                     row['Opiáceos Bolo'] === 'SI' || row['Opiáceos IC'] === 'SI',
            hypnotics: row['Hipnoticos Bolo'] === 'SI' || row['Hipnoticos IC'] === 'SI' ||
                       row['Hipnóticos Bolo'] === 'SI' || row['Hipnóticos IC'] === 'SI',
            relaxants: row['RM Bolo'] === 'SI' || row['RM IC'] === 'SI',
            vasopressors: row.DBT === 'SI' || row.Dopa === 'SI' || row.NA === 'SI' ||
                          row.Fenilefrina === 'SI' || row.Adrenalina === 'SI',
            antibiotics: row.ATB === 'SI',

            // Fluidos
            plasmalyte: parseIntForFluids(row['Plasmalyte(ml)']),
            ringer: parseIntForFluids(row['RLactato(ml)']),
            saline: parseIntForFluids(row['SF(ml)']),

            // Hemoderivados
            redBloodCells: parseIntForFluids(row['GR(U)']),
            plasma: parseIntForFluids(row['Plasma(U)']),
          }
        });

        imported++;

        if (imported % 50 === 0) {
          console.log(`  [${imported}/${intraopData.length}] Progreso: ${((imported / intraopData.length) * 100).toFixed(1)}%`);
        }

      } catch (error) {
        errors.push({
          ci: cleanCI(row.CI),
          fecha: row.Fecha,
          error: error.message
        });
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Registros importados: ${imported}`);
    console.log(`⏭️  Registros saltados: ${skipped}`);
    console.log(`❌ Errores: ${errors.length}\n`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('❌ ERRORES:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. CI: ${err.ci}, Fecha: ${err.fecha}, Error: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ Se encontraron ${errors.length} errores (mostrando primeros 10):`);
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. CI: ${err.ci}, Fecha: ${err.fecha}, Error: ${err.error}`);
      });
    }

    console.log('\n✅ Importación completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importProcedureIntraop().catch(console.error);
