// scripts/update-procedures-clinicians.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseClinicianId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Formato: "70203: William Baptista"
  const match = str.match(/^(\d+):/);
  if (match) {
    return parseInt(match[1]);
  }

  // Si es solo un número
  if (/^\d+$/.test(str)) {
    return parseInt(str);
  }

  return null;
}

async function updateProceduresClinicians() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
    console.log('📊 Actualizando clínicos de procedimientos desde Excel\n');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Porcedimientos');
    if (!sheet) {
      console.log('❌ No se encontró la hoja Porcedimientos');
      return;
    }

    // Obtener headers
    const headerRow = sheet.getRow(1);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
      const name = String(cell.value).toLowerCase();
      if (name === 'ci') headers.ci = colNumber;
      if (name === 'anestesista1') headers.anestesista1 = colNumber;
      if (name === 'anestesista2') headers.anestesista2 = colNumber;
      if (name === 'fechap') headers.fechap = colNumber;
      if (name === 'inicio') headers.inicio = colNumber;
    });

    console.log('Columnas encontradas:', headers);
    console.log('');

    let updated = 0;
    let notFound = 0;
    let noAnesthetist = 0;
    let multipleMatches = 0;
    let errors = 0;

    console.log('🔄 Procesando procedimientos...\n');

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const ci = row.getCell(headers.ci).value;
      const anest1 = row.getCell(headers.anestesista1).value;
      const anest2 = row.getCell(headers.anestesista2).value;
      const inicio = row.getCell(headers.inicio).value;

      if (!ci) continue;

      const clinicianId1 = parseClinicianId(anest1);
      const clinicianId2 = parseClinicianId(anest2);

      // Si no hay clínico asignado, skip
      if (!clinicianId1 && !clinicianId2) {
        noAnesthetist++;
        continue;
      }

      // Usar Anestesista1 como principal
      const mainClinicianId = clinicianId1 || clinicianId2;

      try {
        // Buscar el procedimiento por CI (usando ciRaw ya que el Excel tiene CI sin DV)
        const ciRaw = String(ci).trim();

        // Buscar procedimientos de este paciente por ciRaw
        const procedures = await prisma.procedure.findMany({
          where: {
            patient: { ciRaw: ciRaw }
          },
          select: { id: true, startAt: true, clinicianId: true, patientId: true }
        });

        if (procedures.length === 0) {
          notFound++;
          if (notFound <= 5) {
            console.log(`⚠️  Fila ${i}: No se encontró procedimiento para CI ${ci}`);
          }
          continue;
        }

        if (procedures.length > 1) {
          // Si hay múltiples, intentar emparejar por fecha
          // Por ahora, actualizar el primero que no tenga clínico
          const procToUpdate = procedures.find(p => !p.clinicianId) || procedures[0];

          await prisma.procedure.update({
            where: { id: procToUpdate.id },
            data: { clinicianId: mainClinicianId }
          });

          updated++;
          if (updated <= 10) {
            console.log(`✅ Fila ${i}: Actualizado procedimiento ${procToUpdate.id} (CI: ${ci}) -> Clínico: ${mainClinicianId}`);
          }
        } else {
          // Solo hay uno, actualizarlo
          await prisma.procedure.update({
            where: { id: procedures[0].id },
            data: { clinicianId: mainClinicianId }
          });

          updated++;
          if (updated <= 10) {
            console.log(`✅ Fila ${i}: Actualizado procedimiento ${procedures[0].id} (CI: ${ci}) -> Clínico: ${mainClinicianId}`);
          }
        }

      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`❌ Fila ${i}: Error - ${error.message}`);
        }
      }

      // Mostrar progreso cada 50 filas
      if (i % 50 === 0) {
        console.log(`\n📍 Progreso: ${i}/${sheet.rowCount} filas procesadas...`);
        console.log(`   Actualizados: ${updated}, No encontrados: ${notFound}, Sin anestesista: ${noAnesthetist}\n`);
      }
    }

    console.log('\n✅ Proceso completado!\n');
    console.log('📊 Resumen:');
    console.log(`  Procedimientos actualizados: ${updated}`);
    console.log(`  Procedimientos no encontrados: ${notFound}`);
    console.log(`  Sin anestesista en Excel: ${noAnesthetist}`);
    console.log(`  Errores: ${errors}`);
    console.log(`  Total procesado: ${sheet.rowCount - 1}`);

    // Verificar cuántos procedimientos siguen sin clínico
    const proceduresWithoutClinician = await prisma.procedure.count({
      where: { clinicianId: null }
    });

    console.log(`\n⚠️  Procedimientos que aún no tienen clínico asignado: ${proceduresWithoutClinician}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProceduresClinicians();
