// scripts/analyze-all-duplicate-preops.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAllDuplicates() {
  try {
    console.log('🔍 Analizando TODAS las evaluaciones preoperatorias duplicadas...\n');

    // Get all preop evaluations grouped by patient
    const allPreops = await prisma.preopEvaluation.findMany({
      include: {
        patient: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { patientId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Group by patient
    const byPatient = {};
    allPreops.forEach(preop => {
      if (!byPatient[preop.patientId]) {
        byPatient[preop.patientId] = {
          patient: preop.patient,
          evaluations: []
        };
      }
      byPatient[preop.patientId].evaluations.push(preop);
    });

    // Filter patients with multiple evaluations
    const patientsWithMultiple = Object.values(byPatient).filter(p => p.evaluations.length > 1);

    console.log(`Total pacientes: ${Object.keys(byPatient).length}`);
    console.log(`Pacientes con múltiples evaluaciones: ${patientsWithMultiple.length}\n`);

    // Analyze patterns
    let exactDuplicates = 0;
    let importErrorDuplicates = 0; // Created within seconds of each other
    let sameMinuteDuplicates = 0; // Created within same minute
    let sameDayDuplicates = 0;
    let legitimateMultiple = 0;

    const suspiciousPatients = [];

    patientsWithMultiple.forEach(({ patient, evaluations }) => {
      let hasExactDuplicate = false;
      let hasImportError = false;

      for (let i = 0; i < evaluations.length - 1; i++) {
        for (let j = i + 1; j < evaluations.length; j++) {
          const e1 = evaluations[i];
          const e2 = evaluations[j];

          const timeDiff = Math.abs(new Date(e2.createdAt) - new Date(e1.createdAt));
          const secondsDiff = timeDiff / 1000;
          const minutesDiff = timeDiff / (1000 * 60);
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

          // Compare key fields
          const fieldsToCompare = [
            'evaluationDate', 'meld', 'asa', 'child', 'inList',
            'weight', 'height', 'bloodType', 'diagnosis'
          ];

          let identicalFields = 0;
          let totalFields = 0;

          fieldsToCompare.forEach(field => {
            if (e1[field] !== null || e2[field] !== null) {
              totalFields++;
              if (JSON.stringify(e1[field]) === JSON.stringify(e2[field])) {
                identicalFields++;
              }
            }
          });

          const similarity = totalFields > 0 ? (identicalFields / totalFields * 100) : 0;

          if (similarity >= 90) {
            if (secondsDiff < 5) {
              hasImportError = true;
              if (!suspiciousPatients.find(p => p.id === patient.id)) {
                suspiciousPatients.push({
                  id: patient.id,
                  name: patient.name,
                  count: evaluations.length,
                  type: 'ERROR_IMPORTACION',
                  similarity: similarity.toFixed(1),
                  timeDiff: `${secondsDiff.toFixed(0)} segundos`,
                  e1Date: e1.createdAt,
                  e2Date: e2.createdAt
                });
              }
            } else if (minutesDiff < 1) {
              if (!hasImportError && !suspiciousPatients.find(p => p.id === patient.id)) {
                suspiciousPatients.push({
                  id: patient.id,
                  name: patient.name,
                  count: evaluations.length,
                  type: 'MISMO_MINUTO',
                  similarity: similarity.toFixed(1),
                  timeDiff: `${secondsDiff.toFixed(0)} segundos`,
                  e1Date: e1.createdAt,
                  e2Date: e2.createdAt
                });
              }
            } else if (daysDiff < 1) {
              if (!hasImportError && !suspiciousPatients.find(p => p.id === patient.id)) {
                suspiciousPatients.push({
                  id: patient.id,
                  name: patient.name,
                  count: evaluations.length,
                  type: 'MISMO_DIA',
                  similarity: similarity.toFixed(1),
                  timeDiff: `${minutesDiff.toFixed(0)} minutos`,
                  e1Date: e1.createdAt,
                  e2Date: e2.createdAt
                });
              }
            }

            if (similarity === 100) {
              hasExactDuplicate = true;
            }
          }
        }
      }

      if (hasExactDuplicate) exactDuplicates++;
      if (hasImportError) importErrorDuplicates++;
    });

    console.log('📊 RESUMEN DE DUPLICADOS:\n');
    console.log(`Pacientes con duplicados de ERROR DE IMPORTACIÓN (< 5 seg): ${suspiciousPatients.filter(p => p.type === 'ERROR_IMPORTACION').length}`);
    console.log(`Pacientes con duplicados en el mismo minuto: ${suspiciousPatients.filter(p => p.type === 'MISMO_MINUTO').length}`);
    console.log(`Pacientes con duplicados en el mismo día: ${suspiciousPatients.filter(p => p.type === 'MISMO_DIA').length}`);
    console.log(`\nTotal pacientes con duplicados sospechosos: ${suspiciousPatients.length}\n`);

    console.log('🚨 TOP 20 CASOS MÁS SOSPECHOSOS (ordenados por tiempo de creación):\n');

    suspiciousPatients
      .sort((a, b) => {
        const typeOrder = { 'ERROR_IMPORTACION': 1, 'MISMO_MINUTO': 2, 'MISMO_DIA': 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      })
      .slice(0, 20)
      .forEach((p, index) => {
        console.log(`${index + 1}. ${p.name} (CI: ${p.id})`);
        console.log(`   - Tipo: ${p.type}`);
        console.log(`   - Total evaluaciones: ${p.count}`);
        console.log(`   - Similitud: ${p.similarity}%`);
        console.log(`   - Diferencia temporal: ${p.timeDiff}`);
        console.log(`   - Fecha 1: ${p.e1Date}`);
        console.log(`   - Fecha 2: ${p.e2Date}`);
        console.log('');
      });

    console.log('\n💡 RECOMENDACIÓN:\n');
    const importErrors = suspiciousPatients.filter(p => p.type === 'ERROR_IMPORTACION').length;
    if (importErrors > 50) {
      console.log(`⚠️  DETECTADO PROBLEMA MASIVO DE IMPORTACIÓN`);
      console.log(`Se encontraron ${importErrors} pacientes con evaluaciones duplicadas creadas en menos de 5 segundos.`);
      console.log(`Esto indica que el script de importación se ejecutó múltiples veces o tuvo un error de duplicación.`);
      console.log(`\nSe recomienda:`);
      console.log(`1. Crear script de limpieza para eliminar duplicados exactos`);
      console.log(`2. Conservar la evaluación más reciente o la que tenga clinicianId asignado`);
      console.log(`3. Verificar el script de importación para evitar futuras duplicaciones`);
    } else if (importErrors > 0) {
      console.log(`Se encontraron ${importErrors} casos de duplicación por error de importación.`);
      console.log(`Se recomienda revisión manual y limpieza selectiva.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAllDuplicates();
