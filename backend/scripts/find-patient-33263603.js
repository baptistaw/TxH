// scripts/find-patient-33263603.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPatient() {
  try {
    console.log('🔍 Buscando paciente con CI: 33263603\n');

    // Buscar por diferentes variaciones
    const searches = [
      '33263603',
      '3326360',
      '332636033', // con DV
      '33263603',
    ];

    for (const search of searches) {
      console.log(`Buscando: ${search}`);

      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { id: { contains: search } },
            { ciRaw: { contains: search } }
          ]
        },
        select: {
          id: true,
          ciRaw: true,
          name: true,
          cases: {
            select: {
              id: true,
              startAt: true,
              team: {
                include: {
                  clinician: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        }
      });

      if (patients.length > 0) {
        console.log(`\n✅ Encontrados ${patients.length} paciente(s):\n`);

        patients.forEach(p => {
          console.log(`Paciente: ${p.name}`);
          console.log(`   ID: ${p.id}`);
          console.log(`   CI Raw: ${p.ciRaw}`);
          console.log(`   Casos: ${p.cases.length}`);

          p.cases.forEach((c, idx) => {
            console.log(`\n   Caso ${idx + 1}:`);
            console.log(`      ID: ${c.id}`);
            console.log(`      Fecha: ${c.startAt}`);
            console.log(`      Equipo (${c.team.length} miembros):`);

            if (c.team.length === 0) {
              console.log(`         (Sin equipo asignado)`);
            } else {
              c.team.forEach(t => {
                console.log(`         ${t.role}: ${t.clinician.name} (ID: ${t.clinician.id}, Email: ${t.clinician.email})`);
              });
            }
          });

          console.log('');
        });

        return;
      }
    }

    console.log('❌ No se encontró el paciente con ninguna variación del CI');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPatient();
