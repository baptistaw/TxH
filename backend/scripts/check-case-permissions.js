// scripts/check-case-permissions.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    // Buscar usuario baptistaw@gmail.com
    console.log('🔍 Verificando permisos de baptistaw@gmail.com\n');

    const user = await prisma.clinician.findUnique({
      where: { email: 'baptistaw@gmail.com' },
      select: { id: true, name: true, email: true, userRole: true }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.userRole}`);

    // Buscar el caso del paciente 33263603
    console.log('\n\n📋 Buscando caso del paciente CI: 33263603\n');

    const cases = await prisma.transplantCase.findMany({
      where: {
        patient: {
          ciRaw: { contains: '3326360' }
        }
      },
      include: {
        patient: {
          select: { id: true, ciRaw: true, name: true }
        },
        team: {
          include: {
            clinician: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (cases.length === 0) {
      console.log('❌ No se encontraron casos para ese CI');
      return;
    }

    console.log(`✅ Encontrados ${cases.length} caso(s)\n`);

    cases.forEach((c, idx) => {
      console.log(`Caso ${idx + 1}:`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Paciente: ${c.patient.name} (${c.patient.ciRaw})`);
      console.log(`   Fecha: ${c.startAt}`);
      console.log(`   Equipo (${c.team.length} miembros):`);

      if (c.team.length === 0) {
        console.log(`      (Sin equipo asignado)`);
      } else {
        c.team.forEach(t => {
          const isCurrentUser = t.clinician.id === user.id;
          console.log(`      ${isCurrentUser ? '👉' : '  '} ${t.role}: ${t.clinician.name} (ID: ${t.clinician.id})`);
        });
      }

      const userInTeam = c.team.some(t => t.clinician.id === user.id);
      console.log(`\n   ¿Usuario en equipo? ${userInTeam ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   ¿Es ADMIN? ${user.userRole === 'ADMIN' ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
