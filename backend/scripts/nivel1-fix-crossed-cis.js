// scripts/nivel1-fix-crossed-cis.js
// NIVEL 1: Corrección SEGURA de CIs con mapeo consistente verificado
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo verificado de CIs incorrectas → CIs correctas con fechas específicas
const VERIFIED_CORRECTIONS = [
  { wrongCI: '11719325', correctCI: '15954795', date: '2010-03-23', patientName: 'Walter Sanchez' },
  { wrongCI: '12387688', correctCI: '12941979', date: '2009-09-01', patientName: 'Octavio Gonzalez' },
  { wrongCI: '12656396', correctCI: '26195540', date: '2010-11-13', patientName: 'Iris del Puerto' },
  { wrongCI: '12941979', correctCI: '11719325', date: '2009-07-14', patientName: 'Eduardo Sellanes' },
  { wrongCI: '14674766', correctCI: '15333759', date: '2010-02-16', patientName: 'Redulbio Pastorin' },
  { wrongCI: '14908955', correctCI: '19903950', date: '2010-05-08', patientName: 'Gissel Roulier' },
  { wrongCI: '15566798', correctCI: '14794065', date: '2009-12-30', patientName: 'Rafaela García' },
  { wrongCI: '15954795', correctCI: '25215810', date: '2010-06-17', patientName: 'Eusebio Cardozo' },
  { wrongCI: '19903950', correctCI: '14674766', date: '2009-09-04', patientName: 'Sergio Miranda' },
  { wrongCI: '25215810', correctCI: '14908955', date: '2010-01-31', patientName: 'Gerardo Massini' },
  { wrongCI: '25964003', correctCI: '15398713', date: '2010-03-01', patientName: 'Oscar Cluzet' },
  { wrongCI: '34286113', correctCI: '12387688', date: '2009-07-22', patientName: 'Francisco Paolino' },
  { wrongCI: '37171644', correctCI: '12656396', date: '2009-08-12', patientName: 'Rafael Abal' },
  { wrongCI: '37757127', correctCI: '15566798', date: '2010-03-18', patientName: 'Dinora Frau' },
  { wrongCI: '45011894', correctCI: '25964003', date: '2010-09-20', patientName: 'José Moraes' },
];

