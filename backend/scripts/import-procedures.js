// scripts/import-procedures.js
// Importar procedimientos NO trasplante
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

function parseASA(asa) {
  if (!asa) return null;
  const asaStr = String(asa).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV', 'V', 'VI'].includes(asaStr)) {
    return asaStr;
  }
  return null;
}

// Mapear tipo de procedimiento
function mapProcedureType(tipo, tipoDetalle) {
  if (!tipo) return null;

  const tipoStr = String(tipo).trim().toUpperCase();

  if (tipoStr.includes('BIOPSIA') && tipoStr.includes('PERCUTANEA')) return 'BIOPSIA_PERCUTANEA';
  if (tipoStr.includes('BIOPSIA') && tipoStr.includes('HEPATICA')) return 'BIOPSIA_HEPATICA';
  if (tipoStr.includes('FGC')) {
    if (tipoDetalle && String(tipoDetalle).includes('BIOPSIA')) return 'FGC_BIOPSIA';
    return 'FGC_DIAGNOSTICA';
  }
  if (tipoStr.includes('CER')) return 'CER';
  if (tipoStr.includes('FBC') && tipoDetalle && String(tipoDetalle).includes('BIOPSIA')) return 'FBC_BIOPSIA';

  return 'OTRO';
}

// Mapear vía aérea
function mapAirway(va) {
  if (!va) return null;

  const vaStr = String(va).trim().toUpperCase();

  if (vaStr.includes('VAN')) return 'VAN';
  if (vaStr.includes('IOT')) return 'IOT';
  if (vaStr.includes('TQT')) return 'TQT';
  if (vaStr.includes('MASCARA FACIAL') || vaStr.includes('MF')) return 'MF';
  if (vaStr.includes('MASCARA LARINGEA') || vaStr.includes('ML')) return 'ML';

  return null;
}

// Mapear ventilación
function mapVentilation(vent) {
  if (!vent) return null;

  const ventStr = String(vent).trim().toUpperCase();

  if (ventStr.includes('VAN')) return 'VAN';
  if (ventStr.includes('VESP') || ventStr.includes('ESPONTANEA')) return 'VESP';
  if (ventStr.includes('ARM')) return 'ARM';
  if (ventStr.includes('MF') && ventStr.includes('ESPONTANEA')) return 'MF_ESPONTANEA';

  return null;
}

// Mapear estado hemodinámico
function mapHemodynamics(hemo) {
  if (!hemo) return null;

  const hemoStr = String(hemo).trim().toUpperCase();

  if (hemoStr.includes('ESTABLE')) return 'ESTABLE';
  if (hemoStr.includes('INESTABLE')) return 'INESTABLE';
  if (hemoStr.includes('CRITICO')) return 'CRITICO';

  return null;
}

// Mapear técnica anestésica
function mapAnesthesiaTechnique(tecnica) {
  if (!tecnica) return null;

  const tecStr = String(tecnica).trim().toUpperCase();

  if (tecStr.includes('AGB')) return 'AGB';
  if (tecStr.includes('AL') && tecStr.includes('POTENCIADA')) return 'AL_POTENCIADA';
  if (tecStr.includes('SEDACION') && (tecStr.includes('LEVE') || tecStr.includes('MODERADA'))) return 'SEDACION_LEVE';
  if (tecStr.includes('SEDACION') && tecStr.includes('PROFUNDA')) return 'SEDACION_PROFUNDA';
  if (tecStr.includes('REGIONAL')) return 'REGIONAL';
  if (tecStr.includes('COMBINADA')) return 'COMBINADA';

  return null;
}

