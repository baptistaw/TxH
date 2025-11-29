// scripts/fix-preop-clinician.js
// Asigna evaluaciones preoperatorias sin clínico a Victoria Formoso

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VICTORIA_FORMOSO_ID = 149965;

async function analyzeAndFix() {
  // Obtener evaluaciones sin clínico
  const preopsSinClinico = await prisma.preopEvaluation.findMany({
    where: { clinicianId: null },
    include: {
      patient: {
        include: {
          cases: {
            orderBy: { startAt: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { evaluationDate: 'desc' }
  });

  console.log('═'.repeat(80));
  console.log('📋 EVALUACIONES PREOPERATORIAS SIN CLÍNICO ASIGNADO');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Total:', preopsSinClinico.length);
  console.log('');

  // Agrupar por año
  const porAnio = {};
  preopsSinClinico.forEach(p => {
    const anio = p.evaluationDate ? new Date(p.evaluationDate).getFullYear() : 'Sin fecha';
    porAnio[anio] = (porAnio[anio] || 0) + 1;
  });

  console.log('Distribución por año de evaluación:');
  Object.entries(porAnio)
    .sort((a, b) => b[0] - a[0])
    .forEach(([anio, count]) => {
      console.log(`  ${anio}: ${count} evaluaciones`);
    });

  // Mostrar algunas muestras
  console.log('');
  console.log('─'.repeat(80));
  console.log('Muestra de las primeras 10 evaluaciones (más recientes):');
  console.log('');

  preopsSinClinico.slice(0, 10).forEach((p, i) => {
    const caseDate = p.patient.cases[0]?.startAt
      ? new Date(p.patient.cases[0].startAt).toISOString().split('T')[0]
      : 'Sin caso';
    console.log(`${i + 1}. ${p.patient.name} - Evaluación: ${p.evaluationDate ? new Date(p.evaluationDate).toISOString().split('T')[0] : 'Sin fecha'} - Caso: ${caseDate}`);
  });

  // Si se pasó el flag --fix, asignar a Victoria Formoso
  if (process.argv.includes('--fix')) {
    console.log('');
    console.log('═'.repeat(80));
    console.log('🔧 ASIGNANDO EVALUACIONES A VICTORIA FORMOSO');
    console.log('═'.repeat(80));
    console.log('');

    let updated = 0;
    for (const preop of preopsSinClinico) {
      try {
        await prisma.preopEvaluation.update({
          where: { id: preop.id },
          data: { clinicianId: VICTORIA_FORMOSO_ID }
        });
        updated++;
      } catch (error) {
        console.error(`Error actualizando evaluación ${preop.id}:`, error.message);
      }
    }

    console.log(`✅ ${updated}/${preopsSinClinico.length} evaluaciones asignadas a Victoria Formoso`);
    console.log('');

    // Verificar nueva distribución
    const newStats = await prisma.preopEvaluation.groupBy({
      by: ['clinicianId'],
      _count: true,
      orderBy: { _count: { clinicianId: 'desc' } }
    });

    console.log('Nueva distribución:');
    for (const item of newStats) {
      if (item.clinicianId !== null) {
        const clinician = await prisma.clinician.findUnique({
          where: { id: item.clinicianId }
        });
        console.log(`  - ${clinician?.name || 'ID: ' + item.clinicianId}: ${item._count} evaluaciones`);
      }
    }
  } else {
    console.log('');
    console.log('═'.repeat(80));
    console.log('💡 PARA ASIGNAR ESTAS EVALUACIONES A VICTORIA FORMOSO:');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Ejecuta:');
    console.log('  node scripts/fix-preop-clinician.js --fix');
    console.log('');
  }

  await prisma.$disconnect();
}

analyzeAndFix().catch(e => {
  console.error(e);
  process.exit(1);
});
