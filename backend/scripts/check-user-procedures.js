// scripts/check-user-procedures.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserProcedures() {
  try {
    console.log('🔍 Verificando usuarios y procedimientos asignados\n');

    // Obtener todos los usuarios
    const users = await prisma.clinician.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
      },
      orderBy: { name: 'asc' }
    });

    console.log('👥 Usuarios en el sistema:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.userRole}\n`);
    });

    // Para cada usuario, obtener sus procedimientos asignados
    for (const user of users) {
      const procedures = await prisma.procedure.findMany({
        where: { clinicianId: user.id },
        select: {
          id: true,
          patientId: true,
          startAt: true,
          procedureType: true,
        },
        orderBy: { startAt: 'desc' },
        take: 5,
      });

      console.log(`\n📋 Procedimientos asignados a ${user.name}:`);
      console.log(`   Total: ${procedures.length}`);

      if (procedures.length > 0) {
        console.log('   Últimos 5:');
        procedures.forEach((proc, index) => {
          console.log(`   ${index + 1}. ID: ${proc.id} - Paciente: ${proc.patientId} - Fecha: ${new Date(proc.startAt).toLocaleDateString('es-UY')}`);
        });
      } else {
        console.log('   (Sin procedimientos asignados)');
      }
      console.log('');
    }

    // Verificar procedimientos sin clínico asignado
    const unassignedProcedures = await prisma.procedure.count({
      where: { clinicianId: null }
    });

    console.log(`\n⚠️  Procedimientos SIN clínico asignado: ${unassignedProcedures}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserProcedures();
