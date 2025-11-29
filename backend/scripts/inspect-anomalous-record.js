require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('\n=== INSPECCIONANDO REGISTRO ANÓMALO POST_REPERFUSION ===\n');

  // Buscar el caso de Nilda Godoy del 30-04-24
  const nildaCase = await prisma.transplantCase.findFirst({
    where: {
      patientId: '35702396',
      startAt: {
        gte: new Date('2024-04-30T00:00:00'),
        lt: new Date('2024-05-01T00:00:00')
      }
    },
    include: {
      patient: true,
      intraopRecords: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!nildaCase) {
    console.log('No se encontró el caso de Nilda Godoy');
    return;
  }

  console.log(`Caso de Nilda Godoy (${nildaCase.id}):`);
  console.log(`Start: ${nildaCase.startAt}`);
  console.log(`End: ${nildaCase.endAt}`);
  console.log(`Total registros intraop: ${nildaCase.intraopRecords.length}\n`);

  // Mostrar todos los registros en orden cronológico
  console.log('TODOS LOS REGISTROS INTRAOPERATORIOS (orden cronológico):\n');

  for (let i = 0; i < nildaCase.intraopRecords.length; i++) {
    const r = nildaCase.intraopRecords[i];
    console.log(`${i + 1}. ID: ${r.id}`);
    console.log(`   Timestamp: ${r.timestamp}`);
    console.log(`   Fase: ${r.phase}`);
    console.log(`   HR: ${r.heartRate || 'N/A'}, SatO2: ${r.satO2 || 'N/A'}`);
    console.log(`   PAS: ${r.pas || 'N/A'}, PAD: ${r.pad || 'N/A'}, PAM: ${r.pam || 'N/A'}`);
    console.log(`   Hb: ${r.hb || 'N/A'}, Hto: ${r.hto || 'N/A'}`);
    console.log(`   Na: ${r.sodium || 'N/A'}, K: ${r.potassium || 'N/A'}`);
    console.log(`   Lactato: ${r.lactate || 'N/A'}, pH: ${r.pH || 'N/A'}`);
    console.log(`   Suspicious: ${r.suspicious}`);
    console.log(`   CreatedAt: ${r.createdAt}`);
    console.log('');
  }

  // Enfoque en el registro POST_REPERFUSION
  const postReperfRecord = nildaCase.intraopRecords.find(r => r.phase === 'POST_REPERFUSION');

  if (postReperfRecord) {
    console.log('\n🚨 REGISTRO POST_REPERFUSION ANÓMALO:\n');
    console.log(JSON.stringify(postReperfRecord, null, 2));
  }

  // Comparar con el siguiente registro (INDUCCION)
  const induccionRecord = nildaCase.intraopRecords.find(r => r.phase === 'INDUCCION');

  if (induccionRecord) {
    console.log('\n✓ REGISTRO DE INDUCCION (debería ser el primero):\n');
    console.log(`Timestamp: ${induccionRecord.timestamp}`);
    console.log(`HR: ${induccionRecord.heartRate}, PAS: ${induccionRecord.pas}`);
  }

  // Verificar si el registro POST_REPERFUSION tiene datos
  if (postReperfRecord) {
    console.log('\n\n=== ANÁLISIS DEL REGISTRO POST_REPERFUSION ===\n');

    const fields = Object.keys(postReperfRecord);
    const nonNullFields = fields.filter(f => {
      const value = postReperfRecord[f];
      return value !== null && value !== undefined && value !== false &&
             f !== 'id' && f !== 'caseId' && f !== 'phase' &&
             f !== 'timestamp' && f !== 'createdAt' && f !== 'suspicious';
    });

    console.log(`Campos con datos (no-null): ${nonNullFields.length}`);
    console.log('Campos con datos:');
    for (const field of nonNullFields) {
      console.log(`  - ${field}: ${postReperfRecord[field]}`);
    }

    if (nonNullFields.length === 0) {
      console.log('\n⚠️  El registro POST_REPERFUSION está VACÍO (solo metadata)');
      console.log('   Esto sugiere que fue creado por error o como placeholder');
    }
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