async function fixCrossedCIs() {
  console.log('\n🔧 NIVEL 1: CORRECCIÓN SEGURA DE CIs CRUZADAS\n');
  console.log('='.repeat(80));
  console.log(`\nCorrecciones a aplicar: ${VERIFIED_CORRECTIONS.length}\n`);

  let corrected = 0;
  let errors = [];
  const report = [];

  for (const correction of VERIFIED_CORRECTIONS) {
    try {
      console.log(`\n📝 Procesando: ${correction.wrongCI} → ${correction.correctCI}`);
      console.log(`   Fecha: ${correction.date}, Paciente: ${correction.patientName}`);

      // PASO 1: Verificar que el caso correcto existe
      const correctCase = await prisma.transplantCase.findFirst({
        where: {
          patientId: correction.correctCI,
          startAt: {
            gte: new Date(correction.date + 'T00:00:00.000Z'),
            lte: new Date(correction.date + 'T23:59:59.999Z')
          }
        },
        include: { patient: true }
      });

      if (!correctCase) {
        errors.push({
          correction,
          error: 'Caso correcto no encontrado en BD'
        });
        console.log(`   ❌ Caso correcto no encontrado`);
        continue;
      }

      console.log(`   ✓ Caso correcto encontrado: ${correctCase.id}`);

      // PASO 2: Buscar el caso incorrecto (el que tiene los registros mal asignados)
      const wrongCase = await prisma.transplantCase.findFirst({
        where: {
          patientId: correction.wrongCI,
        }
      });

      if (!wrongCase) {
        console.log(`   ⚠️  No hay caso con CI incorrecta (normal si ya no tiene registros)`);
      }

      // PASO 3: Buscar TODOS los registros intraop que tienen la CI incorrecta en esa fecha
      const wrongRecords = await prisma.intraopRecord.findMany({
        where: {
          case: {
            patientId: correction.wrongCI
          },
          timestamp: {
            gte: new Date(correction.date + 'T00:00:00.000Z'),
            lte: new Date(correction.date + 'T23:59:59.999Z')
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      console.log(`   📊 Registros encontrados con CI incorrecta: ${wrongRecords.length}`);

      if (wrongRecords.length === 0) {
        console.log(`   ⚠️  No hay registros que corregir (puede que ya estén corregidos)`);
        continue;
      }

      // PASO 4: Reasignar registros al caso correcto
      const recordIds = wrongRecords.map(r => r.id);

      const updateResult = await prisma.intraopRecord.updateMany({
        where: {
          id: { in: recordIds }
        },
        data: {
          caseId: correctCase.id
        }
      });

      console.log(`   ✅ Registros reasignados: ${updateResult.count}`);

      corrected += updateResult.count;

      report.push({
        wrongCI: correction.wrongCI,
        correctCI: correction.correctCI,
        date: correction.date,
        patientName: correction.patientName,
        recordsFixed: updateResult.count,
        correctCaseId: correctCase.id
      });

      // PASO 5: Verificar si el caso con CI incorrecta quedó sin registros
      if (wrongCase) {
        const remainingRecords = await prisma.intraopRecord.count({
          where: { caseId: wrongCase.id }
        });

        console.log(`   📊 Registros restantes en caso incorrecto: ${remainingRecords}`);

        if (remainingRecords === 0) {
          // El caso quedó vacío, pero NO lo eliminamos por seguridad
          console.log(`   ⚠️  Caso ${wrongCase.id} quedó sin registros (se mantendrá por seguridad)`);
        }
      }

    } catch (error) {
      errors.push({
        correction,
        error: error.message
      });
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // REPORTE FINAL
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE CORRECCIONES\n');
  console.log('='.repeat(80));
  console.log(`✅ Registros corregidos: ${corrected}`);
  console.log(`❌ Errores: ${errors.length}\n`);

  if (report.length > 0) {
    console.log('📋 DETALLE DE CORRECCIONES EXITOSAS:\n');
    report.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.patientName} (${r.date})`);
      console.log(`   CI incorrecta: ${r.wrongCI} → CI correcta: ${r.correctCI}`);
      console.log(`   Registros corregidos: ${r.recordsFixed}`);
      console.log(`   Caso ID: ${r.correctCaseId}\n`);
    });
  }

  if (errors.length > 0) {
    console.log('❌ ERRORES:\n');
    errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.correction.patientName} (${err.correction.date})`);
      console.log(`   ${err.correction.wrongCI} → ${err.correction.correctCI}`);
      console.log(`   Error: ${err.error}\n`);
    });
  }

  // VERIFICACIÓN FINAL
  console.log('='.repeat(80));
  console.log('\n🔍 VERIFICACIÓN POST-CORRECCIÓN\n');

  const totalIntraopRecords = await prisma.intraopRecord.count();
  console.log(`Total registros intraoperatorios en BD: ${totalIntraopRecords}`);

  // Contar registros huérfanos restantes
  const casesWithDate = await prisma.transplantCase.findMany({
    where: { startAt: { not: null } },
    select: { id: true, patientId: true, startAt: true }
  });

  const casesByDate = {};
  casesWithDate.forEach(c => {
    const dateKey = new Date(c.startAt).toISOString().split('T')[0];
    if (!casesByDate[dateKey]) casesByDate[dateKey] = new Set();
    casesByDate[dateKey].add(c.patientId);
  });

  const allRecords = await prisma.intraopRecord.findMany({
    include: { case: true }
  });

  const intraopByDate = {};
  allRecords.forEach(r => {
    const dateKey = new Date(r.timestamp).toISOString().split('T')[0];
    if (!intraopByDate[dateKey]) intraopByDate[dateKey] = new Set();
    intraopByDate[dateKey].add(r.case.patientId);
  });

  let orphanDates = 0;
  Object.keys(intraopByDate).forEach(date => {
    const caseCIs = casesByDate[date] || new Set();
    const intraopCIs = intraopByDate[date];
    const orphans = [...intraopCIs].filter(ci => !caseCIs.has(ci));
    if (orphans.length > 0) orphanDates++;
  });

  console.log(`Fechas con registros huérfanos restantes: ${orphanDates}`);
  console.log(`  (Antes de la corrección: 84)\n`);

  console.log('✅ Corrección de Nivel 1 completada\n');

  await prisma.$disconnect();
}

fixCrossedCIs();
