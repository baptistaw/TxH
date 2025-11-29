// Script de diagnóstico para verificar token y permisos
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzAyMDMsImVtYWlsIjoiYmFwdGlzdGF3QGdtYWlsLmNvbSIsInNwZWNpYWx0eSI6IkFORVNURVNJT0xPR08iLCJyb2xlIjoiQU5FU1RFU0lPTE9HTyIsImlhdCI6MTczMjExMTExNiwiZXhwIjoxNzMyNzE1OTE2fQ.V_kd3K6_dIpGJCjE2PjMZ7jPExQxC1RvD0-8Q1H0gA0";

const prisma = require('./src/lib/prisma');

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE PERMISOS ===\n');

  // Decodificar token
  const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString());
  console.log('1. Token JWT decodificado:');
  console.log(`   User ID: ${payload.id}`);
  console.log(`   Email: ${payload.email}`);
  console.log(`   Rol en token: "${payload.role}" (tipo: ${typeof payload.role})`);
  console.log(`   Especialidad: ${payload.specialty}`);

  const userId = payload.id;
  const userRole = payload.role;

  // Verificar usuario en BD
  console.log('\n2. Usuario en la base de datos:');
  const clinician = await prisma.clinician.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, userRole: true, specialty: true }
  });

  if (clinician) {
    console.log(`   Nombre: ${clinician.name}`);
    console.log(`   Rol en BD: "${clinician.userRole}" (tipo: ${typeof clinician.userRole})`);
    console.log(`   Especialidad: ${clinician.specialty}`);
  } else {
    console.log('   ❌ Usuario no encontrado');
    return;
  }

  // Verificar casos asignados
  console.log('\n3. Casos asignados al usuario:');
  const teamAssignments = await prisma.teamAssignment.findMany({
    where: { clinicianId: userId },
    include: {
      case: {
        select: { id: true, patientId: true, status: true }
      }
    },
    orderBy: { case: { createdAt: 'desc' } },
    take: 5
  });

  if (teamAssignments.length === 0) {
    console.log('   ⚠️  No hay casos asignados a este usuario');
  } else {
    console.log(`   Total de casos asignados: ${teamAssignments.length}`);
    teamAssignments.forEach((assignment, i) => {
      console.log(`   ${i + 1}. Caso ${assignment.case.id} - Paciente ${assignment.case.patientId} - Rol: ${assignment.role}`);
    });
  }

  // Verificar comparación de roles
  console.log('\n4. Verificación de comparaciones de roles:');
  console.log(`   userRole === 'ADMIN': ${userRole === 'ADMIN'}`);
  console.log(`   userRole === 'ANESTESIOLOGO': ${userRole === 'ANESTESIOLOGO'}`);
  console.log(`   userRole !== 'ADMIN': ${userRole !== 'ADMIN'}`);
  console.log(`   userRole !== 'ANESTESIOLOGO': ${userRole !== 'ANESTESIOLOGO'}`);

  // Simular la lógica de canModifyCase
  console.log('\n5. Simulación de canModifyCase:');
  if (userRole === 'ADMIN') {
    console.log('   ✅ Rol es ADMIN → Permiso concedido');
  } else if (userRole !== 'ANESTESIOLOGO') {
    console.log(`   ❌ Rol NO es ANESTESIOLOGO → Permiso DENEGADO`);
  } else {
    console.log('   ✅ Rol es ANESTESIOLOGO → Verificar asignación al equipo');
    if (teamAssignments.length > 0) {
      console.log(`   ✅ Usuario está en ${teamAssignments.length} equipos → Permiso concedido`);
    } else {
      console.log('   ❌ Usuario NO está en ningún equipo → Permiso denegado');
    }
  }

  console.log('\n=== FIN DEL DIAGNÓSTICO ===');
  await prisma.$disconnect();
}

diagnose().catch(console.error);