async function importProcedures() {
  console.log('\n📊 IMPORTACIÓN DE PROCEDIMIENTOS NO TRASPLANTE\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const proceduresData = XLSX.utils.sheet_to_json(workbook.Sheets['Porcedimientos']);

    console.log(`\nRegistros en Excel:`);
    console.log(`  Porcedimientos: ${proceduresData.length}\n`);
    console.log('='.repeat(80));

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < proceduresData.length; i++) {
      const proc = proceduresData[i];

      try {
        // Validar CI
        const ciValidation = normalizarCI(proc.CI);
        if (!ciValidation.ci) {
          skipped++;
          continue;
        }

        const ci = ciValidation.ci;

        // Verificar que el paciente existe
        const patientExists = await prisma.patient.findUnique({
          where: { id: ci }
        });

        if (!patientExists) {
          // Si el paciente no existe, crearlo con datos básicos
          await prisma.patient.create({
            data: {
              id: ci,
              ciRaw: ciValidation.ciRaw,
              ciSuspicious: ciValidation.suspicious,
              ciValidationNote: ciValidation.reason,
              name: `Paciente ${ci}`, // No tenemos el nombre en esta hoja
              transplanted: false,
            }
          });
        }

        // Parsear fechas
        const startAt = excelDateToJSDate(proc.Inicio);
        const endAt = excelDateToJSDate(proc.Finalizacion);

        // Calcular duración
        let duration = null;
        if (startAt && endAt) {
          duration = Math.round((new Date(endAt) - new Date(startAt)) / (1000 * 60));
        }

        // Crear procedimiento
        const procedure = await prisma.procedure.create({
          data: {
            patientId: ci,
            startAt: startAt,
            endAt: endAt,
            duration: duration,

            // Tipo
            procedureType: mapProcedureType(proc.Tipo, proc.TipoDetalle),
            procedureTypeDetail: proc.TipoDetalle || null,

            // Lugar
            location: proc.Lugar || null,

            // Clasificación
            asa: parseASA(proc.ASA),

            // Estado preoperatorio
            airwayPreop: mapAirway(proc.VAPreop),
            ventilationPreop: mapVentilation(proc.VentPreop),
            hemodynamicsPreop: mapHemodynamics(proc.HemodinamiaPreop),
            gcs: proc.GCS ? parseInt(proc.GCS) : null,
            provenance: proc.Procedencia || null,

            // Manejo anestésico
            premedication: proc.Premedicacion === 'SI' || proc.Premedicacion === 'Sí',
            prophylacticATB: proc.ATB || null,
            airwayIntraop: mapAirway(proc.VAIop),
            fullStomach: proc.EstOcupado === 'SI' || proc.EstOcupado === 'Si' || proc.EstOcupado === 'Sí',
            rapidSequence: proc.SecuenciaRap === 'SI' || proc.SecuenciaRap === 'Sí',
            difficultAirway: proc.IOTDificil === 'SI' || proc.IOTDificil === 'Sí',
            position: proc.Posicion || null,
            anesthesiaTech: mapAnesthesiaTechnique(proc.TecnicaA),
            ventilationIntraop: mapVentilation(proc.VentIop),
            ventModeDetail: proc.PatronVent || null,
            regionalAnesthesia: proc.ARegional || null,

            // Estado postoperatorio
            destination: proc.Destino || null,
            airwayPostop: mapAirway(proc.VApostop),
            ventilationPostop: mapVentilation(proc.VentPostop),
            hemodynamicsPostop: mapHemodynamics(proc.HemodinamiaPostop),

            // Complicaciones
            complications: proc.Complicaciones || null,

            // Observaciones
            observations: proc.Observaciones || null,
          }
        });

        imported++;

        if (imported % 25 === 0) {
          console.log(`  [${imported}/${proceduresData.length}] Progreso: ${((imported / proceduresData.length) * 100).toFixed(1)}%`);
        }

      } catch (error) {
        errors.push({
          index: i,
          ci: proc.CI,
          error: error.message
        });
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Procedimientos importados: ${imported}`);
    console.log(`⏭️  Procedimientos saltados: ${skipped}`);
    console.log(`❌ Errores: ${errors.length}\n`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('❌ ERRORES:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Registro ${err.index}, CI: ${err.ci}, Error: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ Se encontraron ${errors.length} errores (mostrando primeros 10):`);
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Registro ${err.index}, CI: ${err.ci}, Error: ${err.error}`);
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

importProcedures().catch(console.error);
