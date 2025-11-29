// scripts/nivel3-flag-suspicious-records.js
// NIVEL 3: Marcar registros dudosos con flag suspicious
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function flagSuspiciousRecords() {
  console.log('\n🚩 NIVEL 3: MARCAR REGISTROS DUDOSOS\n');
  console.log('='.repeat(80));

  try {
    // PASO 1: Obtener todos los trasplantes con fecha
    const cases = await prisma.transplantCase.findMany({
      where: { startAt: { not: null } },
      select: {
        id: true,
        patientId: true,
        startAt: true
      }
    });

    console.log(`\nTrasplantes con fecha en BD: ${cases.length}`);

    // Crear mapa: fecha → Set de CIs con trasplante ese día
    const casesByDate = new Map();
    cases.forEach(c => {
      const dateKey = new Date(c.startAt).toISOString().split('T')[0];
      if (!casesByDate.has(dateKey)) {
        casesByDate.set(dateKey, new Set());
      }
      casesByDate.get(dateKey).add(c.patientId);
    });

    console.log(`Fechas únicas con trasplantes: ${casesByDate.size}\n`);

    // PASO 2: Obtener todos los registros intraop
    const allRecords = await prisma.intraopRecord.findMany({
      include: {
        case: {
          select: {
            id: true,
            patientId: true,
            startAt: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`Total registros intraoperatorios: ${allRecords.length}\n`);

    // PASO 3: Identificar registros dudosos
    console.log('='.repeat(80));
    console.log('\n🔍 IDENTIFICANDO REGISTROS DUDOSOS...\n');

    const suspicious = [];
    const verified = [];

    for (const record of allRecords) {
      const recordDateKey = new Date(record.timestamp).toISOString().split('T')[0];
      const patientId = record.case.patientId;

      // Verificar si hay un trasplante de este paciente en esta fecha
      const hasTransplantThisDate = casesByDate.has(recordDateKey) &&
                                    casesByDate.get(recordDateKey).has(patientId);

      if (!hasTransplantThisDate) {
        // Este registro es dudoso: no hay trasplante del paciente en esta fecha
        suspicious.push({
          id: record.id,
          patientId,
          timestamp: record.timestamp,
          recordDate: recordDateKey,
          caseStartDate: record.case.startAt ? new Date(record.case.startAt).toISOString().split('T')[0] : 'SIN FECHA',
          phase: record.phase
        });
      } else {
        verified.push(record.id);
      }
    }

    console.log(`✅ Registros verificados (fecha coincide): ${verified.length}`);
    console.log(`⚠️  Registros dudosos (fecha NO coincide): ${suspicious.length}\n`);

    if (suspicious.length === 0) {
      console.log('✅ No hay registros dudosos que marcar.\n');
      await prisma.$disconnect();
      return;
    }

    // Mostrar algunos ejemplos
    console.log('📋 EJEMPLOS DE REGISTROS DUDOSOS (primeros 10):\n');
    suspicious.slice(0, 10).forEach((s, idx) => {
      console.log(`${idx + 1}. Paciente ${s.patientId}`);
      console.log(`   Fecha registro: ${s.recordDate}`);
      console.log(`   Fecha trasplante: ${s.caseStartDate}`);
      console.log(`   Fase: ${s.phase}\n`);
    });

    // PASO 4: Marcar registros dudosos
    console.log('='.repeat(80));
    console.log('\n🚩 MARCANDO REGISTROS COMO DUDOSOS...\n');

    const suspiciousIds = suspicious.map(s => s.id);

    // Actualizar en batch
    const updateResult = await prisma.intraopRecord.updateMany({
      where: {
        id: { in: suspiciousIds }
      },
      data: {
        suspicious: true
      }
    });

    console.log(`✅ Registros marcados como suspicious: ${updateResult.count}\n`);

    // PASO 5: Estadísticas de registros dudosos por caso
    console.log('='.repeat(80));
    console.log('\n📊 ESTADÍSTICAS DE REGISTROS DUDOSOS\n');

    // Agrupar por caso
    const byCaseId = {};
    suspicious.forEach(s => {
      const caseId = s.patientId; // Simplificado
      if (!byCaseId[caseId]) {
        byCaseId[caseId] = [];
      }
      byCaseId[caseId].push(s);
    });

    console.log(`Pacientes afectados: ${Object.keys(byCaseId).length}\n`);

    // Mostrar los 10 pacientes más afectados
    const sortedCases = Object.entries(byCaseId)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    console.log('Top 10 pacientes con más registros dudosos:\n');
    sortedCases.forEach(([patientId, records], idx) => {
      console.log(`${idx + 1}. Paciente ${patientId}: ${records.length} registros dudosos`);
    });

    // VERIFICACIÓN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 VERIFICACIÓN FINAL\n');

    const totalSuspicious = await prisma.intraopRecord.count({
      where: { suspicious: true }
    });

    const totalRecords = await prisma.intraopRecord.count();

    console.log(`Total registros intraoperatorios: ${totalRecords}`);
    console.log(`Registros marcados como suspicious: ${totalSuspicious}`);
    console.log(`Porcentaje dudoso: ${((totalSuspicious / totalRecords) * 100).toFixed(2)}%\n`);

    console.log('='.repeat(80));
    console.log('\n📝 RECOMENDACIÓN PARA ANÁLISIS:\n');
    console.log('Para excluir registros dudosos de análisis retrospectivos, usar:');
    console.log('  WHERE suspicious = false\n');
    console.log('O para investigar registros dudosos:');
    console.log('  WHERE suspicious = true\n');

    console.log('✅ Marcado de registros dudosos completado\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

flagSuspiciousRecords();
