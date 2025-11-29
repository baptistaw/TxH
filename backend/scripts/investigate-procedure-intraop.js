// scripts/investigate-procedure-intraop.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  try {
    console.log('🔍 Investigando registros intraoperatorios de procedimientos\n');

    // Count total procedures
    const totalProcedures = await prisma.procedure.count();
    console.log(`Total procedimientos: ${totalProcedures}`);

    // Count procedures with intraop records
    const proceduresWithRecords = await prisma.procedure.findMany({
      include: {
        _count: {
          select: {
            intraopRecordsProcedure: true
          }
        }
      }
    });

    const withRecords = proceduresWithRecords.filter(p => p._count.intraopRecordsProcedure > 0);
    console.log(`Procedimientos CON registros intraop: ${withRecords.length}`);
    console.log(`Procedimientos SIN registros intraop: ${totalProcedures - withRecords.length}\n`);

    // Total intraop records
    const totalIntraopRecords = await prisma.procedureIntraopRecord.count();
    console.log(`Total registros intraoperatorios: ${totalIntraopRecords}\n`);

    if (withRecords.length > 0) {
      console.log('📋 Procedimientos con registros intraoperatorios:\n');

      withRecords.slice(0, 10).forEach((proc, index) => {
        console.log(`${index + 1}. Procedimiento ID: ${proc.id}`);
        console.log(`   Paciente: ${proc.patientId}`);
        console.log(`   Fecha: ${proc.startAt}`);
        console.log(`   Tipo: ${proc.procedureType || 'No especificado'}`);
        console.log(`   Registros intraop: ${proc._count.intraopRecordsProcedure}`);
        console.log('');
      });
    }

    // Sample intraop records
    if (totalIntraopRecords > 0) {
      console.log('\n🔍 Muestra de registros intraoperatorios:\n');

      const sampleRecords = await prisma.procedureIntraopRecord.findMany({
        take: 5,
        include: {
          procedure: {
            select: {
              id: true,
              patientId: true,
              startAt: true,
              procedureType: true
            }
          }
        }
      });

      sampleRecords.forEach((record, index) => {
        console.log(`${index + 1}. Registro ID: ${record.id}`);
        console.log(`   Procedimiento ID: ${record.procedureId}`);
        console.log(`   Paciente: ${record.procedure.patientId}`);
        console.log(`   Timestamp: ${record.timestamp}`);
        console.log(`   FC: ${record.heartRate || 'N/A'}, PAS: ${record.pas || 'N/A'}, PAD: ${record.pad || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  NO HAY REGISTROS INTRAOPERATORIOS en ProcedureIntraopRecord\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
