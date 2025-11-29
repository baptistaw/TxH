// scripts/fix-end-times-smart.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Máxima duración razonable para un trasplante: 24 horas = 1440 minutos
const MAX_REASONABLE_DURATION_MIN = 1440;

async function fixEndTimes() {
  console.log('\n📊 CORRIGIENDO FECHAS DE FINALIZACIÓN (VERSIÓN INTELIGENTE)\n');
  console.log('='.repeat(80));

  try {
    // Obtener todos los casos
    const cases = await prisma.transplantCase.findMany({
      orderBy: { startAt: 'asc' },
      include: { patient: true }
    });

    console.log(`Total de casos a procesar: ${cases.length}\n`);

    let fixed = 0;
    let noRecords = 0;
    let errors = [];

    for (const transplantCase of cases) {
      try {
        const caseId = transplantCase.id;
        const startAt = transplantCase.startAt;

        if (!startAt) {
          noRecords++;
          continue;
        }

        // Buscar registros intraoperatorios en orden de prioridad
        const phaseOrder = ['CIERRE', 'VIA_BILIAR', 'POST_REPERFUSION', 'PRE_REPERFUSION', 'ANHEPATICA', 'DISECCION', 'INDUCCION'];

        let endTime = null;

        for (const phase of phaseOrder) {
          // Obtener TODOS los registros de esta fase
          const records = await prisma.intraopRecord.findMany({
            where: {
              caseId: caseId,
              phase: phase
            },
            orderBy: { timestamp: 'desc' }
          });

          if (records.length > 0) {
            // Filtrar registros que estén dentro de un rango razonable (dentro de 24 horas del inicio)
            const reasonableRecords = records.filter(r => {
              const duration = (new Date(r.timestamp) - new Date(startAt)) / (1000 * 60);
              return duration >= 0 && duration <= MAX_REASONABLE_DURATION_MIN;
            });

            if (reasonableRecords.length > 0) {
              // Tomar el último registro razonable
              endTime = reasonableRecords[0].timestamp;
              break;
            } else if (records.length > 0) {
              // Si no hay registros razonables, tomar el primero (más antiguo) de los disponibles
              // Este es un caso problemático que necesitará revisión manual
              endTime = records[records.length - 1].timestamp;
              errors.push({
                patient: transplantCase.patient.name,
                ci: transplantCase.patient.id,
                reason: `No hay registros de ${phase} dentro de 24hrs. Usando el más cercano al inicio.`,
                totalRecords: records.length,
                startAt: startAt,
                endTime: endTime
              });
              break;
            }
          }
        }

        if (!endTime) {
          noRecords++;
          continue;
        }

        // Calcular duración en minutos
        const duration = Math.round((new Date(endTime) - new Date(startAt)) / (1000 * 60));

        // Actualizar el caso
        await prisma.transplantCase.update({
          where: { id: caseId },
          data: {
            endAt: endTime,
            duration: duration
          }
        });

        fixed++;

        // Reportar casos con duraciones anómalas
        if (duration < 0) {
          errors.push({
            patient: transplantCase.patient.name,
            ci: transplantCase.patient.id,
            reason: 'Duración negativa',
            duration: duration,
            startAt: startAt,
            endTime: endTime
          });
        } else if (duration === 0) {
          errors.push({
            patient: transplantCase.patient.name,
            ci: transplantCase.patient.id,
            reason: 'Duración = 0',
            duration: duration,
            startAt: startAt,
            endTime: endTime
          });
        }

      } catch (error) {
        errors.push({
          patient: transplantCase.patient.name,
          ci: transplantCase.patient.id,
          reason: error.message
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log(`✅ Casos corregidos: ${fixed}`);
    console.log(`⚠️  Casos sin registros intraop: ${noRecords}`);
    console.log(`❌ Casos con problemas: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('⚠️  CASOS CON PROBLEMAS (primeros 20):\n');
      errors.slice(0, 20).forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.patient} (CI: ${err.ci})`);
        console.log(`   Razón: ${err.reason}`);
        if (err.duration !== undefined) {
          console.log(`   Duración: ${err.duration} min`);
        }
        if (err.startAt && err.endTime) {
          console.log(`   Inicio: ${new Date(err.startAt).toISOString()}`);
          console.log(`   Fin: ${new Date(err.endTime).toISOString()}`);
        }
        if (err.totalRecords) {
          console.log(`   Total registros en fase: ${err.totalRecords}`);
        }
        console.log('');
      });
    }

    console.log('✅ Corrección de fechas completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEndTimes().catch(console.error);
