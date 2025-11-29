// scripts/import-clinicians-from-excel.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importCliniciansFromExcel() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';
    console.log('📊 Importando clínicos desde Excel\n');

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

    // Primero, vamos a ver algunos ejemplos de los datos
    console.log('📋 Primeros 20 registros con anestesistas:\n');
    let count = 0;
    for (let i = 2; i <= sheet.rowCount && count < 20; i++) {
      const row = sheet.getRow(i);
      const anest1 = row.getCell(headers.anestesista1).value;
      const anest2 = row.getCell(headers.anestesista2).value;

      if (anest1 || anest2) {
        count++;
        const ci = row.getCell(headers.ci).value;
        const fecha = row.getCell(headers.fechap).value;
        console.log(`Fila ${i}:`);
        console.log(`  CI: ${ci}`);
        console.log(`  Fecha: ${fecha}`);
        console.log(`  Anestesista1: ${anest1}`);
        console.log(`  Anestesista2: ${anest2}`);
        console.log('');
      }
    }

    // Contar estadísticas
    let withAnest1 = 0;
    let withAnest2 = 0;
    let withBoth = 0;
    let withNone = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const anest1 = row.getCell(headers.anestesista1).value;
      const anest2 = row.getCell(headers.anestesista2).value;

      const has1 = anest1 && String(anest1).trim() !== '';
      const has2 = anest2 && String(anest2).trim() !== '';

      if (has1 && has2) withBoth++;
      else if (has1) withAnest1++;
      else if (has2) withAnest2++;
      else withNone++;
    }

    console.log('\n📊 Estadísticas:');
    console.log(`  Solo Anestesista1: ${withAnest1}`);
    console.log(`  Solo Anestesista2: ${withAnest2}`);
    console.log(`  Ambos anestesistas: ${withBoth}`);
    console.log(`  Sin anestesistas: ${withNone}`);
    console.log(`  Total: ${sheet.rowCount - 1}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCliniciansFromExcel();
