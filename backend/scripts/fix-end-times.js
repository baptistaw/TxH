// scripts/fix-end-times.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEndTimes() {
  console.log('\n🔧 CORRIGIENDO HORAS DE FINALIZACIÓN\n');
  console.log('Buscando último registro en orden de prioridad:');
  console.log('  1. CIERRE');
  console.log('  2. VIA_BILIAR');
  console.log('  3. POST_REPERFUSION');
  console.log('  4. PRE_REPERFUSION');
  console.log('  5. ANHEPATICA');
  console.log('  6. DISECCION');
  console.log('  7. INDUCCION');
  console.log('='.repeat(80));

  try {
    // Obtener todos los casos con todos sus registros intraoperatorios
    const cases = await prisma.transplantCase.findMany({
      include: {
        patient: true,
        intraopRecords: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    console.log(`\nTotal de casos: ${cases.length}`);

    // Orden de prioridad de fases (de más específica a más general)
    const phasePriority = [
      'CIERRE',
      'VIA_BILIAR',
      'POST_REPERFUSION',
      'PRE_REPERFUSION',
      'ANHEPATICA',
      'DISECCION',
      'INDUCCION'
    ];

    let updated = 0;
    let skipped = 0;

    for (const transplantCase of cases) {
      let lastRecord = null;
      let usedPhase = null;

      // Buscar el último registro en orden de prioridad
      for (const phase of phasePriority) {
        const recordsInPhase = transplantCase.intraopRecords.filter(r => r.phase === phase);
        if (recordsInPhase.length > 0) {
          // Ya están ordenados por timestamp desc, así que tomamos el primero
          lastRecord = recordsInPhase[0];
          usedPhase = phase;
          break;
        }
      }

      if (lastRecord) {
        const startAt = transplantCase.startAt;
        const endAt = lastRecord.timestamp;

        // Calcular duración en minutos
        const duration = startAt && endAt
          ? Math.round((new Date(endAt) - new Date(startAt)) / (1000 * 60))
          : null;

        console.log(`\n${transplantCase.patient.name} (CI: ${transplantCase.patientId})`);
        console.log(`  Fase usada: ${usedPhase}`);
        console.log(`  Inicio: ${startAt ? new Date(startAt).toLocaleString('es-UY', { timeZone: 'America/Montevideo' }) : 'N/A'}`);
        console.log(`  Fin (anterior): ${transplantCase.endAt ? new Date(transplantCase.endAt).toLocaleString('es-UY', { timeZone: 'America/Montevideo' }) : 'N/A'}`);
        console.log(`  Fin (nuevo): ${new Date(endAt).toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}`);
        console.log(`  Duración: ${duration} minutos (${(duration / 60).toFixed(1)} horas)`);

        await prisma.transplantCase.update({
          where: { id: transplantCase.id },
          data: {
            endAt: endAt,
            duration: duration
          }
        });

        updated++;
      } else {
        console.log(`\n${transplantCase.patient.name} (CI: ${transplantCase.patientId})`);
        console.log(`  ⚠️  No tiene registros intraoperatorios, no se puede determinar hora de fin`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log(`✅ Casos actualizados: ${updated}`);
    console.log(`⏭️  Casos sin registros intraoperatorios: ${skipped}`);
    console.log('\n✅ Corrección completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEndTimes().catch(console.error);
