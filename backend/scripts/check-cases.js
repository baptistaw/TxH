// scripts/check-cases.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCases() {
  console.log('\n📋 VERIFICANDO CASOS EN LA BASE DE DATOS\n');

  try {
    // Get all cases
    const cases = await prisma.transplantCase.findMany({
      include: {
        patient: {
          select: {
            name: true,
            ciRaw: true
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
    const targetCaseId = 'cmhyzhydc0003arfam04fx2br';
    const importedCase = await prisma.transplantCase.findUnique({
      where: { id: targetCaseId },
      include: {
        patient: true
      }
    });

    if (importedCase) {
      console.log('\n✅ El caso con datos importados SÍ existe en la BD\n');
      console.log('Detalles:');
      console.log('  ID:', importedCase.id);
      console.log('  Paciente ID:', importedCase.patientId);
      console.log('  Estado:', importedCase.status);
      console.log('  Paciente existe:', importedCase.patient ? 'Sí' : 'No');
      if (importedCase.patient) {
        console.log('  Nombre paciente:', importedCase.patient.name);
      }
    } else {
      console.log(`\n❌ El caso '${targetCaseId}' NO existe en la BD\n`);
      console.log('Los registros intraoperatorios están huérfanos (sin caso padre).\n');
      console.log('SOLUCIÓN: Necesitamos crear el caso y el paciente primero.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCases().catch(console.error);
