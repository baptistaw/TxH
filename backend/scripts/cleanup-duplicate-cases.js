// scripts/cleanup-duplicate-cases.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('🧹 Limpiando casos duplicados...\n');

    // Los 4 casos duplicados identificados con fecha NULL
    const duplicateGroups = [
      {
        patient: 'Americo Devera (1043729)',
        ids: ['cmi4to5w70001rvs41nuwn5v2', 'cmi4pssql00rzu2jhfhk84w6i']
      },
      {
        patient: 'María Rodriguez (1112069)',
        ids: ['cmi4pssqt00s7u2jhypq6jtnv', 'cmi4to5ws0003rvs4gy5llh8b']
      },
      {
        patient: 'Hector SIlvera (1139499)',
        ids: ['cmi4pssqz00sfu2jhqt4wjehd', 'cmi4to5xa0005rvs46cpdy4un']
      },
      {
        patient: 'Nelly Farias (1147180)',
        ids: ['cmi4to5xv0007rvs4cqdqbks0', 'cmi4pssr600snu2jhrxzujon9']
      }
    ];

    let deletedCount = 0;

    for (const group of duplicateGroups) {
      console.log(`\n📋 Procesando: ${group.patient}`);
      console.log(`   IDs: ${group.ids.join(', ')}`);

      // Verificar que ambos casos existan
      const cases = await prisma.transplantCase.findMany({
        where: { id: { in: group.ids } },
        include: {
          team: true,
          preops: true,
          intraopRecords: true,
          postOp: true,
          linesMonitoring: true
        }
      });

      if (cases.length !== 2) {
        console.log(`   ⚠️  Esperaba 2 casos, encontré ${cases.length}. Saltando...`);
        continue;
      }

      // Determinar cuál mantener (el que tiene más datos o el más antiguo)
      let toKeep, toDelete;

      const case1Score =
        (cases[0].team.length > 0 ? 10 : 0) +
        (cases[0].preops.length > 0 ? 5 : 0) +
        (cases[0].intraopRecords.length > 0 ? 5 : 0) +
        (cases[0].postOp ? 5 : 0) +
        (cases[0].linesMonitoring ? 3 : 0);

      const case2Score =
        (cases[1].team.length > 0 ? 10 : 0) +
        (cases[1].preops.length > 0 ? 5 : 0) +
        (cases[1].intraopRecords.length > 0 ? 5 : 0) +
        (cases[1].postOp ? 5 : 0) +
        (cases[1].linesMonitoring ? 3 : 0);

      if (case1Score > case2Score) {
        toKeep = cases[0];
        toDelete = cases[1];
      } else if (case2Score > case1Score) {
        toKeep = cases[1];
        toDelete = cases[0];
      } else {
        // Si tienen el mismo score, mantener el creado primero
        toKeep = cases[0].createdAt < cases[1].createdAt ? cases[0] : cases[1];
        toDelete = cases[0].createdAt < cases[1].createdAt ? cases[1] : cases[0];
      }

      console.log(`   ✅ Mantener: ${toKeep.id} (score: ${case1Score === toKeep.id ? case1Score : case2Score})`);
      console.log(`   🗑️  Eliminar: ${toDelete.id} (score: ${case1Score === toDelete.id ? case1Score : case2Score})`);

      // Eliminar el caso duplicado
      try {
        await prisma.transplantCase.delete({
          where: { id: toDelete.id }
        });

        deletedCount++;
        console.log(`   ✅ Eliminado exitosamente`);
      } catch (error) {
        console.log(`   ❌ Error al eliminar: ${error.message}`);
      }
    }

    console.log(`\n\n📊 Resumen:`);
    console.log(`  Casos duplicados eliminados: ${deletedCount}`);

    // Verificar totales finales
    const finalCount = await prisma.transplantCase.count();
    console.log(`  Total de casos después de limpieza: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
