// scripts/find-duplicate-cases.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDuplicates() {
  try {
    console.log('🔍 Buscando casos duplicados...\n');

    // Obtener todos los casos
    const allCases = await prisma.transplantCase.findMany({
      include: {
        patient: { select: { id: true, name: true, ciRaw: true } }
      },
      orderBy: [
        { patientId: 'asc' },
        { startAt: 'asc' }
      ]
    });

    console.log(`Total de casos: ${allCases.length}\n`);

    // Agrupar por patientId + startAt para encontrar duplicados
    const groupedByPatientAndDate = {};

    allCases.forEach(c => {
      const key = `${c.patientId}_${c.startAt ? c.startAt.toISOString() : 'NULL'}`;

      if (!groupedByPatientAndDate[key]) {
        groupedByPatientAndDate[key] = [];
      }

      groupedByPatientAndDate[key].push(c);
    });

    // Encontrar grupos con duplicados
    const duplicateGroups = Object.entries(groupedByPatientAndDate)
      .filter(([key, cases]) => cases.length > 1);

    console.log(`📊 Grupos de casos duplicados: ${duplicateGroups.length}\n`);

    if (duplicateGroups.length === 0) {
      console.log('✅ No se encontraron duplicados exactos por patientId+fecha\n');

      // Buscar casos con mismo paciente sin importar fecha
      const groupedByPatient = {};
      allCases.forEach(c => {
        if (!groupedByPatient[c.patientId]) {
          groupedByPatient[c.patientId] = [];
        }
        groupedByPatient[c.patientId].push(c);
      });

      const multiCasePatients = Object.entries(groupedByPatient)
        .filter(([pid, cases]) => cases.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

      console.log(`\n📋 Pacientes con múltiples casos: ${multiCasePatients.length}\n`);

      console.log('Top 10 pacientes con más casos:');
      multiCasePatients.slice(0, 10).forEach(([pid, cases]) => {
        const patient = cases[0].patient;
        console.log(`\n  ${patient.name} (CI: ${patient.ciRaw})`);
        console.log(`    Total de casos: ${cases.length}`);
        cases.forEach((c, idx) => {
          console.log(`    ${idx + 1}. ID: ${c.id.substring(0, 12)}... | Fecha: ${c.startAt || 'NULL'} | Retx: ${c.isRetransplant}`);
        });
      });

      return;
    }

    // Mostrar primeros 10 grupos de duplicados
    console.log('Primeros 10 grupos de duplicados:\n');

    duplicateGroups.slice(0, 10).forEach(([key, cases], idx) => {
      const patient = cases[0].patient;
      console.log(`${idx + 1}. ${patient.name} (CI: ${patient.ciRaw})`);
      console.log(`   Fecha: ${cases[0].startAt || 'NULL'}`);
      console.log(`   Número de duplicados: ${cases.length}`);
      console.log(`   IDs duplicados:`);
      cases.forEach((c, i) => {
        console.log(`     ${i + 1}. ${c.id}`);
      });
      console.log('');
    });

    // Estadísticas
    const totalDuplicates = duplicateGroups.reduce((sum, [key, cases]) => sum + cases.length, 0);
    const totalUnique = duplicateGroups.length;
    const extraCopies = totalDuplicates - totalUnique;

    console.log('\n📊 Estadísticas:');
    console.log(`  Casos únicos (deberían existir): ${totalUnique}`);
    console.log(`  Copias extras (duplicados a eliminar): ${extraCopies}`);
    console.log(`  Total de casos duplicados: ${totalDuplicates}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDuplicates();
