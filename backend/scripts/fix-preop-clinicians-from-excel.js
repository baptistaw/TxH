// scripts/fix-preop-clinicians-from-excel.js
// Actualiza clinicianId de evaluaciones preoperatorias desde columnas Anestesista 1/2 del Excel

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function fixPreopClinicians() {
  console.log('\n📊 ACTUALIZACIÓN DE ANESTESISTAS EN EVALUACIONES PREOPERATORIAS\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Preoperatorio'];
    const preopData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`\nRegistros en Excel: ${preopData.length}`);
    console.log('');

    let updated = 0;
    let notFound = 0;
    let noClinicianInExcel = 0;
    let errors = 0;

    const stats = {
      byClinicianBefore: {},
      byClinicianAfter: {}
    };

    for (const row of preopData) {
      const ciValidation = normalizarCI(row.CI);
      if (!ciValidation.ci) {
        continue;
      }

      const ci = ciValidation.ci;
      const anest1 = row['Anestesista 1'];
      const anest2 = row['Anestesista 2'];

      // Determinar qué anestesista usar (prioridad a Anestesista 1)
      let clinicianId = null;
      if (anest1 && String(anest1).trim()) {
        clinicianId = parseInt(String(anest1).split(':')[0].trim());
      } else if (anest2 && String(anest2).trim()) {
        clinicianId = parseInt(String(anest2).split(':')[0].trim());
      }

      if (!clinicianId || isNaN(clinicianId)) {
        noClinicianInExcel++;
        continue;
      }

      // Buscar evaluación preoperatoria para este paciente
      const preops = await prisma.preopEvaluation.findMany({
        where: { patientId: ci },
        include: { clinician: true }
      });

      if (preops.length === 0) {
        notFound++;
        continue;
      }

      // Actualizar la primera (debería haber solo una por paciente)
      const preop = preops[0];

      // Guardar estadística antes
      const beforeName = preop.clinician?.name || 'Sin asignar';
      stats.byClinicianBefore[beforeName] = (stats.byClinicianBefore[beforeName] || 0) + 1;

      try {
        // Verificar que el clínico existe
        const clinician = await prisma.clinician.findUnique({
          where: { id: clinicianId }
        });

        if (!clinician) {
          console.warn(`⚠️  Clínico ${clinicianId} no existe en la BD`);
          errors++;
          continue;
        }

        await prisma.preopEvaluation.update({
          where: { id: preop.id },
          data: { clinicianId: clinicianId }
        });

        // Guardar estadística después
        stats.byClinicianAfter[clinician.name] = (stats.byClinicianAfter[clinician.name] || 0) + 1;

        updated++;
      } catch (error) {
        console.error(`✗ Error actualizando preop ${preop.id}:`, error.message);
        errors++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Evaluaciones actualizadas: ${updated}`);
    console.log(`Sin anestesista en Excel: ${noClinicianInExcel}`);
    console.log(`No encontradas en BD: ${notFound}`);
    console.log(`Errores: ${errors}`);
    console.log('');

    console.log('Distribución ANTES:');
    Object.entries(stats.byClinicianBefore)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  - ${name}: ${count}`);
      });

    console.log('');
    console.log('Distribución DESPUÉS:');
    Object.entries(stats.byClinicianAfter)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  - ${name}: ${count}`);
      });

    // Verificar nueva distribución total
    console.log('');
    console.log('='.repeat(80));
    console.log('DISTRIBUCIÓN TOTAL EN LA BASE DE DATOS');
    console.log('='.repeat(80));

    const totalStats = await prisma.preopEvaluation.groupBy({
      by: ['clinicianId'],
      _count: true,
      orderBy: { _count: { clinicianId: 'desc' } }
    });

    let withClinician = 0;
    for (const item of totalStats) {
      if (item.clinicianId !== null) {
        const clinician = await prisma.clinician.findUnique({
          where: { id: item.clinicianId }
        });
        console.log(`  - ${clinician?.name || 'ID: ' + item.clinicianId}: ${item._count} evaluaciones`);
        withClinician += item._count;
      }
    }

    const totalPreops = await prisma.preopEvaluation.count();
    const withoutClinician = totalPreops - withClinician;
    console.log(`  - Sin asignar: ${withoutClinician} evaluaciones`);
    console.log('');
    console.log(`Total: ${totalPreops} evaluaciones`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixPreopClinicians();
