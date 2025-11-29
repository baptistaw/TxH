// Script para importar datos postoperatorios desde Excel
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('📊 IMPORTACIÓN DE DATOS POSTOPERATORIOS\n');
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

// Función para parsear horas de ARM (puede venir como "> 24", "< 24", etc.)
function parseARMHours(value) {
  if (!value) return null;
  const str = String(value).trim();

  // Si es "> 24", devolver 25
  if (str.includes('>')) return 25;

  // Si es "< 24", devolver 12
  if (str.includes('<')) return 12;

  // Intentar parsear como número
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function importPostOp(row, COL) {
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
            postOp: true
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

    // Preparar datos postoperatorios
    const postopData = {
      caseId: transplantCase.id,
      evaluationDate: parseExcelDate(row[COL.Fecha]) || transplantCase.surgeryDate,

      // Extubación
      extubatedInOR: parseBoolean(row[COL.ExtubadoBQ]),
      mechVentHours: parseARMHours(row[COL.ARMhs]),
      mechVentDays: parseNumber(row[COL.ARMdias]),
      reintubation24h: parseBoolean(row[COL.FallaExtubacion24hs]),

      // Reoperación
      reoperation: parseBoolean(row[COL.Reintervencion]),
      reoperationCause: row[COL.Causa] && row[COL.Causa] !== 'NO' ? row[COL.Causa] : null,

      // Complicaciones mayores
      primaryGraftFailure: parseBoolean(row[COL.FallaInjerto]),
      acuteRenalFailure: parseBoolean(row[COL.IRA]),
      pulmonaryEdema: parseBoolean(row[COL.EPA]),
      neurotoxicity: parseBoolean(row[COL.Neurotoxicidad]),
      rejection: parseBoolean(row[COL.Rechazo]),

      // Scores
      apacheInitial: parseNumber(row[COL.APACHEIni]),

      // Complicaciones específicas
      biliaryComplications: parseBoolean(row[COL.ComplicBiliares]),
      vascularComplications: parseBoolean(row[COL.ComplicVasculares]),
      surgicalBleeding: parseBoolean(row[COL.SangradoQ]),
      otherComplications: row[COL.OtrasCompl] && row[COL.OtrasCompl] !== 'NO' ? row[COL.OtrasCompl] : null,

      // Estancia
      icuDays: parseNumber(row[COL.DiasCTI]),
      wardDays: parseNumber(row[COL.DiasIntSala]),
      dischargeDate: parseExcelDate(row[COL.FechaAltaTx])
    };

    // Verificar si ya existe
    if (transplantCase.postOp) {
      // Actualizar
      await prisma.postOpOutcome.update({
        where: { caseId: transplantCase.id },
        data: postopData
      });
      stats.updated++;
      console.log(`✅ Actualizado: ${patient.name} (${ciRaw})`);
    } else {
      // Crear
      await prisma.postOpOutcome.create({
        data: postopData
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
    const worksheet = workbook.Sheets['PostOp'];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    console.log(`Total de registros en hoja PostOp: ${data.length}\n`);
    console.log('='.repeat(80));
    console.log('\nIniciando importación...\n');

    // Mapeo de columnas
    const COL = {
      CI: 'CI',
      Fecha: 'Fecha',
      ExtubadoBQ: 'Extubado BQ',
      ARMhs: 'ARMhs',
      ARMdias: 'ARMdias',
      FallaExtubacion24hs: 'FallaExtubacion24hs',
      Reintervencion: 'Reintervencion',
      Causa: 'Causa',
      FallaInjerto: 'FallaInjerto',
      IRA: 'IRA',
      EPA: 'EPA',
      Neurotoxicidad: 'Neurotoxicidad',
      Rechazo: 'Rechazo',
      APACHEIni: 'APACHEIni',
      ComplicBiliares: 'ComplicBiliares',
      ComplicVasculares: 'ComplicVasculares',
      SangradoQ: 'SangradoQ',
      OtrasCompl: 'OtrasCompl',
      DiasCTI: 'DiasCTI',
      DiasIntSala: 'DiasIntSala',
      FechaAltaTx: 'FechaAltaTx'
    };

    // Procesar todos los registros
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      if ((i + 1) % 50 === 0) {
        console.log(`Procesando ${i + 1}/${data.length} registros...`);
      }

      await importPostOp(row, COL);

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
    console.log(`   Total procesados:     ${stats.total}`);
    console.log(`   Registros creados:    ${stats.created}`);
    console.log(`   Registros actualizados: ${stats.updated}`);
    console.log(`\n❌ ERRORES:              ${stats.errors.length}`);

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
    console.log('\n✅ IMPORTACIÓN DE POSTOP COMPLETADA\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
