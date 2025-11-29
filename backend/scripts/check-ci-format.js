// Script para verificar el formato de CI en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCIs() {
  try {
    // Obtener algunos pacientes de muestra
    const patients = await prisma.patient.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    console.log('📋 Formato de CIs en la base de datos:\n');
    patients.forEach(p => {
      console.log(`${p.id} - ${p.name}`);
    });

    console.log(`\n📊 Total pacientes en BD: ${await prisma.patient.count()}`);

    // Verificar si algún CI es solo números
    const numericOnly = patients.filter(p => /^\d+$/.test(p.id));
    console.log(`\nCIs solo numéricos: ${numericOnly.length}`);

    // Verificar si algún CI tiene formato uruguayo (X.XXX.XXX-X)
    const uruguayan = patients.filter(p => /^\d\.\d{3}\.\d{3}-\d$/.test(p.id));
    console.log(`CIs con formato uruguayo: ${uruguayan.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCIs();
