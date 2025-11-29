// scripts/add-catalina-deleon.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addClinician() {
  try {
    console.log('➕ Agregando clínico Catalina de Leon...\n');

    const clinician = await prisma.clinician.create({
      data: {
        id: 157194,
        name: 'Catalina de Leon',
        email: 'catalina.deleon@temp.uy',
        specialty: 'ANESTESIOLOGO'
      }
    });

    console.log('✅ Clínico agregado:');
    console.log(`  ID: ${clinician.id}`);
    console.log(`  Nombre: ${clinician.name}`);
    console.log(`  Especialidad: ${clinician.specialty}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addClinician();
