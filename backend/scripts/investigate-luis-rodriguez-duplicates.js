// scripts/investigate-luis-rodriguez-duplicates.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateDuplicates() {
  try {
    console.log('🔍 Buscando paciente Luis Rodriguez...\n');

    // Find patient Luis Rodriguez
    const patients = await prisma.patient.findMany({
      where: {
        AND: [
          {
            name: {
              contains: 'Luis',
              mode: 'insensitive'
            }
          },
          {
            name: {
              contains: 'Rodriguez',
              mode: 'insensitive'
            }
          }
        ]
      }
    });

    if (patients.length === 0) {
      console.log('❌ No se encontró ningún paciente con nombre "Luis Rodriguez"');
      return;
    }

    console.log(`✅ Encontrados ${patients.length} paciente(s) con nombre similar a Luis Rodriguez:\n`);

    for (const patient of patients) {
      console.log(`📋 Paciente: ${patient.name} (CI: ${patient.id})`);

      // Get all preop evaluations for this patient
      const preops = await prisma.preopEvaluation.findMany({
        where: {
          patientId: patient.id
        },
        include: {
          clinician: {
            select: { name: true, email: true }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`   Total evaluaciones preoperatorias: ${preops.length}\n`);

      if (preops.length > 1) {
        console.log('   ⚠️  POSIBLES DUPLICADOS DETECTADOS:\n');

        preops.forEach((preop, index) => {
          console.log(`   Evaluación #${index + 1}:`);
          console.log(`   - ID: ${preop.id}`);
          console.log(`   - Fecha evaluación: ${preop.evaluationDate}`);
          console.log(`   - Creado: ${preop.createdAt}`);
          console.log(`   - Actualizado: ${preop.updatedAt}`);
          console.log(`   - Clínico: ${preop.clinician?.name || 'No asignado'} (${preop.clinician?.email || 'N/A'})`);
          console.log(`   - MELD: ${preop.meld || 'N/A'}`);
          console.log(`   - ASA: ${preop.asa || 'N/A'}`);
          console.log(`   - En lista: ${preop.inList ? 'Sí' : 'No'}`);
          console.log(`   - Niño: ${preop.child || 'N/A'}`);
          console.log(`   - Diagnóstico: ${preop.diagnosis ? preop.diagnosis.substring(0, 50) + '...' : 'N/A'}`);
          console.log('');
        });

        // Compare pairs to see if they're identical
        console.log('   🔍 Comparando evaluaciones para detectar duplicados exactos:\n');

        for (let i = 0; i < preops.length - 1; i++) {
          for (let j = i + 1; j < preops.length; j++) {
            const p1 = preops[i];
            const p2 = preops[j];

            // Compare key fields (excluding id, createdAt, updatedAt)
            const fieldsToCompare = [
              'evaluationDate', 'meld', 'asa', 'inList', 'child', 'diagnosis',
              'clinicianId', 'weight', 'height', 'bloodType', 'allergies'
            ];

            let identicalFields = 0;
            let totalFields = 0;

            fieldsToCompare.forEach(field => {
              if (p1[field] !== undefined || p2[field] !== undefined) {
                totalFields++;
                if (JSON.stringify(p1[field]) === JSON.stringify(p2[field])) {
                  identicalFields++;
                }
              }
            });

            const similarity = totalFields > 0 ? (identicalFields / totalFields * 100).toFixed(1) : 0;

            console.log(`   Evaluación #${i + 1} vs Evaluación #${j + 1}:`);
            console.log(`   - Similitud: ${similarity}% (${identicalFields}/${totalFields} campos idénticos)`);

            if (similarity >= 90) {
              console.log('   - ⚠️  POSIBLE DUPLICADO EXACTO');

              // Check time difference
              const timeDiff = Math.abs(new Date(p2.createdAt) - new Date(p1.createdAt));
              const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
              const minutesDiff = timeDiff / (1000 * 60);

              if (minutesDiff < 5) {
                console.log(`   - ⏱️  Creadas con ${minutesDiff.toFixed(2)} minutos de diferencia (probablemente error de importación)`);
              } else if (daysDiff < 1) {
                console.log(`   - ⏱️  Creadas el mismo día, ${minutesDiff.toFixed(0)} minutos de diferencia`);
              } else {
                console.log(`   - ⏱️  Creadas con ${daysDiff.toFixed(1)} días de diferencia`);
              }
            }
            console.log('');
          }
        }
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateDuplicates();
