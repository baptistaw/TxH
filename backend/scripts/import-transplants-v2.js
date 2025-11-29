// scripts/import-transplants-v2.js
// Este script crea casos SEPARADOS para cada trasplante (soporta retrasplantes)
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Helper functions
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

function parseASA(asa) {
  if (!asa) return null;
  const asaStr = String(asa).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV', 'V', 'VI'].includes(asaStr)) {
    return asaStr;
  }
  return null;
}

function parseProvider(provider) {
  if (!provider) return null;
  const provStr = String(provider).trim().toUpperCase();

  if (provStr.includes('ASSE')) return 'ASSE';
  if (provStr.includes('FEMI')) return 'FEMI';
  if (provStr.includes('CASMU')) return 'CASMU';
  if (provStr.includes('MP')) return 'MP';

  return 'OTRA';
}

function parseAirwayGrade(grade) {
  if (!grade) return null;
  const gradeStr = String(grade).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV'].includes(gradeStr)) {
    return gradeStr;
  }
  return null;
}

function parseClinician(clinicianStr) {
  if (!clinicianStr || clinicianStr === 'undefined') return null;
  const str = String(clinicianStr).trim();

  if (str.includes(':')) {
    const parts = str.split(':');
    const cp = parseInt(parts[0].trim());
    const name = parts.slice(1).join(':').trim();
    if (isNaN(cp) || !name) return null;
    return { cp, name };
  }

  return null;
}

