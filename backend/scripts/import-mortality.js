// Script para importar datos de mortalidad y seguimiento desde Excel
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('☠️ IMPORTACIÓN DE DATOS DE MORTALIDAD Y SEGUIMIENTO\n');
console.log('='.repeat(80));

const stats = {
  total: 0,
  created: 0,
  updated: 0,
  errors: []
};

// Función para parsear fecha de Excel
function parseExcelDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Función para parsear booleano
function parseBoolean(value) {
  if (!value) return false;
  const v = String(value).trim().toUpperCase();
  return v === 'SI' || v === 'YES' || v === 'TRUE' || v === '1';
}

// Función para parsear número
function parseNumber(value) {
  if (value == null || value === '' || value === 'undefined') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importMortality(row, COL) {
  const ciRaw = row[COL.CI]?.toString().trim();
  if (!ciRaw) return;

  stats.total++;

  try {
    // Buscar paciente
    const patient = await prisma.patient.findFirst({
      where: {
        ciRaw: {
          equals: ciRaw,
          mode: 'insensitive'
        }
      },
      include: {
        cases: {
          include: {
            mortality: true
          }
        }
      }
    });

    if (!patient) {
      stats.errors.push(`Paciente no encontrado: ${ciRaw}`);
      return;
    }

    if (patient.cases.length === 0) {
      stats.errors.push(`${patient.name} (${ciRaw}) - Sin casos de trasplante`);
      return;
    }

    // Tomar el primer caso (datos históricos tienen un solo trasplante)
    const transplantCase = patient.cases[0];

    // Preparar datos de mortalidad
    const mortalityData = {
      caseId: transplantCase.id,

      // Muerte precoz
      earlyDeath: parseBoolean(row[COL.MuertePrecoz]),
      deathDate: parseExcelDate(row[COL.FechaMuerte]),
      deathCause: row[COL.Causa] && row[COL.Causa] !== 'NO' ? row[COL.Causa] : null,

      // Seguimiento
      aliveAtDischarge: parseBoolean(row[COL.VivoAlta]),
      aliveAt1Year: row[COL.Vivo1Año] ? parseBoolean(row[COL.Vivo1Año]) : null,
      aliveAt3Years: row[COL.Vivo3años] ? parseBoolean(row[COL.Vivo3años]) : null,
      aliveAt5Years: row[COL.Vivo5años] ? parseBoolean(row[COL.Vivo5años]) : null,

      // Causa muerte tardía
      lateDeathCause: row[COL.CausaMuerteTardia] && row[COL.CausaMuerteTardia] !== 'NO' ? row[COL.CausaMuerteTardia] : null,

      // Reingresos
      readmissionWithin6m: parseBoolean(row[COL.Reingreso6meses]),
      daysToFirstReadm: parseNumber(row[COL.DiasHasta1erReingreso]),
      daysToSecondReadm: parseNumber(row[COL.DiasHasta2oReingreso]),
      readmissionCause: row[COL.CausaReingreso] && row[COL.CausaReingreso] !== 'NO' ? row[COL.CausaReingreso] : null
    };

    // Verificar si ya existe
    if (transplantCase.mortality) {
      // Actualizar
      await prisma.mortality.update({
        where: { caseId: transplantCase.id },
        data: mortalityData
      });
      stats.updated++;
      console.log(`✅ Actualizado: ${patient.name} (${ciRaw})`);
    } else {
      // Crear
      await prisma.mortality.create({
        data: mortalityData
      });
      stats.created++;
      console.log(`✅ Creado: ${patient.name} (${ciRaw})`);
    }

  } catch (error) {
    stats.errors.push(`Error procesando ${ciRaw}: ${error.message}`);
    console.error(`❌ Error: ${ciRaw} - ${error.message}`);
  }
}

async function main() {
  try {
    console.log('📖 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['Mortalidad'];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    console.log(`Total de registros en hoja Mortalidad: ${data.length}\n`);
    console.log('='.repeat(80));
    console.log('\nIniciando importación...\n');

    // Mapeo de columnas
    const COL = {
      CI: 'CI',
      MuertePrecoz: 'MuertePrecoz',
      Causa: 'Causa',
      FechaMuerte: 'FechaMuerte',
      VivoAlta: 'VivoAlta',
      Vivo1Año: 'Vivo1Año',
      Vivo3años: 'Vivo3años',
      Vivo5años: 'Vivo5años',
      CausaMuerteTardia: 'CausaMuerteTardia',
      Reingreso6meses: 'Reingreso6meses',
      DiasHasta1erReingreso: 'DiasHasta1erReingreso',
      DiasHasta2oReingreso: 'DiasHasta2oReingreso',
      CausaReingreso: 'CausaReingreso'
    };

    // Procesar todos los registros
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      if ((i + 1) % 100 === 0) {
        console.log(`Procesando ${i + 1}/${data.length} registros...`);
      }

      await importMortality(row, COL);

      // Pequeña pausa cada 20 registros
      if ((i + 1) % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`\n✅ DATOS IMPORTADOS:`);
    console.log(`   Total procesados:       ${stats.total}`);
    console.log(`   Registros creados:      ${stats.created}`);
    console.log(`   Registros actualizados: ${stats.updated}`);
    console.log(`\n❌ ERRORES:                ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📝 PRIMEROS 50 ERRORES:');
      console.log('='.repeat(80));
      stats.errors.slice(0, 50).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (stats.errors.length > 50) {
        console.log(`\n... y ${stats.errors.length - 50} errores más`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ IMPORTACIÓN DE MORTALIDAD COMPLETADA\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
