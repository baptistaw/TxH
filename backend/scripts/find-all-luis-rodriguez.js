// scripts/find-all-luis-rodriguez.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPatients() {
  try {
    console.log('🔍 Buscando pacientes con "Luis" o "Rodriguez"...\n');

    const patientsWithLuis = await prisma.patient.findMany({
      where: {
        name: {
          contains: 'Luis',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            preops: true
          }
        }
      }
    });

    const patientsWithRodriguez = await prisma.patient.findMany({
      where: {
        name: {
          contains: 'Rodriguez',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            preops: true
          }
        }
      }
    });

    console.log(`Pacientes con "Luis": ${patientsWithLuis.length}`);
    patientsWithLuis.forEach(p => {
      console.log(`  - ${p.name} (CI: ${p.id}) - ${p._count.preops} evaluación(es)`);
    });

    console.log(`\nPacientes con "Rodriguez": ${patientsWithRodriguez.length}`);
    patientsWithRodriguez.forEach(p => {
      console.log(`  - ${p.name} (CI: ${p.id}) - ${p._count.preops} evaluación(es)`);
    });

    // Find patients with multiple preops
    console.log('\n\n🔍 Buscando pacientes con múltiples evaluaciones preoperatorias:\n');

    const allPatients = await prisma.patient.findMany({
      include: {
        _count: {
          select: {
            preops: true
          }
        }
      },
      where: {
        preops: {
          some: {}
        }
      }
    });

    const patientsWithMultiplePreops = allPatients.filter(p => p._count.preops > 1);

    console.log(`Total pacientes con múltiples evaluaciones: ${patientsWithMultiplePreops.length}\n`);

    patientsWithMultiplePreops
      .sort((a, b) => b._count.preops - a._count.preops)
      .slice(0, 10)
      .forEach(p => {
        console.log(`  - ${p.name} (CI: ${p.id}) - ${p._count.preops} evaluaciones`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPatients();
