// scripts/import-comorbidities-obs.js
// Importa observaciones de comorbilidades desde la columna ObsComorbilidades del Excel

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function importComorbiditiesObs() {
  console.log('\n📊 IMPORTACIÓN DE OBSERVACIONES DE COMORBILIDADES\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio'], { defval: '' });

    console.log(`\nRegistros en Excel - Preoperatorio: ${preopData.length}`);
    console.log('');

    let updated = 0;
    let notFound = 0;
    let noValue = 0;
    let errors = 0;

    for (const row of preopData) {
      const ciValidation = normalizarCI(row.CI);
      if (!ciValidation.ci) {
        continue;
      }

      const ci = ciValidation.ci;
      const obsComorbilidades = row.ObsComorbilidades ? String(row.ObsComorbilidades).trim() : null;

      // Skip si no hay valor o es "No"
      if (!obsComorbilidades || obsComorbilidades === 'No' || obsComorbilidades === 'NO') {
        noValue++;
        continue;
      }

      // Buscar evaluación preoperatoria para este paciente
      const preops = await prisma.preopEvaluation.findMany({
        where: { patientId: ci },
      });

      if (preops.length === 0) {
        notFound++;
        continue;
      }

      // Actualizar todas las evaluaciones de este paciente (normalmente solo hay una)
      for (const preop of preops) {
        try {
          await prisma.preopEvaluation.update({
            where: { id: preop.id },
            data: { comorbiditiesObs: obsComorbilidades }
          });

          updated++;
        } catch (error) {
          console.error(`✗ Error actualizando preop ${preop.id}:`, error.message);
          errors++;
        }
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Evaluaciones actualizadas: ${updated}`);
    console.log(`Sin valor significativo en Excel: ${noValue}`);
    console.log(`No encontradas en BD: ${notFound}`);
    console.log(`Errores: ${errors}`);
    console.log('');

    // Verificar cuántas evaluaciones tienen observaciones de comorbilidades
    const withObs = await prisma.preopEvaluation.count({
      where: {
        comorbiditiesObs: { not: null }
      }
    });

    const totalPreops = await prisma.preopEvaluation.count();
    console.log('='.repeat(80));
    console.log('ESTADO FINAL');
    console.log('='.repeat(80));
    console.log(`Evaluaciones con observaciones de comorbilidades: ${withObs}`);
    console.log(`Evaluaciones sin observaciones: ${totalPreops - withObs}`);
    console.log(`Total: ${totalPreops} evaluaciones`);
    console.log('');

    // Mostrar algunas muestras
    const samples = await prisma.preopEvaluation.findMany({
      where: {
        comorbiditiesObs: { not: null }
      },
      select: {
        patient: { select: { name: true } },
        comorbiditiesObs: true
      },
      take: 5
    });

    console.log('Muestras de observaciones importadas:');
    samples.forEach((s, i) => {
      const obs = s.comorbiditiesObs.substring(0, 80);
      console.log(`  ${i + 1}. ${s.patient.name}: ${obs}${s.comorbiditiesObs.length > 80 ? '...' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importComorbiditiesObs();
