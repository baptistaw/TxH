// scripts/analyze-procedure-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  try {
    // Count total procedures
    const totalProcs = await prisma.procedure.count();
    console.log('Total procedures in DB:', totalProcs);

    // Count procedures without clinician
    const withoutClinician = await prisma.procedure.count({ where: { clinicianId: null } });
    console.log('Procedures without clinician:', withoutClinician);

    // Count procedures with clinician
    const withClinician = await prisma.procedure.count({ where: { clinicianId: { not: null } } });
    console.log('Procedures with clinician:', withClinician);

    // Get some examples of procedures with patients
    const examples = await prisma.procedure.findMany({
      take: 5,
      include: { patient: { select: { id: true, ciRaw: true, name: true } } }
    });

    console.log('\nExamples of procedures:');
    examples.forEach(p => {
      console.log(`  Procedure: ${p.id}, Patient CI: ${p.patient.ciRaw}, Name: ${p.patient.name}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
