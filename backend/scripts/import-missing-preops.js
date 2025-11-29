// scripts/import-missing-preops.js
// Importa evaluaciones preoperatorias faltantes (pacientes sin trasplante)

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

async function importMissingPreops() {
  console.log('\n📊 IMPORTACIÓN DE EVALUACIONES PREOPERATORIAS FALTANTES\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);

    console.log(`\nRegistros en Excel - Preoperatorio: ${preopData.length}`);

    // Obtener evaluaciones ya importadas
    const existingPreops = await prisma.preopEvaluation.findMany({
      select: { patientId: true }
    });
    const existingPatientIds = new Set(existingPreops.map(p => p.patientId));

    console.log(`Evaluaciones ya importadas: ${existingPreops.length}`);
    console.log('');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const preop of preopData) {
      const ciValidation = normalizarCI(preop.CI);

      if (!ciValidation.ci) {
        errors++;
        continue;
      }

      const ci = ciValidation.ci;

      // Skip si ya existe evaluación para este paciente
      if (existingPatientIds.has(ci)) {
        skipped++;
        continue;
      }

      // Verificar si el paciente existe
      const patient = await prisma.patient.findUnique({
        where: { id: ci },
        include: {
          cases: {
            orderBy: { startAt: 'desc' },
            take: 1
          }
        }
      });

      if (!patient) {
        // Paciente no existe, skip
        continue;
      }

      // Si el paciente tiene trasplante, usar ese caseId; sino, dejar null
      const caseId = patient.cases.length > 0 ? patient.cases[0].id : null;

      const evalDate = excelDateToJSDate(preop.Fecha) || new Date();

      try {
        await prisma.preopEvaluation.create({
          data: {
            patientId: ci,
            caseId: caseId,
            evaluationDate: evalDate,
            meld: preop.MELD ? parseInt(preop.MELD) : null,
            meldNa: preop.MELDe ? parseInt(preop.MELDe) : null,
            child: preop.Child || null,
            etiology1: preop.Etiologia1 || null,
            etiology2: preop.Etiologia2 || null,
            isFulminant: preop.Fulminante === 'SI' || preop.Fulminante === 'Sí',
            mpt: preop.MPT || null,
            mouthOpening: preop.AperturaBucal || null,
            physicalExamObs: preop.ExFisicoObs || null,
            coronaryDisease: preop.EnfCoronaria === 'SI' || preop.EnfCoronaria === 'Sí',
            hypertension: preop.HTA === 'SI' || preop.HTA === 'Sí',
            valvulopathy: [preop.Valvulopatia, preop.Valvulopatia2, preop.Valvulopatia3].filter(Boolean).join(', ') || null,
            arrhythmia: preop.ArritmiaMarcapaso === 'SI' || preop.ArritmiaMarcapaso === 'Sí',
            dilatedCardio: preop.CardiopDilatada === 'SI' || preop.CardiopDilatada === 'Sí',
            hypertensiveCardio: preop.CardiopHTA === 'SI' || preop.CardiopHTA === 'Sí',
            smokerCOPD: preop['Fumador/EPOC'] === 'SI' || preop['Fumador/EPOC'] === 'Sí',
            asthma: preop.ASMA === 'SI' || preop.ASMA === 'Sí',
            renalFailure: preop.IRenal === 'SI' || preop.IRenal === 'Sí',
            singleKidney: preop.Monorreno === 'SI' || preop.Monorreno === 'Sí',
            diabetes: preop.Diabetes === 'SI' || preop.Diabetes === 'Sí',
            thyroidDysfunction: preop.DisfTiroidea === 'SI' || preop.DisfTiroidea === 'Sí',
            previousAbdSurgery: preop.CirugiaAbdominal === 'SI' || preop.CirugiaAbdominal === 'Sí',
            abdSurgeryDetail: preop.CirAbdominalDetalle || null,
            refluxUlcer: preop.RGEUlcus === 'SI' || preop.RGEUlcus === 'Sí',
            allergies: preop.Alergias || null,
            pregnancy: preop.Puerperio === 'SI' || preop.Puerperio === 'Sí',
            hepatoRenalSyndrome: preop.SndHepatorenal === 'SI' || preop.SndHepatorenal === 'Sí',
            hepatoPulmonarySyndr: preop.SindHepatoPulmonar === 'SI' || preop.SindHepatoPulmonar === 'Sí',
            pulmonaryHypertension: preop.HTPulmonar === 'SI' || preop.HTPulmonar === 'Sí',
            portalHypertension: preop.HTPortal === 'SI' || preop.HTPortal === 'Sí',
            ascites: preop.Ascitis === 'SI' || preop.Ascitis === 'Sí',
            hydrothorax: preop.Hidrotorax === 'SI' || preop.Hidrotorax === 'Sí',
            sbe: preop.PBE === 'SI' || preop.PBE === 'Sí',
            portalThrombosis: preop.TrobosisP === 'SI' || preop.TrobosisP === 'Sí',
            esophagealVarices: preop.VaricesEsof === 'SI' || preop.VaricesEsof === 'Sí',
            encephalopathy: preop.Encefalopatia === 'SI' || preop.Encefalopatia === 'Sí',
            hepatocarcinoma: preop.Hepatocarcinoma === 'SI' || preop.Hepatocarcinoma === 'Sí',
            bleeding: preop.Sangrado === 'SI' || preop.Sangrado === 'Sí',
            hyponatremia: preop.Hiponatremia === 'SI' || preop.Hiponatremia === 'Sí',
            complicationsObs: preop.ObsComplicaciones || null,
            mechanicalVent: preop.ARM === 'SI' || preop.ARM === 'Sí',
            habitualMeds: preop.MedicacionHabitual || null,
            inList: preop.IngresaLista === 'SI' || preop.IngresaLista === 'Sí',
            reasonNotInList: preop.CausaNoIngreso || null,
            problems: preop.Problemas || null,
          }
        });
        created++;
        console.log(`✓ Creada evaluación para ${patient.name} (${ci})${caseId ? '' : ' [Sin trasplante]'}`);
      } catch (error) {
        console.error(`✗ Error creando evaluación para ${ci}:`, error.message);
        errors++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Evaluaciones creadas: ${created}`);
    console.log(`Ya existían: ${skipped}`);
    console.log(`Errores: ${errors}`);
    console.log('');

    // Verificar nuevo total
    const newTotal = await prisma.preopEvaluation.count();
    console.log(`Total de evaluaciones en la BD: ${newTotal}`);
    console.log(`Total en Excel: ${preopData.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importMissingPreops();
