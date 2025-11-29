// Importación de referencias a exámenes complementarios preoperatorios
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx';

console.log('📋 IMPORTACIÓN DE EXÁMENES COMPLEMENTARIOS PREOPERATORIOS\n');
console.log('='.repeat(80));
console.log(`Archivo: ${excelPath}\n`);

// Función para parsear fecha de Excel
function parseExcelDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Función para buscar PreopEvaluation por CI y fecha
async function findPreopEvaluation(ci, fecha) {
  if (!ci || !fecha) return null;

  try {
    // Buscar paciente por CI (usando ciRaw)
    const patient = await prisma.patient.findFirst({
      where: {
        ciRaw: {
          equals: ci,
          mode: 'insensitive'
        }
      }
    });

    if (!patient) {
      return null;
    }

    // Buscar evaluación preoperatoria cercana a la fecha
    const evaluations = await prisma.preopEvaluation.findMany({
      where: {
        patientId: patient.id
      }
    });

    if (evaluations.length === 0) {
      return null;
    }

    // Buscar evaluación más cercana a la fecha
    // Tolerancia de ±30 días
    const targetDate = fecha.getTime();
    const tolerance = 30 * 24 * 60 * 60 * 1000; // 30 días

    let closestEval = null;
    let minDiff = Infinity;

    for (const eval of evaluations) {
      const evalDate = eval.evaluationDate.getTime();
      const diff = Math.abs(evalDate - targetDate);

      if (diff <= tolerance && diff < minDiff) {
        minDiff = diff;
        closestEval = eval;
      }
    }

    return closestEval;
  } catch (error) {
    console.error(`   ❌ Error buscando evaluación para CI ${ci}:`, error.message);
    return null;
  }
}

// Mapeo de tipos de exámenes
const EXAM_TYPES = {
  ECG: 'ECG',
  ECoCardio: 'Ecocardiograma',
  EstudioFuncional: 'Estudio Funcional Respiratorio',
  RxTx: 'Rx Tórax',
  Fresp: 'Función Respiratoria',
  ExamCompOtros: 'Otros Exámenes'
};

