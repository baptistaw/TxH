// scripts/analyze-specific-luis-rodriguez.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSpecificPatients() {
  try {
    // IDs of Luis Rodriguez patients with multiple evaluations
    const patientIds = [
      '19128546', // Jose Luis Rodríguez - 3 evaluaciones
      '19394896', // Luis Alberto Rodríguez - 3 evaluaciones
    ];

    for (const patientId of patientIds) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        console.log(`❌ Paciente ${patientId} no encontrado\n`);
        continue;
      }

      console.log('='.repeat(80));
      console.log(`📋 Paciente: ${patient.name} (CI: ${patient.id})`);
      console.log('='.repeat(80));

      const preops = await prisma.preopEvaluation.findMany({
        where: { patientId: patient.id },
        include: {
          clinician: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log(`\nTotal evaluaciones: ${preops.length}\n`);

      preops.forEach((preop, index) => {
        console.log(`Evaluación #${index + 1}:`);
        console.log(`  ID: ${preop.id}`);
        console.log(`  Fecha evaluación: ${preop.evaluationDate}`);
        console.log(`  Creado: ${preop.createdAt}`);
        console.log(`  Actualizado: ${preop.updatedAt}`);
        console.log(`  Clínico: ${preop.clinician?.name || 'No asignado'} (${preop.clinician?.email || 'N/A'})`);
        console.log(`  MELD: ${preop.meld || 'N/A'}`);
        console.log(`  ASA: ${preop.asa || 'N/A'}`);
        console.log(`  Child: ${preop.child || 'N/A'}`);
        console.log(`  En lista: ${preop.inList ? 'Sí' : 'No'}`);
        console.log(`  Peso: ${preop.weight || 'N/A'} kg`);
        console.log(`  Altura: ${preop.height || 'N/A'} cm`);
        console.log(`  Tipo sangre: ${preop.bloodType || 'N/A'}`);

        if (preop.diagnosis) {
          const diagnosisPreview = preop.diagnosis.substring(0, 100);
          console.log(`  Diagnóstico: ${diagnosisPreview}${preop.diagnosis.length > 100 ? '...' : ''}`);
        } else {
          console.log(`  Diagnóstico: N/A`);
        }
        console.log('');
      });

      // Compare evaluations pairwise
      console.log('\n🔍 ANÁLISIS DE DUPLICADOS:\n');

      for (let i = 0; i < preops.length - 1; i++) {
        for (let j = i + 1; j < preops.length; j++) {
          const p1 = preops[i];
          const p2 = preops[j];

          console.log(`Comparación: Evaluación #${i + 1} vs Evaluación #${j + 1}`);
          console.log('-'.repeat(60));

          // Compare key fields
          const fieldsToCompare = [
            { name: 'evaluationDate', label: 'Fecha evaluación' },
            { name: 'meld', label: 'MELD' },
            { name: 'asa', label: 'ASA' },
            { name: 'child', label: 'Child' },
            { name: 'inList', label: 'En lista' },
            { name: 'weight', label: 'Peso' },
            { name: 'height', label: 'Altura' },
            { name: 'bloodType', label: 'Tipo sangre' },
            { name: 'clinicianId', label: 'Clínico ID' },
            { name: 'diagnosis', label: 'Diagnóstico' },
            { name: 'allergies', label: 'Alergias' },
            { name: 'currentMedication', label: 'Medicación actual' },
          ];

          let identicalFields = 0;
          let totalComparableFields = 0;
          let differences = [];

          fieldsToCompare.forEach(({ name, label }) => {
            const val1 = p1[name];
            const val2 = p2[name];

            // Only count if at least one has a value
            if (val1 !== null || val2 !== null) {
              totalComparableFields++;

              if (JSON.stringify(val1) === JSON.stringify(val2)) {
                identicalFields++;
              } else {
                differences.push({
                  field: label,
                  eval1: val1,
                  eval2: val2
                });
              }
            }
          });

          const similarity = totalComparableFields > 0
            ? (identicalFields / totalComparableFields * 100).toFixed(1)
            : 0;

          console.log(`Similitud: ${similarity}% (${identicalFields}/${totalComparableFields} campos idénticos)`);

          // Check timing
          const timeDiff = Math.abs(new Date(p2.createdAt) - new Date(p1.createdAt));
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          const minutesDiff = timeDiff / (1000 * 60);
          const secondsDiff = timeDiff / 1000;

          console.log(`Diferencia temporal: ${daysDiff.toFixed(1)} días (${minutesDiff.toFixed(0)} minutos, ${secondsDiff.toFixed(0)} segundos)`);

          if (similarity >= 90) {
            console.log('\n⚠️  POSIBLE DUPLICADO EXACTO\n');

            if (secondsDiff < 60) {
              console.log(`⏱️  Las evaluaciones fueron creadas con ${secondsDiff.toFixed(0)} segundos de diferencia`);
              console.log('💡 PROBABLE ERROR DE IMPORTACIÓN: Las evaluaciones fueron creadas casi simultáneamente\n');
            } else if (minutesDiff < 5) {
              console.log(`⏱️  Las evaluaciones fueron creadas con ${minutesDiff.toFixed(1)} minutos de diferencia`);
              console.log('💡 PROBABLE ERROR DE IMPORTACIÓN: Posible re-ejecución del script de importación\n');
            } else if (daysDiff < 1) {
              console.log(`⏱️  Las evaluaciones fueron creadas el mismo día`);
              console.log('💡 POSIBLE DUPLICADO: Revisar si es legítimo o error\n');
            } else {
              console.log('💡 POSIBLEMENTE LEGÍTIMO: Suficiente tiempo entre evaluaciones\n');
            }
          }

          if (differences.length > 0 && differences.length <= 5) {
            console.log('Diferencias encontradas:');
            differences.forEach(diff => {
              const v1 = typeof diff.eval1 === 'string' && diff.eval1.length > 50
                ? diff.eval1.substring(0, 50) + '...'
                : diff.eval1;
              const v2 = typeof diff.eval2 === 'string' && diff.eval2.length > 50
                ? diff.eval2.substring(0, 50) + '...'
                : diff.eval2;
              console.log(`  - ${diff.field}: [${v1}] vs [${v2}]`);
            });
          }

          console.log('\n');
        }
      }

      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSpecificPatients();
