require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  console.log('\n=== INVESTIGANDO TRASPLANTE 30-04-24 ===\n');

  // 1. Buscar procedimientos del 30-04-24
  console.log('1. PROCEDIMIENTOS DEL 30-04-24:');
  const procedures = await prisma.procedure.findMany({
    where: {
      startAt: {
        gte: new Date('2024-04-30T00:00:00'),
        lt: new Date('2024-05-01T00:00:00')
      }
    },
    include: {
      patient: true
    }
  });

  for (const proc of procedures) {
    console.log(`\nProcedure ID: ${proc.id}`);
    console.log(`Paciente: ${proc.patient?.name} (CI: ${proc.patient?.id})`);
    console.log(`Tipo: ${proc.procedureType}`);
    console.log(`Start: ${proc.startAt}`);
    console.log(`End: ${proc.endAt}`);
    console.log(`Duration: ${proc.duration} min`);
  }

  // 2. Buscar paciente con CI 35702396
  console.log('\n\n2. PACIENTE CON CI 35702396:');
  const patient35702396 = await prisma.patient.findUnique({
    where: { id: '35702396' }
  });
  if (patient35702396) {
    console.log(`ID: ${patient35702396.id}`);
    console.log(`Nombre: ${patient35702396.name}`);
  } else {
    console.log('No encontrado');
  }

  // 3. Buscar paciente con CI 20193126
  console.log('\n3. PACIENTE CON CI 20193126:');
  const patient20193126 = await prisma.patient.findUnique({
    where: { id: '20193126' }
  });
  if (patient20193126) {
    console.log(`ID: ${patient20193126.id}`);
    console.log(`Nombre: ${patient20193126.name}`);
  } else {
    console.log('No encontrado');
  }

  // 4. Buscar "Nilda Godoy"
  console.log('\n4. BUSCANDO "NILDA GODOY":');
  const nildaPatients = await prisma.patient.findMany({
    where: {
      name: { contains: 'Nilda', mode: 'insensitive' }
    }
  });
  for (const p of nildaPatients) {
    console.log(`ID: ${p.id}, Nombre: ${p.name}`);
  }
  const godoyPatients = await prisma.patient.findMany({
    where: {
      name: { contains: 'Godoy', mode: 'insensitive' }
    }
  });
  for (const p of godoyPatients) {
    console.log(`ID: ${p.id}, Nombre: ${p.name}`);
  }

  // 5. Buscar registros intraoperatorios del 30-04-24 (para procedimientos)
  console.log('\n\n5. REGISTROS INTRAOPERATORIOS DE PROCEDIMIENTOS DEL 30-04-24:');
  const procedureIntraopRecords = await prisma.procedureIntraopRecord.findMany({
    where: {
      timestamp: {
        gte: new Date('2024-04-30T00:00:00'),
        lt: new Date('2024-05-01T00:00:00')
      }
    },
    include: {
      procedure: {
        include: {
          patient: true
        }
      }
    },
    orderBy: { timestamp: 'asc' }
  });

  console.log(`Total registros de procedimientos: ${procedureIntraopRecords.length}`);

  // Agrupar por procedimiento
  const byProcedure = {};
  for (const record of procedureIntraopRecords) {
    const procId = record.procedureId;
    if (!byProcedure[procId]) {
      byProcedure[procId] = {
        procedure: record.procedure,
        records: []
      };
    }
    byProcedure[procId].records.push(record);
  }

  for (const [procId, data] of Object.entries(byProcedure)) {
    console.log(`\n--- Procedure ID: ${procId} ---`);
    console.log(`Paciente: ${data.procedure.patient?.name} (CI: ${data.procedure.patient?.id})`);
    console.log(`Cantidad de registros: ${data.records.length}`);
    console.log(`Primer registro: ${data.records[0].timestamp}`);
    console.log(`Último registro: ${data.records[data.records.length - 1].timestamp}`);

    // Mostrar primeros 3 registros
    console.log('\nPrimeros 3 registros:');
    for (let i = 0; i < Math.min(3, data.records.length); i++) {
      const r = data.records[i];
      console.log(`  ${r.timestamp} - HR: ${r.heartRate || 'N/A'}, PAS: ${r.pas || 'N/A'}, PAM: ${r.pam || 'N/A'}`);
    }
  }

  // 6. Buscar casos de trasplante del 30-04-24
  console.log('\n\n6. CASOS DE TRASPLANTE DEL 30-04-24:');
  const transplantCases = await prisma.transplantCase.findMany({
    where: {
      startAt: {
        gte: new Date('2024-04-30T00:00:00'),
        lt: new Date('2024-05-01T00:00:00')
      }
    },
    include: {
      patient: true,
      intraopRecords: {
        orderBy: { timestamp: 'asc' },
        take: 5
      }
    }
  });

  console.log(`Total casos de trasplante: ${transplantCases.length}`);

  for (const tc of transplantCases) {
    console.log(`\n--- TransplantCase ID: ${tc.id} ---`);
    console.log(`Paciente: ${tc.patient?.name} (CI: ${tc.patient?.id})`);
    console.log(`Start: ${tc.startAt}`);
    console.log(`End: ${tc.endAt}`);
    console.log(`Retrasplante: ${tc.isRetransplant ? 'Sí' : 'No'}`);
    console.log(`Registros intraop: ${tc.intraopRecords.length} (primeros 5)`);

    // Mostrar primeros 5 registros intraop
    if (tc.intraopRecords.length > 0) {
      console.log('\nPrimeros registros intraop:');
      for (const r of tc.intraopRecords) {
        console.log(`  ${r.timestamp} - Phase: ${r.phase}, HR: ${r.heartRate || 'N/A'}, PAS: ${r.pas || 'N/A'}`);
      }
    }
  }

  // 7. Buscar TODOS los registros intraoperatorios del caso de trasplante del 30-04-24
  if (transplantCases.length > 0) {
    console.log('\n\n7. TODOS LOS REGISTROS INTRAOPERATORIOS DEL TRASPLANTE:');
    for (const tc of transplantCases) {
      const allRecords = await prisma.intraopRecord.findMany({
        where: { caseId: tc.id },
        orderBy: { timestamp: 'asc' }
      });

      console.log(`\n--- Caso ${tc.id} (${tc.patient?.name}) ---`);
      console.log(`Total registros: ${allRecords.length}`);

      // Agrupar por fase
      const byPhase = {};
      for (const r of allRecords) {
        if (!byPhase[r.phase]) {
          byPhase[r.phase] = [];
        }
        byPhase[r.phase].push(r);
      }

      console.log('\nDistribución por fase:');
      for (const [phase, records] of Object.entries(byPhase)) {
        console.log(`  ${phase}: ${records.length} registros`);
        console.log(`    Primero: ${records[0].timestamp}`);
        console.log(`    Último: ${records[records.length - 1].timestamp}`);
      }
    }
  }
}

investigate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