// Función principal
async function importExams() {
  try {
    console.log('📖 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Preoperatorio'];

    // IMPORTANTE: Usar header: 1 para obtener TODAS las columnas (98 columnas)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rawData[0];
    const rows = rawData.slice(1); // Skip header row

    console.log(`Total de registros en Excel: ${rows.length}`);
    console.log(`Total de columnas: ${headers.length}\n`);

    // Índices de columnas de exámenes
    const EXAM_COLS = {
      CI: 1,
      Fecha: 2,
      ECG: 37,
      ECoCardio: 38,
      InformeEco: 39,
      EstudioFuncional: 40,
      InformeEstFuncional: 41,
      RxTx: 42,
      Fresp: 43,
      InformeFResp: 44,
      InformeCACG1: 45,
      InformeCACG2: 46,
      InformeAngioTAC1: 47,
      InformeAngioTAC2: 48,
      ExamCompOtros: 49,
      InformesOtros1: 50,
      InformesOtros2: 51
    };

    console.log('='.repeat(80));

    let stats = {
      total: rows.length,
      sinFecha: 0,
      sinCI: 0,
      evalNoEncontrada: 0,
      examenesImportados: 0,
      registrosProcesados: 0,
      errores: 0
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Parse fecha
      const fecha = parseExcelDate(row[EXAM_COLS.Fecha]);
      if (!fecha) {
        stats.sinFecha++;
        continue;
      }

      const ci = row[EXAM_COLS.CI]?.toString().trim();
      if (!ci) {
        stats.sinCI++;
        continue;
      }

      // Buscar evaluación preoperatoria
      const preopEval = await findPreopEvaluation(ci, fecha);

      if (!preopEval) {
        stats.evalNoEncontrada++;
        continue;
      }

      // Recolectar exámenes disponibles
      const exams = [];

      // ECG
      const ecg = row[EXAM_COLS.ECG];
      if (ecg && ecg !== '' && ecg !== 'undefined' && ecg !== null) {
        exams.push({
          examType: 'ECG',
          fileName: String(ecg).trim(),
          description: 'Electrocardiograma'
        });
      }

      // Ecocardiograma
      const eco = row[EXAM_COLS.ECoCardio];
      if (eco && eco !== '' && eco !== 'undefined' && eco !== null) {
        exams.push({
          examType: 'Ecocardiograma',
          fileName: String(eco).trim(),
          description: 'Ecocardiograma'
        });
      }

      // Informe Ecocardiograma
      const informeEco = row[EXAM_COLS.InformeEco];
      if (informeEco && informeEco !== '' && informeEco !== 'undefined' && informeEco !== null) {
        exams.push({
          examType: 'Ecocardiograma',
          fileName: String(informeEco).trim(),
          description: 'Informe Ecocardiograma'
        });
      }

      // Estudio Funcional Respiratorio
      const estFunc = row[EXAM_COLS.EstudioFuncional];
      if (estFunc && estFunc !== '' && estFunc !== 'undefined' && estFunc !== null) {
        exams.push({
          examType: 'Estudio Funcional Respiratorio',
          fileName: String(estFunc).trim(),
          description: 'Estudio Funcional Respiratorio'
        });
      }

      // Informe Estudio Funcional
      const informeEstFunc = row[EXAM_COLS.InformeEstFuncional];
      if (informeEstFunc && informeEstFunc !== '' && informeEstFunc !== 'undefined' && informeEstFunc !== null) {
        exams.push({
          examType: 'Estudio Funcional Respiratorio',
          fileName: String(informeEstFunc).trim(),
          description: 'Informe Estudio Funcional'
        });
      }

      // Rx Tórax
      const rxTx = row[EXAM_COLS.RxTx];
      if (rxTx && rxTx !== '' && rxTx !== 'undefined' && rxTx !== null) {
        exams.push({
          examType: 'Rx Tórax',
          fileName: String(rxTx).trim(),
          description: 'Radiografía de Tórax'
        });
      }

      // Función Respiratoria
      const fresp = row[EXAM_COLS.Fresp];
      if (fresp && fresp !== '' && fresp !== 'undefined' && fresp !== null) {
        exams.push({
          examType: 'Función Respiratoria',
          fileName: String(fresp).trim(),
          description: 'Función Respiratoria'
        });
      }

      // Informe Función Respiratoria
      const informeFResp = row[EXAM_COLS.InformeFResp];
      if (informeFResp && informeFResp !== '' && informeFResp !== 'undefined' && informeFResp !== null) {
        exams.push({
          examType: 'Función Respiratoria',
          fileName: String(informeFResp).trim(),
          description: 'Informe Función Respiratoria'
        });
      }

      // Informes CACG
      const informeCACG1 = row[EXAM_COLS.InformeCACG1];
      if (informeCACG1 && informeCACG1 !== '' && informeCACG1 !== 'undefined' && informeCACG1 !== null) {
        exams.push({
          examType: 'Cateterismo',
          fileName: String(informeCACG1).trim(),
          description: 'Informe Cateterismo Cardíaco 1'
        });
      }

      const informeCACG2 = row[EXAM_COLS.InformeCACG2];
      if (informeCACG2 && informeCACG2 !== '' && informeCACG2 !== 'undefined' && informeCACG2 !== null) {
        exams.push({
          examType: 'Cateterismo',
          fileName: String(informeCACG2).trim(),
          description: 'Informe Cateterismo Cardíaco 2'
        });
      }

      // Informes AngioTAC
      const informeAngioTAC1 = row[EXAM_COLS.InformeAngioTAC1];
      if (informeAngioTAC1 && informeAngioTAC1 !== '' && informeAngioTAC1 !== 'undefined' && informeAngioTAC1 !== null) {
        exams.push({
          examType: 'AngioTAC',
          fileName: String(informeAngioTAC1).trim(),
          description: 'Informe AngioTAC Coronario 1'
        });
      }

      const informeAngioTAC2 = row[EXAM_COLS.InformeAngioTAC2];
      if (informeAngioTAC2 && informeAngioTAC2 !== '' && informeAngioTAC2 !== 'undefined' && informeAngioTAC2 !== null) {
        exams.push({
          examType: 'AngioTAC',
          fileName: String(informeAngioTAC2).trim(),
          description: 'Informe AngioTAC Coronario 2'
        });
      }

      // Otros exámenes
      const otros = row[EXAM_COLS.ExamCompOtros];
      if (otros && otros !== '' && otros !== 'undefined' && otros !== null) {
        exams.push({
          examType: 'Otros',
          fileName: String(otros).trim(),
          description: 'Otros Exámenes Complementarios'
        });
      }

      // Informes Otros
      const informesOtros1 = row[EXAM_COLS.InformesOtros1];
      if (informesOtros1 && informesOtros1 !== '' && informesOtros1 !== 'undefined' && informesOtros1 !== null) {
        exams.push({
          examType: 'Otros',
          fileName: String(informesOtros1).trim(),
          description: 'Informe Otros 1'
        });
      }

      const informesOtros2 = row[EXAM_COLS.InformesOtros2];
      if (informesOtros2 && informesOtros2 !== '' && informesOtros2 !== 'undefined' && informesOtros2 !== null) {
        exams.push({
          examType: 'Otros',
          fileName: String(informesOtros2).trim(),
          description: 'Informe Otros 2'
        });
      }

      // Si hay exámenes, importarlos
      if (exams.length > 0) {
        console.log(`\n[${i + 1}/${rows.length}] CI: ${ci}, Fecha: ${fecha.toISOString().split('T')[0]}`);
        console.log(`   ✅ Encontrada evaluación: ${preopEval.id}`);
        console.log(`   📋 Exámenes a importar: ${exams.length}`);

        for (const exam of exams) {
          try {
            await prisma.preopAttachment.create({
              data: {
                preopId: preopEval.id,
                type: exam.examType,
                fileName: exam.fileName,
                url: exam.fileName, // URL local/relativa al archivo
                description: exam.description,
                appsheetUrl: exam.fileName, // Preservar referencia original
                uploadedAt: new Date()
              }
            });

            stats.examenesImportados++;
            console.log(`      ✓ ${exam.examType}: ${exam.fileName.substring(0, 60)}`);

          } catch (error) {
            stats.errores++;
            console.error(`      ❌ Error importando ${exam.examType}:`, error.message || error);
          }
        }

        stats.registrosProcesados++;
      }

      // Pequeña pausa cada 10 registros
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`   Total registros procesados:     ${stats.total}`);
    console.log(`   ✅ Registros con exámenes:      ${stats.registrosProcesados}`);
    console.log(`   ✅ Exámenes importados:         ${stats.examenesImportados}`);
    console.log(`\n⚠️  OMITIDOS:`);
    console.log(`   Sin fecha:                      ${stats.sinFecha}`);
    console.log(`   Sin CI:                         ${stats.sinCI}`);
    console.log(`   Evaluación no encontrada:       ${stats.evalNoEncontrada}`);
    console.log(`\n❌ ERRORES:                        ${stats.errores}`);
    console.log('\n='.repeat(80));

    if (stats.examenesImportados > 0) {
      console.log('\n✅ IMPORTACIÓN DE EXÁMENES COMPLETADA\n');
      console.log('Los archivos referenciados deberán estar disponibles en el sistema de archivos.');
    } else {
      console.log('\n⚠️  NO SE IMPORTARON EXÁMENES\n');
      console.log('Verifica que:');
      console.log('  1. Las evaluaciones preoperatorias estén importadas');
      console.log('  2. El Excel contenga referencias a archivos de exámenes');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importExams()
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
