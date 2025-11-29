// scripts/fix-overnight-cases.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOvernightCases() {
  console.log('\n🔧 CORRIGIENDO CASOS QUE TERMINARON AL DÍA SIGUIENTE\n');
  console.log('='.repeat(80));

  try {
    // Buscar casos con duración negativa
    const cases = await prisma.transplantCase.findMany({
      where: {
        duration: {
          lt: 0
        }
      },
      include: {
        patient: true
      }
    });

    console.log(`\nCasos con duración negativa: ${cases.length}\n`);

    for (const transplantCase of cases) {
      const startAt = new Date(transplantCase.startAt);
      const endAt = new Date(transplantCase.endAt);

      // Agregar 1 día a endAt
      const correctedEndAt = new Date(endAt);
      correctedEndAt.setDate(correctedEndAt.getDate() + 1);

      // Recalcular duración
      const duration = Math.round((correctedEndAt - startAt) / (1000 * 60));

      console.log(`${transplantCase.patient.name} (CI: ${transplantCase.patientId})`);
      console.log(`  Inicio: ${startAt.toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}`);
      console.log(`  Fin (anterior): ${endAt.toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}`);
      console.log(`  Fin (corregido): ${correctedEndAt.toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}`);
      console.log(`  Duración (anterior): ${transplantCase.duration} minutos`);
      console.log(`  Duración (nueva): ${duration} minutos (${(duration / 60).toFixed(1)} horas)\n`);

      await prisma.transplantCase.update({
        where: { id: transplantCase.id },
        data: {
          endAt: correctedEndAt,
          duration: duration
        }
      });
    }

    console.log('='.repeat(80));
    console.log(`✅ ${cases.length} casos corregidos\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixOvernightCases().catch(console.error);
