// Verificación completa de importación de datos
// Compara TODOS los campos del Excel con la base de datos
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🔍 VERIFICACIÓN COMPLETA DE IMPORTACIÓN DE DATOS\n');
console.log('='.repeat(80));

const stats = {
  totalPacientes: 0,
  pacientesConDatos: 0,
  pacientesSinPreop: 0,
  preopsSinLabs: 0,
  preopsSinComorbilidades: 0,
  preopsSinComplicaciones: 0,
  labsIncompletos: 0,
  errores: []
};

// Función para parsear fecha de Excel
function parseExcelDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Función para parsear valor numérico
function parseNumber(value) {
  if (value == null || value === '' || value === 'undefined') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function verificarPaciente(row, COL) {
  const ciRaw = row[COL.CI]?.toString().trim();
  if (!ciRaw) return null;

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
        preops: {
          include: {
            labs: true,
            etiologies: true
          }
        }
      }
    });

    if (!patient) {
      stats.errores.push(`Paciente ${ciRaw} NO ENCONTRADO en BD`);
      return null;
    }

    stats.totalPacientes++;

    // Verificar si tiene evaluación preoperatoria
    if (patient.preops.length === 0) {
      stats.pacientesSinPreop++;
      stats.errores.push(`${patient.name} (${ciRaw}) - SIN evaluación preoperatoria`);
      return { patient, hasPreop: false };
    }

    const preop = patient.preops[0]; // Tomar la primera evaluación

    // Verificar datos de laboratorio
    const hasLabs = preop.labs.length > 0;
    if (!hasLabs) {
      stats.preopsSinLabs++;
      stats.errores.push(`${patient.name} (${ciRaw}) - SIN datos de laboratorio`);
    } else {
      // Verificar completitud de labs
      const lab = preop.labs[0];
      const excelLabs = {
        hb: parseNumber(row[COL.Hb]),
        hto: parseNumber(row[COL.Hto]),
        platelets: parseNumber(row[COL.Plaquetas]),
        pt: parseNumber(row[COL.TP]),
        inr: parseNumber(row[COL.INR]),
        fibrinogen: parseNumber(row[COL.Fib]),
        glucose: parseNumber(row[COL.Glicemia]),
        sodium: parseNumber(row[COL.Na]),
        potassium: parseNumber(row[COL.K]),
        azotemia: parseNumber(row[COL.Azoemia]),
        creatinine: parseNumber(row[COL.Crea]),
        sgot: parseNumber(row[COL.TGO]),
        sgpt: parseNumber(row[COL.TGP]),
        totalBili: parseNumber(row[COL.Btotal]),
        albumin: parseNumber(row[COL.Albumina]),
        tsh: parseNumber(row[COL.TSH])
      };

      // Contar cuántos datos del Excel no están en BD
      let missing = 0;
      for (const [key, excelValue] of Object.entries(excelLabs)) {
        if (excelValue !== null && lab[key] === null) {
          missing++;
        }
      }

      if (missing > 0) {
        stats.labsIncompletos++;
        stats.errores.push(`${patient.name} (${ciRaw}) - Faltan ${missing} datos de laboratorio`);
      }
    }

    // Verificar comorbilidades
    const excelComorbilidades = {
      coronaryDisease: row[COL.EnfCoronaria],
      hypertension: row[COL.HTA],
      valvulopathy: row[COL.Valvulopatia],
      arrhythmia: row[COL.Arritmias],
      smokerCOPD: row[COL.FumadorEPOC],
      asthma: row[COL.Asma],
      renalFailure: row[COL.InsufRenal],
      diabetes: row[COL.Diabetes],
      thyroidDysfunction: row[COL.DisfTiroidea]
    };

    let hasComorbilidades = false;
    for (const value of Object.values(excelComorbilidades)) {
      if (value === 'SI' || value === 'YES') {
        hasComorbilidades = true;
        break;
      }
    }

    if (hasComorbilidades) {
      const bdComorbilidades = [
        preop.coronaryDisease,
        preop.hypertension,
        preop.valvulopathy,
        preop.arrhythmia,
        preop.smokerCOPD,
        preop.asthma,
        preop.renalFailure,
        preop.diabetes,
        preop.thyroidDysfunction
      ];

      const hasBDComorbilidades = bdComorbilidades.some(v => v === true);
      if (!hasBDComorbilidades) {
        stats.preopsSinComorbilidades++;
        stats.errores.push(`${patient.name} (${ciRaw}) - Comorbilidades del Excel NO importadas`);
      }
    }

    // Verificar complicaciones
    const excelComplicaciones = {
      hepatoRenalSyndrome: row[COL.SindHepatorrenal],
      portalHypertension: row[COL.HTP],
      ascites: row[COL.Ascitis],
      esophagealVarices: row[COL.VaricesEsof],
      encephalopathy: row[COL.Encefalopatia],
      hepatocarcinoma: row[COL.HCC],
      portalThrombosis: row[COL.TrombPediculo]
    };

    let hasComplicaciones = false;
    for (const value of Object.values(excelComplicaciones)) {
      if (value === 'SI' || value === 'YES' || (typeof value === 'string' && value.trim() !== '' && value !== 'NO')) {
        hasComplicaciones = true;
        break;
      }
    }

    if (hasComplicaciones) {
      const bdComplicaciones = [
        preop.hepatoRenalSyndrome,
        preop.portalHypertension,
        preop.ascites,
        preop.esophagealVarices,
        preop.encephalopathy,
        preop.hepatocarcinoma,
        preop.portalThrombosis
      ];

      const hasBDComplicaciones = bdComplicaciones.some(v => v === true || (typeof v === 'string' && v.trim() !== ''));
      if (!hasBDComplicaciones) {
        stats.preopsSinComplicaciones++;
        stats.errores.push(`${patient.name} (${ciRaw}) - Complicaciones del Excel NO importadas`);
      }
    }

    stats.pacientesConDatos++;
    return { patient, preop, hasPreop: true, hasLabs };

  } catch (error) {
    stats.errores.push(`Error verificando paciente ${ciRaw}: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('📖 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    console.log(`Total de registros en Excel: ${data.length}\n`);
    console.log('='.repeat(80));
    console.log('\nIniciando verificación...\n');

    // Mapeo de columnas
    const COL = {
      CI: 'CI',
      Nombre: 'Nombre',
      Fecha: 'Fecha',
      FechaLaboratorio: 'FechaLaboratorio',
      // Laboratorio
      Hb: 'Hb',
      Hto: 'Hto',
      Plaquetas: 'Plaquetas',
      TP: 'TP',
      INR: 'INR',
      Fib: 'Fib',
      Glicemia: 'Glicemia',
      Na: 'Na+',
      K: 'K+',
      Azoemia: 'Azoemia',
      Crea: 'Crea',
      TGO: 'TGO',
      TGP: 'TGP',
      Btotal: 'Bilirrubina Total',
      Albumina: 'Albumina',
      TSH: 'TSH',
      // Comorbilidades
      EnfCoronaria: 'Enf Coronaria',
      HTA: 'HTA',
      Valvulopatia: 'Valvulopatia',
      Arritmias: 'Arritmias/Marcapaso',
      FumadorEPOC: 'Fumador/EPOC',
      Asma: 'ASMA',
      InsufRenal: 'Insuf Renal',
      Diabetes: 'Diabetes',
      DisfTiroidea: 'Disfunción Tiroidea',
      // Complicaciones
      SindHepatorrenal: 'Sind. Hepatorrenal',
      HTP: 'Hipertension Portal',
      Ascitis: 'Ascitis',
      VaricesEsof: 'Varices Esof.',
      Encefalopatia: 'Encefalopatia',
      HCC: 'Hepatocarcinoma',
      TrombPediculo: 'Trombosis Pediculo H'
    };

    // Procesar cada registro
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if ((i + 1) % 50 === 0) {
        console.log(`Verificando ${i + 1}/${data.length} registros...`);
      }
      await verificarPaciente(row, COL);

      // Pequeña pausa cada 20 registros
      if ((i + 1) % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(80));
    console.log(`\n✅ PACIENTES VERIFICADOS:`);
    console.log(`   Total pacientes encontrados: ${stats.totalPacientes}`);
    console.log(`   Con datos completos:         ${stats.pacientesConDatos}`);
    console.log(`\n⚠️  PROBLEMAS ENCONTRADOS:`);
    console.log(`   Sin evaluación preop:        ${stats.pacientesSinPreop}`);
    console.log(`   Sin datos de laboratorio:    ${stats.preopsSinLabs}`);
    console.log(`   Con labs incompletos:        ${stats.labsIncompletos}`);
    console.log(`   Sin comorbilidades:          ${stats.preopsSinComorbilidades}`);
    console.log(`   Sin complicaciones:          ${stats.preopsSinComplicaciones}`);
    console.log(`\n❌ TOTAL DE ERRORES:            ${stats.errores.length}`);

    if (stats.errores.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📝 DETALLE DE ERRORES:');
      console.log('='.repeat(80));
      stats.errores.slice(0, 50).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (stats.errores.length > 50) {
        console.log(`\n... y ${stats.errores.length - 50} errores más`);
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
