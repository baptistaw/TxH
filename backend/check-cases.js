const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCases() {
  try {
    const cases = await prisma.case.findMany({
      include: {
        patient: {
          select: {
            name: true,
            ci: true
          }
        },
        _count: {
          select: {
            intraopRecords: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n📋 CASOS EN LA BASE DE DATOS\n');
    console.log('Total de casos:', cases.length);
    console.log('='.repeat(80));

    if (cases.length === 0) {
      console.log('\n⚠️  No hay casos en la base de datos\n');
    } else {
      cases.forEach((c, idx) => {
        console.log(`\n[${idx + 1}] ID: ${c.id}`);
        console.log(`    Paciente: ${c.patient?.name || 'Sin nombre'} - CI: ${c.patientId}`);
        console.log(`    Estado: ${c.status}`);
        console.log(`    Fecha cirugía: ${c.surgeryDate ? new Date(c.surgeryDate).toLocaleDateString('es-UY') : 'No definida'}`);
        console.log(`    Registros intraop: ${c._count.intraopRecords}`);
        console.log(`    Creado: ${new Date(c.createdAt).toLocaleDateString('es-UY')}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Check specifically for the imported case
    const importedCase = await prisma.case.findUnique({
      where: { id: 'cmhyzhydc0003arfam04fx2br' },
      include: {
        patient: true
      }
    });

    if (importedCase) {
      console.log('\n✅ El caso con datos importados SÍ existe en la BD\n');
      console.log('Detalles del caso:');
      console.log('  ID:', importedCase.id);
      console.log('  Paciente ID:', importedCase.patientId);
      console.log('  Estado:', importedCase.status);
      console.log('  Paciente existe:', importedCase.patient ? 'Sí' : 'No');
    } else {
      console.log('\n❌ El caso con datos importados NO existe en la BD\n');
      console.log('Necesitamos crear el caso primero antes de importar los registros intraop\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCases();
