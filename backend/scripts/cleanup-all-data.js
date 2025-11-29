// scripts/cleanup-all-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAllData() {
  console.log('\n🧹 LIMPIANDO TODOS LOS DATOS\n');

  try {
    // Eliminar en orden (respetando las relaciones)
    console.log('Eliminando registros intraoperatorios...');
    const deletedIntraop = await prisma.intraopRecord.deleteMany({});
    console.log(`  ✓ ${deletedIntraop.count} registros intraoperatorios eliminados`);

    console.log('Eliminando fluidos y hemoderivados...');
    const deletedFluids = await prisma.fluidsAndBlood.deleteMany({});
    console.log(`  ✓ ${deletedFluids.count} registros de fluidos eliminados`);

    console.log('Eliminando asignaciones de equipo...');
    const deletedTeam = await prisma.teamAssignment.deleteMany({});
    console.log(`  ✓ ${deletedTeam.count} asignaciones de equipo eliminadas`);

    console.log('Eliminando líneas y monitoreo...');
    const deletedLines = await prisma.linesAndMonitoring.deleteMany({});
    console.log(`  ✓ ${deletedLines.count} registros de líneas eliminados`);

    console.log('Eliminando evaluaciones preoperatorias...');
    const deletedPreop = await prisma.preopEvaluation.deleteMany({});
    console.log(`  ✓ ${deletedPreop.count} evaluaciones preop eliminadas`);

    console.log('Eliminando resultados postoperatorios...');
    const deletedPostop = await prisma.postOpOutcome.deleteMany({});
    console.log(`  ✓ ${deletedPostop.count} resultados postop eliminados`);

    console.log('Eliminando casos de trasplante...');
    const deletedCases = await prisma.transplantCase.deleteMany({});
    console.log(`  ✓ ${deletedCases.count} casos eliminados`);

    console.log('Eliminando pacientes...');
    const deletedPatients = await prisma.patient.deleteMany({});
    console.log(`  ✓ ${deletedPatients.count} pacientes eliminados`);

    console.log('\n✅ Limpieza completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllData().catch(console.error);
