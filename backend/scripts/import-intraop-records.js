// scripts/import-intraop-records.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Mapeo de hojas del Excel a fases del sistema
const sheetPhaseMapping = {
  'IntraopInducc': 'INDUCCION',
  'IntraopDisec': 'DISECCION',
  'IntraopAnhep': 'ANHEPATICA',
  'IntraopPreReperf': 'PRE_REPERFUSION',
  'IntraopPostRepef': 'POST_REPERFUSION',
  'IntropFinVB': 'VIA_BILIAR',
  'IntraopCierre': 'CIERRE'
};

// Helper para convertir fecha de Excel a Date
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Importar el validador de CI
const { normalizarCI } = require('./ci-validator');

// Helper para limpiar y normalizar CI
function cleanCI(ci) {
  if (!ci || ci === 'undefined') return null;
  // Manejar el caso donde CI viene con timestamp (ej: "999999: 10/18/2019 08:38:00")
  const ciStr = String(ci);
  let ciProcesar = ciStr;

  if (ciStr.includes(':')) {
    ciProcesar = ciStr.split(':')[0].trim();
  }

  // Normalizar la CI con el validador
  const validation = normalizarCI(ciProcesar);
  return validation.ci; // Retorna la CI normalizada con DV o null si es inválida
}

// Helper para parsear valor numérico
function parseNumber(value) {
  if (!value || value === 'undefined' || value === '' || value === ' ') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Helper para parsear entero (retorna 0 para fluidos si es null/undefined)
function parseIntForFluids(value) {
  if (!value || value === 'undefined' || value === '' || value === ' ') return 0;
  const num = Number.parseInt(value);
  return isNaN(num) ? 0 : num;
}

async function importIntraopRecords() {
  console.log('\n📊 IMPORTANDO REGISTROS INTRAOPERATORIOS\n');

  try {
    const workbook = XLSX.readFile(excelPath);

    // Primero, obtener el mapeo de CI a caseId
    console.log('📋 Obteniendo mapeo de pacientes a casos...\n');
    const cases = await prisma.transplantCase.findMany({
      select: {
        id: true,
        patientId: true
      }
    });

    const ciToCaseId = {};
    cases.forEach(c => {
      ciToCaseId[c.patientId] = c.id;
    });

    console.log(`✓ Encontrados ${Object.keys(ciToCaseId).length} casos en la BD\n`);
    console.log('='.repeat(80));

    let totalImported = 0;
    let totalSkipped = 0;
    let errors = [];

    // Procesar cada hoja del Excel
    for (const [sheetName, phase] of Object.entries(sheetPhaseMapping)) {
      console.log(`\n📄 Procesando ${sheetName} (${phase})...`);

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`  ⚠️  Hoja ${sheetName} no encontrada`);
        continue;
      }

      // IMPORTANTE: Usar defval para leer TODAS las columnas, incluso las que están muy a la derecha
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
      console.log(`  Registros en hoja: ${data.length}`);

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        try {
          const ci = cleanCI(row.CI);
          if (!ci) {
            skipped++;
            continue;
          }

          const caseId = ciToCaseId[ci];
          if (!caseId) {
            // Paciente no está en los 25 importados, saltar
            skipped++;
            continue;
          }

          const timestamp = excelDateToJSDate(row.Fecha);
          if (!timestamp) {
            skipped++;
            continue;
          }

          // Preparar datos del registro
          const intraopData = {
            caseId: caseId,
            phase: phase,
            timestamp: timestamp,

            // Hemodinamia
            heartRate: parseNumber(row.FC),
            pas: parseNumber(row.PAS),
            pad: parseNumber(row.PAD),
            pam: parseNumber(row.PAm),
            cvp: parseNumber(row.PVC),
            satO2: parseNumber(row.SatO2 || row.SpO2),
            temp: parseNumber(row.Temp),

            // Ventilación
            ventMode: row.PatronVent || null,
            fio2: parseNumber(row.FIO2),
            tidalVolume: parseNumber(row.VC),
            respRate: parseNumber(row.Fr),
            peep: parseNumber(row.PEEP),
            peakPressure: parseNumber(row.PVA),

            // Arterial pulmonar
            paps: parseNumber(row.PAPS),
            papd: parseNumber(row.PAPD),
            papm: parseNumber(row.PAPm),
            pcwp: parseNumber(row.PCP),
            cardiacOutput: parseNumber(row.GC || row.Gasto),
            svO2: parseNumber(row.SatVMixta),

            // Otros monitoreos
            icp: parseNumber(row.PIC),
            bis: parseNumber(row.BIS),
            etCO2: parseNumber(row.EtCO2),

            // Laboratorio COMPLETO - Hematología
            hb: parseNumber(row.Hb),
            hto: parseNumber(row.Hto),
            platelets: parseNumber(row.Plaquetas),

            // Laboratorio - Coagulación
            pt: parseNumber(row.TP),
            inr: parseNumber(row.INR),
            fibrinogen: parseNumber(row.Fibrinogeno),
            aptt: parseNumber(row.APTT || row.TTPA),

            // Laboratorio - Electrolitos
            sodium: parseNumber(row['Na+'] || row.Na),
            potassium: parseNumber(row['K+'] || row.K),
            ionicCalcium: parseNumber(row['Ca++'] || row.Ca),
            magnesium: parseNumber(row.Mg),
            chloride: parseNumber(row['Cl-'] || row.Cl),
            phosphorus: parseNumber(row.P || row.Fosforo),

            // Laboratorio - Gases arteriales
            pH: parseNumber(row.pH),
            paO2: parseNumber(row.PaO2),
            paCO2: parseNumber(row.PaCO2),

            // Laboratorio - Gases venosos
            pvpH: parseNumber(row.Phv || row.pHv),
            pvO2: parseNumber(row.PvO2),
            pvCO2: parseNumber(row.PvCO2),

            // Laboratorio - Metabolismo
            glucose: parseNumber(row.Glicemia || row.Gluc),
            lactate: parseNumber(row.Lactato),
            baseExcess: parseNumber(row.EB),
            hco3: parseNumber(row.HCO3),

            // Laboratorio - Función renal
            azotemia: parseNumber(row.Urea || row.Azotemia),
            creatinine: parseNumber(row.Creatinina),

            // Laboratorio - Función hepática
            sgot: parseNumber(row.SGOT || row.GOT || row.AST),
            sgpt: parseNumber(row.SGPT || row.GPT || row.ALT),
            totalBili: parseNumber(row['Bili Total'] || row.BiliTotal),
            directBili: parseNumber(row['Bili Directa'] || row.BiliDirecta),
            albumin: parseNumber(row.Albumina),
            proteins: parseNumber(row.Proteinas),

            // Fármacos - Anestésicos
            inhalAgent: row.AgenteInhalatorio === 'SI' ? 'SI' : null,
            opioidBolus: row['Opiaceso Bolo'] === 'SI' || row['Opiáceos Bolo'] === 'SI',
            opioidInfusion: row['Opiaceos IC'] === 'SI' || row['Opiáceos IC'] === 'SI',
            hypnoticBolus: row['Hipnoticos Bolo'] === 'SI' || row['Hipnóticos Bolo'] === 'SI',
            hypnoticInfusion: row['Hipnoticos IC'] === 'SI' || row['Hipnóticos IC'] === 'SI',
            relaxantBolus: row['RM Bolo'] === 'SI',
            relaxantInfusion: row['RM IC'] === 'SI',

            // Fármacos - Anestésicos locales
            lidocaineBolus: row['Lidocaina Bolo'] === 'SI' || row['Lidocaína Bolo'] === 'SI',
            lidocaineInfusion: row['Lidocaina IC'] === 'SI' || row['Lidocaína IC'] === 'SI',

            // Fármacos - Vasopresores e inotrópicos
            adrenalineBolus: row['Adrenalina Bolo'] === 'SI',
            adrenalineInfusion: row['Adrenalina IC'] === 'SI',
            dobutamine: row.DBT === 'SI',
            dopamine: row.Dopa === 'SI',
            noradrenaline: row.NA === 'SI',
            phenylephrine: row.Fenilefrina === 'SI',

            // Fármacos - Otros
            insulinBolus: row['Insulina Bolo'] === 'SI',
            insulinInfusion: row['Insulina IC'] === 'SI',
            furosemide: row.Furosemide === 'SI',
            tranexamicBolus: row['Tranexamico Bolo'] === 'SI' || row['Tranexámico Bolo'] === 'SI',
            tranexamicInfusion: row['Tranexamico IC'] === 'SI' || row['Tranexámico IC'] === 'SI',
            calciumGluconBolus: row['Ca Gluconato Bolo'] === 'SI',
            calciumGluconInfusion: row['Ca Gluconato IC'] === 'SI',
            sodiumBicarb: row['Bicarbonato'] === 'SI',
            antibiotics: row.ATB === 'SI',
          };

          const intraopRecord = await prisma.intraopRecord.create({
            data: intraopData
          });

          // Crear registro de fluidos y hemoderivados si hay datos
          const hasFluidData = row['Plasmalyte(ml)'] || row['RLactato(ml)'] || row['GR(U)'] ||
                               row['Plasma(U)'] || row['Perd Insens(ml)'] || row['Diuresis(ml)'];

          if (hasFluidData) {
            try {
              await prisma.fluidsAndBlood.create({
                data: {
                  caseId: caseId,
                  phase: phase,
                  timestamp: timestamp,

                  // Cristaloides
                  plasmalyte: parseIntForFluids(row['Plasmalyte(ml)']),
                  ringer: parseIntForFluids(row['RLactato(ml)']),
                  saline: parseIntForFluids(row['SF(ml)']),
                  dextrose: parseIntForFluids(row['SG(ml)']),
                  albumin: parseIntForFluids(row['CAlbumina(ml)']),

                  // Hemoderivados
                  redBloodCells: parseIntForFluids(row['GR(U)']),
                  plasma: parseIntForFluids(row['Plasma(U)']),
                  platelets: parseIntForFluids(row['CPlaquetas(U)']),
                  cryoprecip: parseIntForFluids(row['Crioprecipitados(ml)']),

                  // Recuperación
                  cellSaver: parseIntForFluids(row['CellSaver(ml)']),

                  // Pérdidas
                  insensibleLoss: parseIntForFluids(row['Perd Insens(ml)']),
                  ascites: parseIntForFluids(row['Ascitis(ml)']),
                  suction: parseIntForFluids(row['Aspirador(ml)']),
                  gauze: parseIntForFluids(row['Gasas(ml)']),

                  // Diuresis
                  urine: parseIntForFluids(row['Diuresis(ml)']),
                }
              });
            } catch (fluidError) {
              // Si hay error en fluidos, no detener la importación del registro intraop
              console.log(`    ⚠️  Error en fluidos:`, fluidError);
            }
          }

          imported++;
          totalImported++;

        } catch (error) {
          errors.push({
            sheet: sheetName,
            ci: cleanCI(row.CI),
            error: error.message
          });
          skipped++;
        }
      }

      console.log(`  ✅ Importados: ${imported}`);
      console.log(`  ⏭️  Saltados: ${skipped}`);
      totalSkipped += skipped;
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Total registros importados: ${totalImported}`);
    console.log(`⏭️  Total registros saltados: ${totalSkipped}`);
    console.log(`❌ Errores: ${errors.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ ERRORES:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Hoja: ${err.sheet}, CI: ${err.ci}, Error: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ Se encontraron ${errors.length} errores (mostrando primeros 10):`);
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Hoja: ${err.sheet}, CI: ${err.ci}, Error: ${err.error}`);
      });
    }

    console.log('\n✅ Importación de registros intraoperatorios completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importIntraopRecords().catch(console.error);