async function importTransplants() {
  console.log('\n📊 IMPORTACIÓN DE TRASPLANTES (V2 - CASOS SEPARADOS)\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    // Leer hojas
    const pacientesData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);
    const postopData = XLSX.utils.sheet_to_json(workbook.Sheets['PostOp']);

    console.log(`\nRegistros en Excel:`);
    console.log(`  DatosPaciente: ${pacientesData.length}`);
    console.log(`  DatosTrasplante: ${trasplanteData.length}`);
    console.log(`  Preoperatorio: ${preopData.length}`);
    console.log(`  PostOp: ${postopData.length}\n`);

    // Primero, importar TODOS los pacientes únicos
    console.log('📋 PASO 1: Importando pacientes...\n');

    const pacientesMap = new Map(); // CI -> datos del paciente
    let pacientesImported = 0;
    let pacientesSkipped = 0;

    for (const p of pacientesData) {
      const ciValidation = normalizarCI(p.CI);

      if (!ciValidation.ci) {
        pacientesSkipped++;
        continue;
      }

      // Guardar datos del paciente para usar luego
      pacientesMap.set(ciValidation.ci, {
        ...p,
        ciValidation
      });

      // Importar paciente (si no existe)
      const birthDate = excelDateToJSDate(p.FNac);
      const admissionDate = excelDateToJSDate(p.FechaIngresoProg);

      try {
        await prisma.patient.upsert({
          where: { id: ciValidation.ci },
          update: {
            ciRaw: ciValidation.ciRaw,
            ciSuspicious: ciValidation.suspicious,
            ciValidationNote: ciValidation.reason,
            name: p.Nombre || 'Sin nombre',
            fnr: p.FNR || null,
            birthDate: birthDate,
            sex: p.Sexo === 'M' ? 'M' : p.Sexo === 'F' ? 'F' : 'O',
            provider: parseProvider(p.Prestador),
            height: p.Talla ? parseFloat(p.Talla) : null,
            weight: p.Peso ? parseFloat(p.Peso) : null,
            bloodGroup: p.GrupoS || null,
            asa: parseASA(p.ASA),
            placeOfOrigin: p.LugarProced || null,
            admissionDate: admissionDate,
            transplanted: p.Trasplantado === 'SI' || p.Trasplantado === 'Sí',
            observations: p.Observaciones || null,
          },
          create: {
            id: ciValidation.ci,
            ciRaw: ciValidation.ciRaw,
            ciSuspicious: ciValidation.suspicious,
            ciValidationNote: ciValidation.reason,
            name: p.Nombre || 'Sin nombre',
            fnr: p.FNR || null,
            birthDate: birthDate,
            sex: p.Sexo === 'M' ? 'M' : p.Sexo === 'F' ? 'F' : 'O',
            provider: parseProvider(p.Prestador),
            height: p.Talla ? parseFloat(p.Talla) : null,
            weight: p.Peso ? parseFloat(p.Peso) : null,
            bloodGroup: p.GrupoS || null,
            asa: parseASA(p.ASA),
            placeOfOrigin: p.LugarProced || null,
            admissionDate: admissionDate,
            transplanted: p.Trasplantado === 'SI' || p.Trasplantado === 'Sí',
            observations: p.Observaciones || null,
          }
        });

        pacientesImported++;
      } catch (error) {
        console.log(`  ❌ Error importando paciente ${p.Nombre}: ${error.message}`);
        pacientesSkipped++;
      }
    }

    console.log(`✅ Pacientes importados: ${pacientesImported}`);
    console.log(`⏭️  Pacientes saltados: ${pacientesSkipped}\n`);
    console.log('='.repeat(80));

    // PASO 2: Importar TODOS los trasplantes (un caso por cada registro en DatosTrasplante)
    console.log('\n📋 PASO 2: Importando trasplantes (casos separados)...\n');

    let casosImported = 0;
    let casosSkipped = 0;
    let casosConFecha = 0;
    let casosSinFecha = 0;

    for (let i = 0; i < trasplanteData.length; i++) {
      const trasplante = trasplanteData[i];

      // Validar CI
      const ciValidation = normalizarCI(trasplante.CI);
      if (!ciValidation.ci) {
        casosSkipped++;
        continue;
      }

      const ci = ciValidation.ci;

      // Verificar que el paciente existe
      const patientExists = await prisma.patient.findUnique({
        where: { id: ci }
      });

      if (!patientExists) {
        console.log(`  ⚠️  Paciente no encontrado para CI: ${ci}`);
        casosSkipped++;
        continue;
      }

      try {
        const startAt = excelDateToJSDate(trasplante.FechaHoraInicio);
        const icuTransferDate = excelDateToJSDate(trasplante.FechaTrasladoCTI);

        if (startAt) {
          casosConFecha++;
        } else {
          casosSinFecha++;
        }

        // Crear caso de trasplante
        const transplantCase = await prisma.transplantCase.create({
          data: {
            patientId: ci,
            startAt: startAt,
            endAt: null,
            duration: null,
            provenance: trasplante.Procedencia || null,
            isRetransplant: trasplante.Retrasplante === 'SI' || trasplante.Retrasplante === 'Sí',
            isHepatoRenal: trasplante.HepatoRenal === 'SI' || trasplante.HepatoRenal === 'Sí',
            optimalDonor: trasplante.DonanteOptimo === 'SI' || trasplante.DonanteOptimo === 'Sí',
            coldIschemiaTime: trasplante.TIsqFria ? parseInt(trasplante.TIsqFria) : null,
            warmIschemiaTime: trasplante.TisqCaliente ? parseInt(trasplante.TisqCaliente) : null,
            icuTransferDate: icuTransferDate,
            observations: trasplante.Observaciones || null,
          }
        });

        // Equipo clínico
        const teamMembers = [
          { field: 'Anestesista 1', role: 'ANEST1' },
          { field: 'Anestesista 2', role: 'ANEST2' },
          { field: 'Cirujano 1', role: 'CIRUJANO1' },
          { field: 'Cirujano 2', role: 'CIRUJANO2' },
          { field: 'Intensivista', role: 'INTENSIVISTA' },
          { field: 'Hepatólogo', role: 'HEPATOLOGO' },
          { field: 'NurseCoordinadora', role: 'NURSE_COORD' }
        ];

        for (const { field, role } of teamMembers) {
          const clinician = parseClinician(trasplante[field]);
          if (clinician) {
            try {
              await prisma.teamAssignment.create({
                data: {
                  caseId: transplantCase.id,
                  clinicianId: clinician.cp,
                  role: role
                }
              });
            } catch (err) {
              // Ignorar errores de clínicos no encontrados
            }
          }
        }

        // Líneas y monitoreo
        try {
          await prisma.linesAndMonitoring.create({
            data: {
              caseId: transplantCase.id,
              cvc1: trasplante.VVC1 || null,
              cvc2: trasplante.VVC2 || null,
              cvc3: trasplante.VVC3 || null,
              arterialLine1: trasplante.VA1 || null,
              arterialLine2: trasplante.VA2 || null,
              swanGanz: trasplante.SwanGanz === 'SI' || trasplante.SwanGanz === 'Sí',
              peripheralIV: trasplante.Vvp || null,
              airwayType: trasplante.VA || null,
              tubeSellick: trasplante.Sellick === 'SI' || trasplante.Sellick === 'Sí',
              laryngoscopy: parseAirwayGrade(trasplante.Laringoscopia),
              anesthesiaType: trasplante.Anestesia || null,
              premedication: trasplante.Premedicacion || null,
              warmer: trasplante.Level1 === 'SI' || trasplante.Level1 === 'Sí',
              cellSaverUsed: trasplante.CellSaver === 'SI' || trasplante.CellSaver === 'Sí',
              elasticBandages: trasplante.Vendas === 'SI' || trasplante.Vendas === 'Sí',
              pressurePoints: trasplante.PuntosApoyo || null,
              thermalBlanket: trasplante.Cobertor === 'SI' || trasplante.Cobertor === 'Sí',
              prophylacticATB: trasplante.ATB || null,
            }
          });
        } catch (err) {
          // Puede fallar si ya existe
        }

        // Evaluación preoperatoria (buscar la más reciente para este paciente)
        const preop = preopData.find(p => {
          const pValidation = normalizarCI(p.CI);
          return pValidation.ci === ci;
        });

        if (preop) {
          const evalDate = excelDateToJSDate(preop.Fecha) || startAt || new Date();

          try {
            await prisma.preopEvaluation.create({
              data: {
                patientId: ci,
                caseId: transplantCase.id,
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
          } catch (err) {
            // Puede fallar si ya existe
          }
        }

        // Outcome postoperatorio
        const postop = postopData.find(p => {
          const pValidation = normalizarCI(p.CI);
          return pValidation.ci === ci;
        });

        if (postop) {
          const postopDate = excelDateToJSDate(postop.Fecha) || startAt || new Date();
          const dischargeDate = excelDateToJSDate(postop.FechaAltaTx);

          try {
            await prisma.postOpOutcome.create({
              data: {
                caseId: transplantCase.id,
                evaluationDate: postopDate,
                extubatedInOR: postop['Extubado BQ'] === 'SI' || postop['Extubado BQ'] === 'Sí',
                mechVentHours: postop.ARMhs ? parseInt(postop.ARMhs) : null,
                mechVentDays: postop.ARMdias ? parseInt(postop.ARMdias) : null,
                reintubation24h: postop.FallaExtubacion24hs === 'SI' || postop.FallaExtubacion24hs === 'Sí',
                reoperation: postop.Reintervencion === 'SI' || postop.Reintervencion === 'Sí',
                reoperationCause: postop.Causa || null,
                primaryGraftFailure: postop.FallaInjerto === 'SI' || postop.FallaInjerto === 'Sí',
                acuteRenalFailure: postop.IRA === 'SI' || postop.IRA === 'Sí',
                pulmonaryEdema: postop.EPA === 'SI' || postop.EPA === 'Sí',
                neurotoxicity: postop.Neurotoxicidad === 'SI' || postop.Neurotoxicidad === 'Sí',
                rejection: postop.Rechazo === 'SI' || postop.Rechazo === 'Sí',
                apacheInitial: postop.APACHEIni ? parseInt(postop.APACHEIni) : null,
                biliaryComplications: postop.ComplicBiliares === 'SI' || postop.ComplicBiliares === 'Sí',
                vascularComplications: postop.ComplicVasculares === 'SI' || postop.ComplicVasculares === 'Sí',
                surgicalBleeding: postop.SangradoQ === 'SI' || postop.SangradoQ === 'Sí',
                otherComplications: postop.OtrasCompl || null,
                icuDays: postop.DiasCTI ? parseInt(postop.DiasCTI) : null,
                wardDays: postop.DiasIntSala ? parseInt(postop.DiasIntSala) : null,
                dischargeDate: dischargeDate,
              }
            });
          } catch (err) {
            // Puede fallar si ya existe
          }
        }

        casosImported++;

        if (casosImported % 50 === 0) {
          console.log(`  [${casosImported}/${trasplanteData.length}] Progreso: ${((casosImported / trasplanteData.length) * 100).toFixed(1)}%`);
        }

      } catch (error) {
        console.log(`  ❌ Error en trasplante ${i + 1} (CI: ${ci}): ${error.message}`);
        casosSkipped++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Casos de trasplante importados: ${casosImported}`);
    console.log(`  • Con fecha de inicio: ${casosConFecha}`);
    console.log(`  • Sin fecha de inicio: ${casosSinFecha}`);
    console.log(`⏭️  Casos saltados: ${casosSkipped}`);
    console.log('\n✅ Importación completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importTransplants().catch(console.error);
