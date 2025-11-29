// scripts/analyze-preops.js
// Analiza la distribución de evaluaciones preoperatorias por clínico

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePreops() {
  // Total de preops
  const total = await prisma.preopEvaluation.count();

  // Distribución por clínico
  const byClinician = await prisma.preopEvaluation.groupBy({
    by: ['clinicianId'],
    _count: true,
    orderBy: { _count: { clinicianId: 'desc' } }
  });

  // Preops sin clínico asignado
  const withoutClinician = await prisma.preopEvaluation.count({
    where: { clinicianId: null }
  });

  console.log('═'.repeat(80));
  console.log('📊 ANÁLISIS DE EVALUACIONES PREOPERATORIAS');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Total de evaluaciones:', total);
  console.log('Sin clínico asignado:', withoutClinician, '(' + ((withoutClinician/total)*100).toFixed(1) + '%)');
  console.log('');
  console.log('Distribución por clínico:');
  console.log('');

  for (const item of byClinician) {
    if (item.clinicianId !== null) {
      const clinician = await prisma.clinician.findUnique({
        where: { id: item.clinicianId }
      });
      console.log('  -', clinician?.name || 'ID: ' + item.clinicianId, ':', item._count, 'evaluaciones');
    }
  }

  // Buscar si Victoria Formoso existe y su ID
  console.log('');
  console.log('─'.repeat(80));
  console.log('Buscando Victoria Formoso en la base de datos...');
  console.log('');

  const victorias = await prisma.clinician.findMany({
    where: {
      OR: [
        { name: { contains: 'Victoria', mode: 'insensitive' } },
        { name: { contains: 'Formoso', mode: 'insensitive' } }
      ]
    }
  });

  if (victorias.length > 0) {
    console.log('Clínicos encontrados:');
    victorias.forEach(v => {
      console.log(`  - ID ${v.id}: ${v.name} (${v.specialty}) - Email: ${v.email}`);
    });
  } else {
    console.log('⚠️  No se encontró Victoria Formoso en la base de datos');
  }

  await prisma.$disconnect();
}

analyzePreops().catch(e => {
  console.error(e);
  process.exit(1);
});
