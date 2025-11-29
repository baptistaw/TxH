// scripts/import-functional-class.js
// Importa functionalClass desde la columna ClaseFuncional del Excel

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function mapFunctionalClass(excelValue) {
  if (!excelValue) return null;

  const value = String(excelValue).trim();

  switch(value) {
    case 'I':
      return 'I';
    case 'II':
      return 'II';
    case 'III':
      return 'III';
    case 'IV':
      return 'IV';
    case 'No se puede evaluar':
      return 'NOT_EVALUABLE';
    case 'Pendiente':
      return 'PENDING';
    default:
      console.warn(`⚠️  Valor desconocido de ClaseFuncional: "${value}"`);
      return null;
  }
}

async function importFunctionalClass() {
  console.log('\n📊 IMPORTACIÓN DE CLASE FUNCIONAL\n');
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

    const stats = {
      byClass: {}
    };

    for (const row of preopData) {
      const ciValidation = normalizarCI(row.CI);
      if (!ciValidation.ci) {
        continue;
      }

      const ci = ciValidation.ci;
      const functionalClass = mapFunctionalClass(row.ClaseFuncional);

      if (!functionalClass) {
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
            data: { functionalClass: functionalClass }
          });

          stats.byClass[functionalClass] = (stats.byClass[functionalClass] || 0) + 1;
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
    console.log(`Sin valor en Excel: ${noValue}`);
    console.log(`No encontradas en BD: ${notFound}`);
    console.log(`Errores: ${errors}`);
    console.log('');

    console.log('Distribución por Clase Funcional:');
    Object.entries(stats.byClass)
      .sort((a, b) => b[1] - a[1])
      .forEach(([fc, count]) => {
        let label = fc;
        if (fc === 'NOT_EVALUABLE') label = 'No se puede evaluar';
        if (fc === 'PENDING') label = 'Pendiente';
        console.log(`  - ${label}: ${count}`);
      });

    // Verificar nueva distribución total
    console.log('');
    console.log('='.repeat(80));
    console.log('DISTRIBUCIÓN TOTAL EN LA BASE DE DATOS');
    console.log('='.repeat(80));

    const totalStats = await prisma.preopEvaluation.groupBy({
      by: ['functionalClass'],
      _count: true,
      orderBy: { _count: { functionalClass: 'desc' } }
    });

    let withFC = 0;
    for (const item of totalStats) {
      if (item.functionalClass !== null) {
        let label = item.functionalClass;
        if (label === 'NOT_EVALUABLE') label = 'No se puede evaluar';
        if (label === 'PENDING') label = 'Pendiente';
        console.log(`  - ${label}: ${item._count} evaluaciones`);
        withFC += item._count;
      }
    }

    const totalPreops = await prisma.preopEvaluation.count();
    const withoutFC = totalPreops - withFC;
    console.log(`  - Sin asignar: ${withoutFC} evaluaciones`);
    console.log('');
    console.log(`Total: ${totalPreops} evaluaciones`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importFunctionalClass();
