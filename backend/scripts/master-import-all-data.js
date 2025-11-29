// IMPORTACIÓN MAESTRA DE TODOS LOS DATOS
// Importa absolutamente todo desde el Excel de Appsheet
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('🚀 IMPORTACIÓN MAESTRA DE TODOS LOS DATOS\n');
console.log('='.repeat(80));
console.log(`Archivo: ${excelPath}\n`);

const stats = {
  pacientesActualizados: 0,
  preopActualizadas: 0,
  labsCreados: 0,
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

// Función para parsear booleano (para campos que usan SI/NO)
function parseBoolean(value) {
  if (!value) return false;
  const v = String(value).trim().toUpperCase();
  return v === 'SI' || v === 'YES' || v === 'TRUE' || v === '1';
}

// Función para parsear campos que tienen valor descriptivo o NO
// Si tiene cualquier valor que no sea "NO", se considera true
function parseBooleanOrDescriptive(value) {
  if (!value || value === 'undefined') return false;
  const v = String(value).trim().toUpperCase();
  return v !== 'NO';
}

// Función para parsear clase funcional
function parseFunctionalClass(value) {
  if (!value || value === 'undefined') return null;
  const v = String(value).trim();

  // Mapeo de valores en español a enum
  const mapping = {
    'I': 'I',
    'II': 'II',
    'III': 'III',
    'IV': 'IV',
    'Pendiente': 'PENDING',
    'No se puede evaluar': 'NOT_EVALUABLE'
  };

  return mapping[v] || null;
}

async function procesarPaciente(row, COL) {
  const ciRaw = row[COL.CI]?.toString().trim();
  if (!ciRaw) return;

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
            labs: true
          }
        }
      }
    });

    if (!patient) {
      stats.errores.push(`Paciente ${ciRaw} no encontrado`);
      return;
    }

    // Actualizar datos del paciente si es necesario
    const patientUpdate = {};
    const peso = parseNumber(row[COL.Peso]);
    const talla = parseNumber(row[COL.Talla]);

    if (peso && peso !== patient.weight) patientUpdate.weight = peso;
    if (talla && talla !== patient.height) patientUpdate.height = talla;

    if (Object.keys(patientUpdate).length > 0) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: patientUpdate
      });
      stats.pacientesActualizados++;
    }

    // Procesar evaluación preoperatoria
    if (patient.preops.length === 0) {
      stats.errores.push(`${patient.name} (${ciRaw}) - Sin evaluación preoperatoria`);
      return;
    }

    const preop = patient.preops[0];
    const fecha = parseExcelDate(row[COL.Fecha]);

    // Actualizar datos de la evaluación preoperatoria
    const preopUpdate = {
      // Comorbilidades (usan valores descriptivos, no SI/NO)
      coronaryDisease: parseBooleanOrDescriptive(row[COL.EnfCoronaria]),
      hypertension: parseBooleanOrDescriptive(row[COL.HTA]),
      valvulopathy: row[COL.Valvulopatia] && row[COL.Valvulopatia] !== 'NO' ? row[COL.Valvulopatia] : null,
      arrhythmia: parseBooleanOrDescriptive(row[COL.Arritmias]),
      smokerCOPD: parseBooleanOrDescriptive(row[COL.FumadorEPOC]),
      asthma: parseBooleanOrDescriptive(row[COL.Asma]),
      renalFailure: parseBooleanOrDescriptive(row[COL.InsufRenal]),
      diabetes: parseBooleanOrDescriptive(row[COL.Diabetes]),
      thyroidDysfunction: parseBooleanOrDescriptive(row[COL.DisfTiroidea]),

      // Complicaciones (algunas usan valores descriptivos)
      hepatoRenalSyndrome: parseBooleanOrDescriptive(row[COL.SindHepatorrenal]),
      portalHypertension: parseBooleanOrDescriptive(row[COL.HTP]),
      ascites: parseBooleanOrDescriptive(row[COL.Ascitis]),
      esophagealVarices: parseBooleanOrDescriptive(row[COL.VaricesEsof]),
      encephalopathy: parseBooleanOrDescriptive(row[COL.Encefalopatia]),
      hepatocarcinoma: parseBoolean(row[COL.HCC]), // Este sí usa SI/NO
      portalThrombosis: parseBooleanOrDescriptive(row[COL.TrombPediculo]),

      // Observaciones
      comorbiditiesObs: row[COL.ObsComorbilidades] || null,
      complicationsObs: row[COL.ObsComplicaciones] || null,

      // Clase funcional
      functionalClass: parseFunctionalClass(row[COL.ClaseFuncional]),
      mechanicalVent: parseBoolean(row[COL.ARM])
    };

    await prisma.preopEvaluation.update({
      where: { id: preop.id },
      data: preopUpdate
    });
    stats.preopActualizadas++;

    // Crear/actualizar laboratorios
    if (preop.labs.length === 0) {
      const labDate = parseExcelDate(row[COL.FechaLaboratorio]) || fecha;
      const year = labDate ? labDate.getFullYear() : 2019;

      const labData = {
        preopId: preop.id,
        labDate: labDate || new Date()
      };

      if (year >= 2019) {
        // Datos completos desde 2019
        labData.hb = parseNumber(row[COL.Hb]);
        labData.hto = parseNumber(row[COL.Hto]);
        labData.platelets = parseNumber(row[COL.Plaquetas]);
        labData.pt = parseNumber(row[COL.TP]);
        labData.inr = parseNumber(row[COL.INR]);
        labData.fibrinogen = parseNumber(row[COL.Fib]);
        labData.glucose = parseNumber(row[COL.Glicemia]);
        labData.sodium = parseNumber(row[COL.Na]);
        labData.potassium = parseNumber(row[COL.K]);
        labData.ionicCalcium = parseNumber(row[COL.CaIonico]);
        labData.magnesium = parseNumber(row[COL.Mg]);
        labData.azotemia = parseNumber(row[COL.Azoemia]);
        labData.creatinine = parseNumber(row[COL.Crea]);
        labData.gfr = parseNumber(row[COL.IFG]);
        labData.sgot = parseNumber(row[COL.TGO]);
        labData.sgpt = parseNumber(row[COL.TGP]);
        labData.totalBili = parseNumber(row[COL.Btotal]);
        labData.albumin = parseNumber(row[COL.Albumina]);
        labData.tsh = parseNumber(row[COL.TSH]);
      } else {
        // Datos parciales pre-2019
        labData.hb = parseNumber(row[COL.Hb]);
        labData.potassium = parseNumber(row[COL.K]);
        labData.albumin = parseNumber(row[COL.Albumina]);
        labData.ionicCalcium = parseNumber(row[COL.CaIonico]);
      }

      // Verificar si tiene al menos un dato
      const values = Object.values(labData).filter(v => v !== null && v !== undefined);
      if (values.length > 2) { // Más que solo preopId y labDate
        try {
          await prisma.preopLabs.create({
            data: labData
          });
          stats.labsCreados++;
        } catch (error) {
          stats.errores.push(`${patient.name} (${ciRaw}) - Error creando lab: ${error.message}`);
        }
      }
    }

  } catch (error) {
    stats.errores.push(`Error procesando paciente ${ciRaw}: ${error.message}`);
  }
}

