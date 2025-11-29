// scripts/cleanup-duplicates.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('\n🧹 LIMPIANDO CASOS DUPLICADOS\n');

  try {
    // Obtener todos los casos agrupados por paciente
    const allCases = await prisma.transplantCase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true
      }
    });

    console.log(`Total de casos en BD: ${allCases.length}`);

    // Agrupar por paciente
    const casesByPatient = {};
    allCases.forEach(c => {
      if (!casesByPatient[c.patientId]) {
        casesByPatient[c.patientId] = [];
      }
      casesByPatient[c.patientId].push(c);
    });

    console.log(`Total de pacientes: ${Object.keys(casesByPatient).length}\n`);

    let deletedCases = 0;
    let deletedPreops = 0;
    let deletedPostOps = 0;
    let deletedTeams = 0;

    // Para cada paciente, mantener solo el caso más reciente
    for (const [patientId, cases] of Object.entries(casesByPatient)) {
      if (cases.length > 1) {
        // Ordenar por fecha de creación (más reciente primero)
        cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const mostRecent = cases[0];
        const duplicates = cases.slice(1);

        console.log(`Paciente ${patientId}: ${cases.length} casos, eliminando ${duplicates.length} duplicados`);
        console.log(`  Mantener: ${mostRecent.id} (creado ${new Date(mostRecent.createdAt).toLocaleString('es-UY')})`);

        // Eliminar duplicados
        for (const duplicate of duplicates) {
          console.log(`  Eliminar: ${duplicate.id} (creado ${new Date(duplicate.createdAt).toLocaleString('es-UY')})`);

          // Eliminar registros relacionados
          const deletedTeam = await prisma.teamAssignment.deleteMany({
            where: { caseId: duplicate.id }
          });
          deletedTeams += deletedTeam.count;

          const deletedPreop = await prisma.preopEvaluation.deleteMany({
            where: { caseId: duplicate.id }
          });
          deletedPreops += deletedPreop.count;

          const deletedPostOp = await prisma.postOpOutcome.deleteMany({
            where: { caseId: duplicate.id }
          });
          deletedPostOps += deletedPostOp.count;

          const deletedIntraop = await prisma.intraopRecord.deleteMany({
            where: { caseId: duplicate.id }
          });

          const deletedFluids = await prisma.fluidsAndBlood.deleteMany({
            where: { caseId: duplicate.id }
          });

          // Eliminar el caso
          await prisma.transplantCase.delete({
            where: { id: duplicate.id }
          });

          deletedCases++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE LIMPIEZA');
    console.log('='.repeat(80));
    console.log(`🗑️  Casos eliminados: ${deletedCases}`);
    console.log(`🗑️  Evaluaciones preop eliminadas: ${deletedPreops}`);
    console.log(`🗑️  Resultados postop eliminados: ${deletedPostOps}`);
    console.log(`🗑️  Asignaciones de equipo eliminadas: ${deletedTeams}`);

    // Verificar casos restantes
    const remainingCases = await prisma.transplantCase.count();
    console.log(`\n✅ Casos restantes en BD: ${remainingCases}`);

    console.log('\n✅ Limpieza completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates().catch(console.error);
