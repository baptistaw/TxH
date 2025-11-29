// scripts/check-remaining-procedures.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('🔍 Procedimientos sin clínico asignado:\n');

    const procedures = await prisma.procedure.findMany({
      where: { clinicianId: null },
      include: {
        patient: {
          select: { id: true, ciRaw: true, name: true }
        }
      }
    });

    console.log(`Total: ${procedures.length}\n`);

    procedures.forEach((proc, idx) => {
      console.log(`${idx + 1}. Procedure ID: ${proc.id}`);
      console.log(`   Paciente: ${proc.patient.name}`);
      console.log(`   CI: ${proc.patient.ciRaw}`);
      console.log(`   Fecha: ${proc.startAt}`);
      console.log(`   Tipo: ${proc.procedureType}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
