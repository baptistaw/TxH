// scripts/investigate-excel-procedures.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    console.log('📊 Hojas disponibles en el Excel:');
    workbook.eachSheet((sheet, id) => {
      console.log(`  - ${sheet.name} (${sheet.rowCount} filas)`);
    });

    const procSheet = workbook.getWorksheet('Porcedimientos');
    if (!procSheet) {
      console.log('\n❌ No se encontró la hoja Porcedimientos');
      return;
    }

    console.log('\n📋 Columnas en "Porcedimientos":');
    const headerRow = procSheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      console.log(`  ${colNumber}. ${cell.value}`);
    });

    // Tomar algunos ejemplos de CIs del Excel
    console.log('\n📋 Primeros 10 CIs en Porcedimientos:');
    const excelCIs = [];
    for (let i = 2; i <= Math.min(11, procSheet.rowCount); i++) {
      const row = procSheet.getRow(i);
      const ci = row.getCell(2).value; // CI está en columna 2
      const fechap = row.getCell(1).value;
      const inicio = row.getCell(3).value;
      console.log(`  Fila ${i}: CI=${ci}, FechaP=${fechap}, Inicio=${inicio}`);
      if (ci) excelCIs.push(String(ci).trim());
    }

    // Buscar esos CIs en la base de datos
    console.log('\n🔍 Buscando esos CIs en diferentes tablas...\n');

    // En Procedure
    const procsWithCI = await prisma.procedure.count({
      where: {
        patient: { ciRaw: { in: excelCIs } }
      }
    });
    console.log(`  Procedure: ${procsWithCI} coincidencias`);

    // En TransplantCase
    const casesWithCI = await prisma.transplantCase.count({
      where: {
        patient: { ciRaw: { in: excelCIs } }
      }
    });
    console.log(`  TransplantCase: ${casesWithCI} coincidencias`);

    // En PreopEvaluation
    const preopWithCI = await prisma.preopEvaluation.count({
      where: {
        patient: { ciRaw: { in: excelCIs } }
      }
    });
    console.log(`  PreopEvaluation: ${preopWithCI} coincidencias`);

    // Totales en BD
    console.log('\n📊 Totales en base de datos:');
    const totalProcs = await prisma.procedure.count();
    const totalCases = await prisma.transplantCase.count();
    const totalPreops = await prisma.preopEvaluation.count();
    console.log(`  Procedures: ${totalProcs}`);
    console.log(`  TransplantCases: ${totalCases}`);
    console.log(`  PreopEvaluations: ${totalPreops}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
