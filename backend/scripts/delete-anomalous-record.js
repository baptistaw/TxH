require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteRecord() {
  console.log('\n=== ELIMINANDO REGISTRO POST_REPERFUSION ANÓMALO ===\n');

  const recordId = 'cmi5cgdqv03ol1366iw9l8xni';

  // Primero, mostrar información del registro antes de eliminar
  const record = await prisma.intraopRecord.findUnique({
    where: { id: recordId },
    include: {
      case: {
        include: {
          patient: true
        }
      }
    }
  });

  if (!record) {
    console.log('❌ Registro no encontrado');
    return;
  }

  console.log('📋 REGISTRO A ELIMINAR:\n');
  console.log(`  ID: ${record.id}`);
  console.log(`  Paciente: ${record.case.patient.name} (CI: ${record.case.patient.id})`);
  console.log(`  Fase: ${record.phase}`);
  console.log(`  Timestamp: ${record.timestamp}`);
  console.log(`  Hb: ${record.hb}, Na: ${record.sodium}, Lactato: ${record.lactate}`);
  console.log(`  Creado: ${record.createdAt}`);

  console.log('\n⚠️  RAZÓN DE ELIMINACIÓN:');
  console.log('  - Fecha del registro es MARZO 30, 2024 (no ABRIL 30)');
  console.log('  - No corresponde al caso del trasplante del 30-04-2024');
  console.log('  - Aparece como POST_REPERFUSION antes de la INDUCCION');

  // Verificar si hay registros de fluidos asociados
  const fluidsRecord = await prisma.fluidsAndBlood.findFirst({
    where: {
      caseId: record.caseId,
      timestamp: record.timestamp,
      phase: record.phase
    }
  });

  if (fluidsRecord) {
    console.log('\n🔗 También se eliminará el registro de fluidos asociado:');
    console.log(`  ID: ${fluidsRecord.id}`);
    console.log(`  Timestamp: ${fluidsRecord.timestamp}`);

    await prisma.fluidsAndBlood.delete({
      where: { id: fluidsRecord.id }
    });
    console.log('  ✅ Registro de fluidos eliminado');
  }

  // Eliminar el registro intraoperatorio
  await prisma.intraopRecord.delete({
    where: { id: recordId }
  });

  console.log('\n✅ Registro intraoperatorio eliminado exitosamente');

  // Verificar los registros restantes del caso
  const remainingRecords = await prisma.intraopRecord.findMany({
    where: { caseId: record.caseId },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      phase: true,
      timestamp: true,
      heartRate: true,
      pas: true
    }
  });

  console.log('\n📊 REGISTROS RESTANTES DEL CASO:\n');
  console.log(`Total: ${remainingRecords.length} registros\n`);

  for (let i = 0; i < remainingRecords.length; i++) {
    const r = remainingRecords[i];
    console.log(`${i + 1}. ${r.timestamp.toISOString()} - ${r.phase}`);
    console.log(`   HR: ${r.heartRate || 'N/A'}, PAS: ${r.pas || 'N/A'}`);
  }

  console.log('\n✅ OPERACIÓN COMPLETADA\n');
  console.log('Ahora el primer registro del caso es la INDUCCION (como debe ser).');
}

deleteRecord()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
