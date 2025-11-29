// Importación completa de datos de laboratorio preoperatorios
// Maneja datos completos desde 2019 y datos parciales pre-2019
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🧪 IMPORTACIÓN DE LABORATORIOS PREOPERATORIOS\n');
console.log('='.repeat(80));
console.log(`Archivo: ${excelPath}\n`);

// Función para parsear fecha de Excel
function parseExcelDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Función para parsear valor numérico
function parseNumber(value) {
  if (value == null || value === '' || value === 'undefined') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Función para buscar PreopEvaluation por CI y fecha
async function findPreopEvaluation(ci, fecha) {
  if (!ci || !fecha) return null;

  try {
    // Buscar paciente por CI (usando ciRaw)
    const patient = await prisma.patient.findFirst({
      where: {
        ciRaw: {
          equals: ci,
          mode: 'insensitive'
        }
      }
    });

    if (!patient) {
      console.log(`   ⚠️  Paciente no encontrado con CI: ${ci}`);
      return null;
    }

    // Buscar evaluación preoperatoria cercana a la fecha
    const evaluations = await prisma.preopEvaluation.findMany({
      where: {
        patientId: patient.id
      },
      include: {
        _count: {
          select: { labs: true }
        }
      }
    });

    if (evaluations.length === 0) {
      console.log(`   ⚠️  No hay evaluaciones preop para paciente ${ci}`);
      return null;
    }

    // Buscar evaluación más cercana a la fecha del laboratorio
    // Tolerancia de ±30 días
    const targetDate = fecha.getTime();
    const tolerance = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

    let closestEval = null;
    let minDiff = Infinity;

    for (const eval of evaluations) {
      const evalDate = eval.evaluationDate.getTime();
      const diff = Math.abs(evalDate - targetDate);

      if (diff <= tolerance && diff < minDiff) {
        minDiff = diff;
        closestEval = eval;
      }
    }

    if (!closestEval) {
      console.log(`   ⚠️  No hay evaluación preop cercana a ${fecha.toISOString().split('T')[0]} para CI ${ci}`);
      return null;
    }

    // Verificar si ya tiene labs
    if (closestEval._count.labs > 0) {
      console.log(`   ℹ️  Evaluación ${closestEval.id} ya tiene ${closestEval._count.labs} registro(s) de laboratorio - omitiendo`);
      return null;
    }

    return closestEval;
  } catch (error) {
    console.error(`   ❌ Error buscando evaluación para CI ${ci}:`, error.message);
    return null;
  }
}

// Función principal
async function importLabs() {
  try {
    console.log('📖 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Preoperatorio'];

    // IMPORTANTE: Usar header: 1 para obtener TODAS las columnas (98 columnas)
    // Si usamos sheet_to_json() normal, solo obtiene 13 columnas
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rawData[0];
    const rows = rawData.slice(1); // Skip header row

    console.log(`Total de registros en Excel: ${rows.length}`);
    console.log(`Total de columnas: ${headers.length}\n`);
    console.log('='.repeat(80));

    // Mapeo de índices de columnas
    const COL = {
      CI: 1,
      Fecha: 2,
      FechaLaboratorio: 12,
      Hb: 13,
      Hto: 14,
      Plaquetas: 15,
      TP: 16,
      INR: 17,
      Fib: 18,
      Glicemia: 19,
      Na: 20,
      K: 21,
      CaIonico: 22,
      Mg: 23,
      Azo: 24,
      Crea: 25,
      IFG: 26,
      TGO: 27,
      TGP: 28,
      Btotal: 29,
      Albumina: 30,
      TSH: 31
    };

    let stats = {
      total: rows.length,
      sinFecha: 0,
      sinCI: 0,
      pacienteNoEncontrado: 0,
      evalNoEncontrada: 0,
      pre2019Completos: 0,
      pre2019Parciales: 0,
      desde2019Completos: 0,
      desde2019Parciales: 0,
      yaImportados: 0,
      importados: 0,
      errores: 0
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number

      // Parse fecha (usar Fecha de evaluación, no FechaLaboratorio)
      const fecha = parseExcelDate(row[COL.Fecha]);
      if (!fecha) {
        stats.sinFecha++;
        continue;
      }

      const year = fecha.getFullYear();
      const ci = row[COL.CI]?.toString().trim();

      if (!ci) {
        stats.sinCI++;
        continue;
      }

      console.log(`\n[${i + 1}/${rows.length}] Procesando CI: ${ci}, Fecha: ${fecha.toISOString().split('T')[0]}, Año: ${year}`);

      // Buscar evaluación preoperatoria
      const preopEval = await findPreopEvaluation(ci, fecha);

      if (!preopEval) {
        if (ci) {
          const patient = await prisma.patient.findFirst({
            where: { ciRaw: { equals: ci, mode: 'insensitive' } }
          });

          if (!patient) {
            stats.pacienteNoEncontrado++;
          } else {
            stats.evalNoEncontrada++;
          }
        }
        continue;
      }

      console.log(`   ✅ Encontrada evaluación: ${preopEval.id}`);

      // Determinar qué campos importar según el año
      // Usar FechaLaboratorio si existe, sino usar Fecha de evaluación
      const labDate = parseExcelDate(row[COL.FechaLaboratorio]) || fecha;

      let labData = {
        preopId: preopEval.id,
        labDate: labDate
      };

      let hasAnyData = false;

      if (year >= 2019) {
        // DATOS COMPLETOS desde 2019
        // Hematología
        labData.hb = parseNumber(row[COL.Hb]);
        labData.hto = parseNumber(row[COL.Hto]);
        labData.platelets = parseNumber(row[COL.Plaquetas]);

        // Coagulación
        labData.pt = parseNumber(row[COL.TP]);
        labData.inr = parseNumber(row[COL.INR]);
        labData.fibrinogen = parseNumber(row[COL.Fib]);

        // Química sanguínea
        labData.glucose = parseNumber(row[COL.Glicemia]);
        labData.sodium = parseNumber(row[COL.Na]);
        labData.potassium = parseNumber(row[COL.K]);
        labData.ionicCalcium = parseNumber(row[COL.CaIonico]);
        labData.magnesium = parseNumber(row[COL.Mg]);

        // Función renal
        labData.azotemia = parseNumber(row[COL.Azo]);
        labData.creatinine = parseNumber(row[COL.Crea]);
        labData.gfr = parseNumber(row[COL.IFG]);

        // Función hepática
        labData.sgot = parseNumber(row[COL.TGO]);
        labData.sgpt = parseNumber(row[COL.TGP]);
        labData.totalBili = parseNumber(row[COL.Btotal]);
        labData.albumin = parseNumber(row[COL.Albumina]);

        // Función tiroidea
        labData.tsh = parseNumber(row[COL.TSH]);

        // Verificar si tiene al menos un dato
        const values = Object.values(labData).filter(v => v !== null && v !== undefined);
        hasAnyData = values.length > 2; // Más que solo preopId y labDate

        if (hasAnyData) {
          stats.desde2019Completos++;
        } else {
          stats.desde2019Parciales++;
        }

      } else {
        // DATOS PARCIALES antes de 2019
        // Solo importar: Hb, K, Albumina, CaIonico
        labData.hb = parseNumber(row[COL.Hb]);
        labData.potassium = parseNumber(row[COL.K]);
        labData.albumin = parseNumber(row[COL.Albumina]);
        labData.ionicCalcium = parseNumber(row[COL.CaIonico]);

        // Verificar si tiene al menos un dato
        hasAnyData = labData.hb !== null || labData.potassium !== null ||
                     labData.albumin !== null || labData.ionicCalcium !== null;

        if (hasAnyData) {
          stats.pre2019Parciales++;
        } else {
          stats.pre2019Completos++; // Sin datos pero registrado
        }
      }

      if (!hasAnyData) {
        console.log(`   ⚠️  Sin datos de laboratorio en este registro - omitiendo`);
        continue;
      }

      // Crear registro de laboratorio
      try {
        await prisma.preopLabs.create({
          data: labData
        });

        stats.importados++;
        console.log(`   ✅ Laboratorio importado - Año: ${year}, Campos: ${Object.keys(labData).filter(k => labData[k] !== null && k !== 'preopId').length}`);

      } catch (error) {
        stats.errores++;
        console.error(`   ❌ Error creando laboratorio:`, error.message || error);
        if (error.code) console.error(`      Código: ${error.code}`);
      }

      // Pequeña pausa cada 10 registros
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`   Total registros procesados:     ${stats.total}`);
    console.log(`   ✅ Importados exitosamente:     ${stats.importados}`);
    console.log(`\n📅 POR PERÍODO:`);
    console.log(`   Pre-2019 (datos parciales):     ${stats.pre2019Parciales}`);
    console.log(`   2019+ (datos completos):        ${stats.desde2019Completos}`);
    console.log(`\n⚠️  OMITIDOS:`);
    console.log(`   Sin fecha:                      ${stats.sinFecha}`);
    console.log(`   Sin CI:                         ${stats.sinCI}`);
    console.log(`   Paciente no encontrado:         ${stats.pacienteNoEncontrado}`);
    console.log(`   Evaluación no encontrada:       ${stats.evalNoEncontrada}`);
    console.log(`   Ya tenían laboratorios:         ${stats.yaImportados}`);
    console.log(`\n❌ ERRORES:                        ${stats.errores}`);
    console.log('\n='.repeat(80));

    if (stats.importados > 0) {
      console.log('\n✅ IMPORTACIÓN COMPLETADA CON ÉXITO\n');
      console.log('Próximo paso: Importar referencias a exámenes complementarios');
    } else {
      console.log('\n⚠️  NO SE IMPORTARON REGISTROS\n');
      console.log('Verifica que:');
      console.log('  1. Los pacientes estén importados en la base de datos');
      console.log('  2. Las evaluaciones preoperatorias estén importadas');
      console.log('  3. Las evaluaciones no tengan laboratorios ya importados');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importLabs()
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
