// scripts/debug-ci-matching.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const procSheet = workbook.getWorksheet('Porcedimientos');

    console.log('🔍 Comparando primeros 20 CIs del Excel con la BD\n');

    let found = 0;
    let notFound = 0;

    for (let i = 2; i <= Math.min(21, procSheet.rowCount); i++) {
      const row = procSheet.getRow(i);
      const ci = row.getCell(2).value;

      if (!ci) continue;

      const ciStr = String(ci).trim();

      // Buscar en BD por patientId
      const procedures = await prisma.procedure.findMany({
        where: { patientId: ciStr },
        select: { id: true, patientId: true }
      });

      // También buscar por ciRaw
      const proceduresByRaw = await prisma.procedure.findMany({
        where: { patient: { ciRaw: ciStr } },
        select: { id: true, patient: { select: { id: true, ciRaw: true } } }
      });

      console.log(`Fila ${i}: CI Excel = ${ciStr}`);
      console.log(`  Por patientId: ${procedures.length} encontrados`);
      console.log(`  Por ciRaw: ${proceduresByRaw.length} encontrados`);

      if (procedures.length > 0) {
        found++;
        console.log(`  ✅ Match por patientId: ${procedures[0].patientId}`);
      } else if (proceduresByRaw.length > 0) {
        found++;
        console.log(`  ✅ Match por ciRaw -> patientId: ${proceduresByRaw[0].patient.id}`);
      } else {
        notFound++;
        console.log(`  ❌ No encontrado`);
      }
      console.log('');
    }

    console.log(`\n📊 Resumen: ${found} encontrados, ${notFound} no encontrados de ${found + notFound} analizados`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
