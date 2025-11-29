// scripts/check-missing-teams-in-excel.js
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

function parseClinicianId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str === 'undefined') return null;

  if (str.includes(':')) {
    const parts = str.split(':');
    const id = parseInt(parts[0].trim());
    if (isNaN(id)) return null;
    return id;
  }

  return null;
}

async function checkMissingTeams() {
  try {
    const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

    console.log('🔍 Verificando equipos faltantes en BD vs Excel\n');

    // Leer Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.getWorksheet('DatosTrasplante');

    if (!sheet) {
      console.log('❌ No se encontró la hoja DatosTrasplante');
      return;
    }

    // Obtener headers
    const headerRow = sheet.getRow(1);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
      const name = String(cell.value).trim();
      headers[name] = colNumber;
    });

    console.log('📋 Columnas de equipo en Excel:');
    ['CI', 'Anestesista 1', 'Anestesista 2', 'Cirujano 1', 'Cirujano 2', 'Intensivista', 'Hepatólogo', 'NurseCoordinadora'].forEach(col => {
      if (headers[col]) {
        console.log(`  ✅ ${col}: columna ${headers[col]}`);
      } else {
        console.log(`  ❌ ${col}: NO ENCONTRADA`);
      }
    });

    console.log('\n📊 Analizando primeros 20 registros del Excel:\n');

    let withTeam = 0;
    let withoutTeam = 0;

    for (let i = 2; i <= Math.min(21, sheet.rowCount); i++) {
      const row = sheet.getRow(i);
      const ci = row.getCell(headers['CI']).value;

      if (!ci) continue;

      const anest1 = row.getCell(headers['Anestesista 1']).value;
      const anest2 = row.getCell(headers['Anestesista 2']).value;
      const cirug1 = row.getCell(headers['Cirujano 1']).value;
      const cirug2 = row.getCell(headers['Cirujano 2']).value;

      const hasTeam = anest1 || anest2 || cirug1 || cirug2;

      if (hasTeam) withTeam++;
      else withoutTeam++;

      console.log(`Fila ${i}: CI=${ci}`);
      console.log(`  Anest1: ${anest1 || 'NULL'}`);
      console.log(`  Anest2: ${anest2 || 'NULL'}`);
      console.log(`  Cirug1: ${cirug1 || 'NULL'}`);
      console.log(`  Cirug2: ${cirug2 || 'NULL'}`);
      console.log(`  Tiene equipo: ${hasTeam ? 'SÍ' : 'NO'}`);
      console.log('');
    }

    console.log(`\n📊 De los primeros 20 registros:`);
    console.log(`  Con equipo: ${withTeam}`);
    console.log(`  Sin equipo: ${withoutTeam}`);

    // Ahora verificar casos específicos sin equipo en BD
    console.log('\n\n🔍 Verificando casos sin equipo en BD...\n');

    const casesWithoutTeam = await prisma.transplantCase.findMany({
      where: {
        team: { none: {} }
      },
      include: {
        patient: { select: { id: true, ciRaw: true, name: true } }
      },
      take: 10
    });

    console.log(`Total de casos sin equipo en BD: ${casesWithoutTeam.length} (mostrando primeros 10)\n`);

    for (const c of casesWithoutTeam) {
      const ciValidation = normalizarCI(c.patient.ciRaw);

      console.log(`\n📋 ${c.patient.name} (CI: ${c.patient.ciRaw})`);
      console.log(`   ID del caso: ${c.id}`);

      // Buscar en Excel
      let found = false;
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const excelCi = row.getCell(headers['CI']).value;

        if (!excelCi) continue;

        const excelCiValidation = normalizarCI(excelCi);

        if (excelCiValidation.ci === ciValidation.ci) {
          found = true;

          const anest1 = row.getCell(headers['Anestesista 1']).value;
          const anest2 = row.getCell(headers['Anestesista 2']).value;
          const cirug1 = row.getCell(headers['Cirujano 1']).value;
          const cirug2 = row.getCell(headers['Cirujano 2']).value;

          console.log(`   ✅ Encontrado en Excel (fila ${i}):`);
          console.log(`      Anest1: ${anest1 || 'NULL'}`);
          console.log(`      Anest2: ${anest2 || 'NULL'}`);
          console.log(`      Cirug1: ${cirug1 || 'NULL'}`);
          console.log(`      Cirug2: ${cirug2 || 'NULL'}`);

          if (anest1 || anest2 || cirug1 || cirug2) {
            console.log(`      ⚠️  TIENE EQUIPO EN EXCEL pero NO en BD!`);
          } else {
            console.log(`      ✅ Tampoco tiene equipo en Excel`);
          }

          break;
        }
      }

      if (!found) {
        console.log(`   ❌ No encontrado en Excel`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingTeams();