async function main() {
  try {
    console.log('📖 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['Preoperatorio']; // Usar la hoja Preoperatorio
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    console.log(`Total de registros en hoja Preoperatorio: ${data.length}\n`);
    console.log('='.repeat(80));
    console.log('\nIniciando importación...\n');

    // Mapeo de columnas (nombres exactos del Excel)
    const COL = {
      CI: 'CI',
      Fecha: 'Fecha',
      FechaLaboratorio: 'FechaLaboratorio',
      Peso: 'Peso',
      Talla: 'Talla',
      // Laboratorio
      Hb: 'Hb',
      Hto: 'Hto',
      Plaquetas: 'Plaquetas',
      TP: 'TP',
      INR: 'INR',
      Fib: 'Fib',
      Glicemia: 'Glicemia',
      Na: 'Na',
      K: 'K',
      CaIonico: 'CaIonico',
      Mg: 'Mg',
      Azoemia: 'Azo',
      Crea: 'Crea',
      IFG: 'IFG',
      TGO: 'TGO',
      TGP: 'TGP',
      Btotal: 'Btotal',
      Albumina: 'Albumina',
      TSH: 'TSH',
      // Comorbilidades
      EnfCoronaria: 'EnfCoronaria',
      HTA: 'HTA',
      Valvulopatia: 'Valvulopatia',
      Arritmias: 'ArritmiaMarcapaso',
      FumadorEPOC: 'Fumador/EPOC',
      Asma: 'ASMA',
      InsufRenal: 'IRenal',
      Diabetes: 'Diabetes',
      DisfTiroidea: 'DisfTiroidea',
      // Complicaciones
      SindHepatorrenal: 'SndHepatorenal',
      HTP: 'HTPortal',
      Ascitis: 'Ascitis',
      VaricesEsof: 'VaricesEsof',
      Encefalopatia: 'Encefalopatia',
      HCC: 'Hepatocarcinoma',
      TrombPediculo: 'TrobosisP',
      // Estudios
      ECG: 'ECG',
      Eco: 'ECoCardio',
      // Observaciones
      ObsComorbilidades: 'ObsComorbilidades',
      ObsComplicaciones: 'ObsComplicaciones',
      // Estado funcional
      ClaseFuncional: 'ClaseFuncional',
      ARM: 'ARM'
    };

    // Procesar todos los registros
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      if ((i + 1) % 50 === 0) {
        console.log(`Procesando ${i + 1}/${data.length} registros...`);
      }

      await procesarPaciente(row, COL);

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
    console.log(`   Pacientes actualizados:      ${stats.pacientesActualizados}`);
    console.log(`   Evaluaciones actualizadas:   ${stats.preopActualizadas}`);
    console.log(`   Laboratorios creados:        ${stats.labsCreados}`);
    console.log(`\n❌ ERRORES:                     ${stats.errores.length}`);

    if (stats.errores.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📝 PRIMEROS 50 ERRORES:');
      console.log('='.repeat(80));
      stats.errores.slice(0, 50).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (stats.errores.length > 50) {
        console.log(`\n... y ${stats.errores.length - 50} errores más`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ IMPORTACIÓN MAESTRA COMPLETADA\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
