// scripts/cleanup-duplicate-preops.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('🧹 LIMPIEZA DE EVALUACIONES PREOPERATORIAS DUPLICADAS\n');
    console.log('Estrategia:');
    console.log('1. Conservar evaluaciones con clinicianId asignado');
    console.log('2. Si ninguna tiene clinicianId, conservar la más reciente');
    console.log('3. Si múltiples tienen clinicianId, conservar la más reciente\n');

    // Get all preop evaluations grouped by patient
    const allPreops = await prisma.preopEvaluation.findMany({
      include: {
        patient: {
          select: { id: true, name: true }
        },
        clinician: {
          select: { name: true, email: true }
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

    // Analyze what will be deleted
    const toDelete = [];
    const toKeep = [];
    const summary = {
      totalDuplicates: 0,
      exactDuplicates: 0,
      highSimilarity: 0,
      keptWithClinician: 0,
      keptNewest: 0,
    };

    patientsWithMultiple.forEach(({ patient, evaluations }) => {
      if (evaluations.length < 2) return;

      // Sort evaluations by priority:
      // 1. Has clinicianId (descending)
      // 2. Most recent updatedAt (descending)
      // 3. Most recent createdAt (descending)
      const sorted = [...evaluations].sort((a, b) => {
        // Priority 1: Has clinicianId
        if (a.clinicianId && !b.clinicianId) return -1;
        if (!a.clinicianId && b.clinicianId) return 1;

        // Priority 2: Most recently updated
        if (a.updatedAt > b.updatedAt) return -1;
        if (a.updatedAt < b.updatedAt) return 1;

        // Priority 3: Most recently created
        if (a.createdAt > b.createdAt) return -1;
        if (a.createdAt < b.createdAt) return 1;

        return 0;
      });

      // Keep the first one (highest priority)
      const keepEval = sorted[0];
      const deleteEvals = sorted.slice(1);

      toKeep.push({
        id: keepEval.id,
        patientId: patient.id,
        patientName: patient.name,
        clinician: keepEval.clinician?.name || 'Sin asignar',
        createdAt: keepEval.createdAt,
        updatedAt: keepEval.updatedAt,
        reason: keepEval.clinicianId ? 'Con clínico asignado' : 'Más reciente'
      });

      deleteEvals.forEach(delEval => {
        // Calculate similarity with kept evaluation
        const fieldsToCompare = [
          'evaluationDate', 'meld', 'asa', 'child', 'inList',
          'weight', 'height', 'bloodType', 'diagnosis'
        ];

        let identicalFields = 0;
        let totalFields = 0;

        fieldsToCompare.forEach(field => {
          if (keepEval[field] !== null || delEval[field] !== null) {
            totalFields++;
            if (JSON.stringify(keepEval[field]) === JSON.stringify(delEval[field])) {
              identicalFields++;
            }
          }
        });

        const similarity = totalFields > 0 ? (identicalFields / totalFields * 100) : 0;

        toDelete.push({
          id: delEval.id,
          patientId: patient.id,
          patientName: patient.name,
          clinician: delEval.clinician?.name || 'Sin asignar',
          createdAt: delEval.createdAt,
          similarity: similarity.toFixed(1),
          timeDiffSeconds: Math.abs(new Date(delEval.createdAt) - new Date(keepEval.createdAt)) / 1000
        });

        summary.totalDuplicates++;
        if (similarity === 100) summary.exactDuplicates++;
        if (similarity >= 90) summary.highSimilarity++;
      });

      if (keepEval.clinicianId) {
        summary.keptWithClinician++;
      } else {
        summary.keptNewest++;
      }
    });

    console.log('📊 RESUMEN DE LIMPIEZA:\n');
    console.log(`Total evaluaciones a eliminar: ${toDelete.length}`);
    console.log(`  - Duplicados exactos (100%): ${summary.exactDuplicates}`);
    console.log(`  - Alta similitud (≥90%): ${summary.highSimilarity}`);
    console.log(`\nEvaluaciones a conservar: ${toKeep.length}`);
    console.log(`  - Con clínico asignado: ${summary.keptWithClinician}`);
    console.log(`  - Más recientes (sin clínico): ${summary.keptNewest}\n`);

    console.log('🔍 EJEMPLOS DE EVALUACIONES A ELIMINAR (primeras 10):\n');
    toDelete.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.patientName} (CI: ${item.patientId})`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Clínico: ${item.clinician}`);
      console.log(`   Creado: ${item.createdAt}`);
      console.log(`   Similitud: ${item.similarity}%`);
      console.log(`   Diferencia temporal: ${item.timeDiffSeconds.toFixed(0)} segundos\n`);
    });

    console.log('🔍 EJEMPLOS DE EVALUACIONES A CONSERVAR (primeras 10):\n');
    toKeep.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.patientName} (CI: ${item.patientId})`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Clínico: ${item.clinician}`);
      console.log(`   Creado: ${item.createdAt}`);
      console.log(`   Actualizado: ${item.updatedAt}`);
      console.log(`   Razón: ${item.reason}\n`);
    });

    // Save backup
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `preop-duplicates-backup-${timestamp}.json`);

    const backupData = {
      timestamp: new Date().toISOString(),
      summary,
      toDelete,
      toKeep
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`💾 Respaldo guardado en: ${backupFile}\n`);

    // Ask for confirmation
    console.log('⚠️  ADVERTENCIA: Esta operación eliminará permanentemente las evaluaciones duplicadas.');
    console.log('¿Desea continuar? Escriba "CONFIRMAR" para proceder:\n');

    // Wait for user input
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('> ', async (answer) => {
      if (answer.trim().toUpperCase() === 'CONFIRMAR') {
        console.log('\n🚀 Iniciando limpieza...\n');

        // Delete duplicates in batches
        const batchSize = 50;
        let deleted = 0;

        for (let i = 0; i < toDelete.length; i += batchSize) {
          const batch = toDelete.slice(i, i + batchSize);
          const ids = batch.map(item => item.id);

          await prisma.preopEvaluation.deleteMany({
            where: {
              id: { in: ids }
            }
          });

          deleted += ids.length;
          console.log(`Eliminadas: ${deleted}/${toDelete.length} evaluaciones...`);
        }

        console.log(`\n✅ LIMPIEZA COMPLETADA`);
        console.log(`\nResumen:`);
        console.log(`  - Evaluaciones eliminadas: ${deleted}`);
        console.log(`  - Evaluaciones conservadas: ${toKeep.length}`);
        console.log(`  - Respaldo: ${backupFile}\n`);

        // Verify results
        const remaining = await prisma.preopEvaluation.findMany({
          include: {
            _count: {
              select: { id: true }
            }
          }
        });

        const patientsStillWithMultiple = Object.values(
          remaining.reduce((acc, preop) => {
            if (!acc[preop.patientId]) acc[preop.patientId] = [];
            acc[preop.patientId].push(preop);
            return acc;
          }, {})
        ).filter(evals => evals.length > 1).length;

        console.log(`📊 Verificación post-limpieza:`);
        console.log(`  - Total evaluaciones en BD: ${remaining.length}`);
        console.log(`  - Pacientes con múltiples evaluaciones: ${patientsStillWithMultiple}`);

        if (patientsStillWithMultiple > 0) {
          console.log(`\n⚠️  Aún quedan ${patientsStillWithMultiple} pacientes con múltiples evaluaciones.`);
          console.log(`Esto puede ser legítimo si tienen evaluaciones diferentes en el tiempo.\n`);
        }

      } else {
        console.log('\n❌ Operación cancelada. No se eliminó nada.\n');
      }

      rl.close();
      await prisma.$disconnect();
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupDuplicates();
