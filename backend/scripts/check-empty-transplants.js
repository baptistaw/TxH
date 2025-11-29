// scripts/check-empty-transplants.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmptyTransplants() {
  try {
    console.log('🔍 Verificando casos con datos vacíos...\n');

    // Buscar los casos específicos mencionados
    const cis = ['11471808', '11394995', '11120693', '10437291'];

    for (const ci of cis) {
      console.log(`\n📋 Buscando CI: ${ci}`);

      // Buscar por patient ID
      const cases = await prisma.transplantCase.findMany({
        where: {
          patientId: ci
        },
        include: {
          patient: {
            select: { id: true, ciRaw: true, name: true, sex: true }
          },
          team: {
            include: {
              clinician: { select: { id: true, name: true } }
            }
          }
        }
      });

      // También buscar por ciRaw
      const casesByRaw = await prisma.transplantCase.findMany({
        where: {
          patient: { ciRaw: { contains: ci.substring(0, 7) } }
        },
        include: {
          patient: {
            select: { id: true, ciRaw: true, name: true, sex: true }
          },
          team: {
            include: {
              clinician: { select: { id: true, name: true } }
            }
          }
        }
      });

      const allCases = [...cases, ...casesByRaw];

      if (allCases.length === 0) {
        console.log(`  ❌ No se encontraron casos`);
        continue;
      }

      console.log(`  ✅ Encontrados: ${allCases.length} casos`);

      allCases.forEach((c, idx) => {
        console.log(`\n  Caso ${idx + 1}:`);
        console.log(`    ID: ${c.id}`);
        console.log(`    Paciente: ${c.patient.name} (${c.patient.ciRaw})`);
        console.log(`    Fecha inicio: ${c.startAt}`);
        console.log(`    Fecha fin: ${c.endAt}`);
        console.log(`    Duración: ${c.duration} min`);
        console.log(`    Retrasplante: ${c.isRetransplant}`);
        console.log(`    Hepato-renal: ${c.isHepatoRenal}`);
        console.log(`    Equipo: ${c.team.length} miembros`);
        if (c.team.length > 0) {
          c.team.forEach(t => {
            console.log(`      - ${t.role}: ${t.clinician.name}`);
          });
        }
      });
    }

    // Estadísticas generales
    console.log('\n\n📊 Estadísticas generales:');

    const totalCases = await prisma.transplantCase.count();
    console.log(`  Total de casos: ${totalCases}`);

    const casesWithoutDates = await prisma.transplantCase.count({
      where: { startAt: null }
    });
    console.log(`  Casos sin fecha de inicio: ${casesWithoutDates}`);

    const casesWithoutTeam = await prisma.transplantCase.count({
      where: { team: { none: {} } }
    });
    console.log(`  Casos sin equipo asignado: ${casesWithoutTeam}`);

    const casesWithoutDuration = await prisma.transplantCase.count({
      where: { duration: null }
    });
    console.log(`  Casos sin duración: ${casesWithoutDuration}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmptyTransplants();
