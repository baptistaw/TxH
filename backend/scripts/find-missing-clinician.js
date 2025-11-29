// scripts/find-missing-clinician.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseClinicianId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const match = str.match(/^(\d+):/);
  if (match) {
    return parseInt(match[1]);
  }

  if (/^\d+$/.test(str)) {
    return parseInt(str);
  }

  return null;
}

async function findMissing() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Porcedimientos');

    // Obtener todos los clinicianIds del Excel
    const clinicianIds = new Set();

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const ci = row.getCell(2).value;
      if (!ci) continue;

      const anest1 = row.getCell(5).value;
      const anest2 = row.getCell(6).value;

      const id1 = parseClinicianId(anest1);
      const id2 = parseClinicianId(anest2);

      if (id1) clinicianIds.add(id1);
      if (id2) clinicianIds.add(id2);
    }

    console.log(`📊 IDs de clínicos encontrados en Excel: ${clinicianIds.size}`);
    console.log('IDs:', Array.from(clinicianIds).sort((a, b) => a - b).join(', '));

    // Verificar cuáles existen en la BD
    console.log('\n🔍 Verificando existencia en BD:\n');

    for (const id of Array.from(clinicianIds).sort((a, b) => a - b)) {
      const clinician = await prisma.clinician.findUnique({
        where: { id },
        select: { id: true, name: true }
      });

      if (clinician) {
        console.log(`✅ ${id}: ${clinician.name}`);
      } else {
        console.log(`❌ ${id}: NO EXISTE EN BD`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissing();
