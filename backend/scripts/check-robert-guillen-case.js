// scripts/check-robert-guillen-case.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCase() {
  try {
    console.log('🔍 Buscando caso de Robert Guillen (CI: 3.326.307-3)\n');

    const cases = await prisma.transplantCase.findMany({
      where: {
        OR: [
          { patient: { ciRaw: { contains: '3326307' } } },
          { patient: { id: { contains: '3326307' } } },
          { patient: { name: { contains: 'Robert', mode: 'insensitive' } } },
          { patient: { name: { contains: 'Guillen', mode: 'insensitive' } } }
        ]
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
      console.log('❌ No se encontraron casos');
      return;
    }

    console.log(`✅ Encontrados ${cases.length} caso(s)\n`);

    cases.forEach((c, idx) => {
      console.log(`Caso ${idx + 1}:`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Paciente: ${c.patient.name}`);
      console.log(`   CI Raw: ${c.patient.ciRaw}`);
      console.log(`   CI Normalizado: ${c.patient.id}`);
      console.log(`   Fecha: ${c.startAt}`);
      console.log(`   Equipo (${c.team.length} miembros):`);

      if (c.team.length === 0) {
        console.log(`      ⚠️  Sin equipo asignado`);
      } else {
        c.team.forEach(t => {
          const isBaptista = t.clinician.email === 'baptistaw@gmail.com';
          console.log(`      ${isBaptista ? '👉' : '  '} ${t.role}: ${t.clinician.name} (ID: ${t.clinician.id})`);
        });
      }

      const baptistaInTeam = c.team.some(t => t.clinician.email === 'baptistaw@gmail.com');
      console.log(`\n   ¿baptistaw@gmail.com en equipo? ${baptistaInTeam ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCase();
