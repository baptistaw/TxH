// scripts/import-all-patients.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Helper para convertir fecha de Excel a Date
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Helper para parsear ASA
function parseASA(asa) {
  if (!asa) return null;
  const asaStr = String(asa).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV', 'V', 'VI'].includes(asaStr)) {
    return asaStr;
  }
  return null;
}

// Helper para parsear Provider
function parseProvider(provider) {
  if (!provider) return null;
  const provStr = String(provider).trim().toUpperCase();

  if (provStr.includes('ASSE')) return 'ASSE';
  if (provStr.includes('FEMI')) return 'FEMI';
  if (provStr.includes('CASMU')) return 'CASMU';
  if (provStr.includes('MP')) return 'MP';

  return 'OTRA';
}

// Helper para parsear AirwayGrade
function parseAirwayGrade(grade) {
  if (!grade) return null;
  const gradeStr = String(grade).trim().toUpperCase();
  if (['I', 'II', 'III', 'IV'].includes(gradeStr)) {
    return gradeStr;
  }
  return null;
}

// Helper para parsear clínico
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

async function importAllPatients() {
  console.log('\n📊 IMPORTACIÓN COMPLETA DE TODOS LOS PACIENTES\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    // Leer hojas
    const pacientesData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);
    const postopData = XLSX.utils.sheet_to_json(workbook.Sheets['PostOp']);

    console.log(`\nRegistros en Excel:`);
    console.log(`  DatosPaciente: ${pacientesData.length}`);
    console.log(`  DatosTrasplante: ${trasplanteData.length}`);
    console.log(`  Preoperatorio: ${preopData.length}`);
    console.log(`  PostOp: ${postopData.length}`);

    // Procesar TODOS los pacientes del Excel
    const pacientesConCI = [];
    const cisSospechosas = [];
    const cisInvalidas = [];

    console.log('\n📋 Validando CIs...\n');

    pacientesData.forEach((p, index) => {
      const ciValidation = normalizarCI(p.CI);

      if (!ciValidation.ci) {
        cisInvalidas.push({
          index,
          nombre: p.Nombre,
          ciRaw: ciValidation.ciRaw,
          reason: ciValidation.reason
        });
        return;
      }

      if (ciValidation.suspicious) {
        cisSospechosas.push({
          ci: ciValidation.ci,
          ciFormatted: ciValidation.ciFormatted,
          nombre: p.Nombre,
          ciRaw: ciValidation.ciRaw,
          reason: ciValidation.reason
        });
      }

      pacientesConCI.push({
        ...p,
        ciValidation
      });
    });

    console.log(`✓ Pacientes con CI válida: ${pacientesConCI.length}`);
    console.log(`⚠️  CIs sospechosas (DV incorrecto): ${cisSospechosas.length}`);
    console.log(`❌ CIs inválidas: ${cisInvalidas.length}\n`);

    if (cisSospechosas.length > 0) {
      console.log('⚠️  CIs SOSPECHOSAS (primeras 10):');
      cisSospechosas.slice(0, 10).forEach(item => {
        console.log(`  ${item.nombre} - Original: ${item.ciRaw} → Corregida: ${item.ciFormatted}`);
        console.log(`    Razón: ${item.reason}\n`);
      });
    }

    if (cisInvalidas.length > 0) {
      console.log('❌ CIs INVÁLIDAS:');
      cisInvalidas.forEach(item => {
        console.log(`  [${item.index}] ${item.nombre} - CI: ${item.ciRaw}`);
        console.log(`    Razón: ${item.reason}\n`);
      });
    }

    // Buscar fechas de trasplante
    const pacientesConFecha = pacientesConCI.map(p => {
      const ci = p.ciValidation.ci;
      const trasplante = trasplanteData.find(t => {
        const tValidation = normalizarCI(t.CI);
        return tValidation.ci === ci;
      });
      const fechaTx = trasplante ? excelDateToJSDate(trasplante.FechaHoraInicio) : null;

      return { ...p, trasplante, fechaTx };
    });

    // Ordenar por fecha (más recientes primero)
    pacientesConFecha.sort((a, b) => {
      if (!a.fechaTx && !b.fechaTx) return 0;
      if (!a.fechaTx) return 1;
      if (!b.fechaTx) return -1;
      return new Date(b.fechaTx) - new Date(a.fechaTx);
    });

    const pacientesConTrasplante = pacientesConFecha.filter(p => p.fechaTx);
    const pacientesSinTrasplante = pacientesConFecha.filter(p => !p.fechaTx);

    console.log('='.repeat(80));
    console.log(`\n📈 Resumen:`);
    console.log(`  Pacientes con trasplante: ${pacientesConTrasplante.length}`);
    console.log(`  Pacientes sin trasplante: ${pacientesSinTrasplante.length}`);
    console.log(`  Total a importar: ${pacientesConCI.length}\n`);
    console.log('='.repeat(80));

    let imported = 0;
    let errors = 0;
    let suspiciousCount = 0;

    // Importar TODOS los pacientes
    for (let i = 0; i < pacientesConFecha.length; i++) {
      const pacienteRow = pacientesConFecha[i];
      const ci = pacienteRow.ciValidation.ci;
      const ciValidation = pacienteRow.ciValidation;

      try {
        if (imported % 50 === 0) {
          console.log(`\n[${imported}/${pacientesConFecha.length}] Progreso: ${((imported / pacientesConFecha.length) * 100).toFixed(1)}%`);
        }

        // 1. Crear/actualizar paciente
        const birthDate = excelDateToJSDate(pacienteRow.FNac);
        const admissionDate = excelDateToJSDate(pacienteRow.FechaIngresoProg);

        const patient = await prisma.patient.upsert({
          where: { id: ci },
          update: {
            ciRaw: ciValidation.ciRaw,
            ciSuspicious: ciValidation.suspicious,
            ciValidationNote: ciValidation.reason,
            name: pacienteRow.Nombre || 'Sin nombre',
            fnr: pacienteRow.FNR || null,
            birthDate: birthDate,
            sex: pacienteRow.Sexo === 'M' ? 'M' : pacienteRow.Sexo === 'F' ? 'F' : 'O',
            provider: parseProvider(pacienteRow.Prestador),
            height: pacienteRow.Talla ? parseFloat(pacienteRow.Talla) : null,
            weight: pacienteRow.Peso ? parseFloat(pacienteRow.Peso) : null,
            bloodGroup: pacienteRow.GrupoS || null,
            asa: parseASA(pacienteRow.ASA),
            placeOfOrigin: pacienteRow.LugarProced || null,
            admissionDate: admissionDate,
            transplanted: pacienteRow.Trasplantado === 'SI' || pacienteRow.Trasplantado === 'Sí',
            observations: pacienteRow.Observaciones || null,
          },
          create: {
            id: ci,
            ciRaw: ciValidation.ciRaw,
            ciSuspicious: ciValidation.suspicious,
            ciValidationNote: ciValidation.reason,
            name: pacienteRow.Nombre || 'Sin nombre',
            fnr: pacienteRow.FNR || null,
            birthDate: birthDate,
            sex: pacienteRow.Sexo === 'M' ? 'M' : pacienteRow.Sexo === 'F' ? 'F' : 'O',
            provider: parseProvider(pacienteRow.Prestador),
            height: pacienteRow.Talla ? parseFloat(pacienteRow.Talla) : null,
            weight: pacienteRow.Peso ? parseFloat(pacienteRow.Peso) : null,
            bloodGroup: pacienteRow.GrupoS || null,
            asa: parseASA(pacienteRow.ASA),
            placeOfOrigin: pacienteRow.LugarProced || null,
            admissionDate: admissionDate,
            transplanted: pacienteRow.Trasplantado === 'SI' || pacienteRow.Trasplantado === 'Sí',
            observations: pacienteRow.Observaciones || null,
          }
        });

        if (ciValidation.suspicious) {
          suspiciousCount++;
        }

        // 2. Solo crear caso de trasplante si tiene fecha
        if (pacienteRow.fechaTx && pacienteRow.trasplante) {
          const trasplante = pacienteRow.trasplante;
          const icuTransferDate = excelDateToJSDate(trasplante.FechaTrasladoCTI);

          const transplantCase = await prisma.transplantCase.create({
            data: {
              patientId: ci,
              startAt: pacienteRow.fechaTx,
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

          // 3. Equipo clínico
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

          // 4. Líneas y monitoreo
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

          // 5. Evaluación preoperatoria
          const preop = preopData.find(p => {
            const pValidation = normalizarCI(p.CI);
            return pValidation.ci === ci;
          });

          if (preop) {
            const evalDate = excelDateToJSDate(preop.Fecha) || pacienteRow.fechaTx || new Date();

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
          }

          // 6. Outcome postoperatorio
          const postop = postopData.find(p => {
            const pValidation = normalizarCI(p.CI);
            return pValidation.ci === ci;
          });

          if (postop) {
            const postopDate = excelDateToJSDate(postop.Fecha) || pacienteRow.fechaTx || new Date();
            const dischargeDate = excelDateToJSDate(postop.FechaAltaTx);

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
          }
        }

        imported++;

      } catch (error) {
        console.log(`\n  ❌ Error en ${pacienteRow.Nombre} (CI: ${ci}): ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Pacientes importados exitosamente: ${imported}`);
    console.log(`⚠️  Pacientes con CI sospechosa: ${suspiciousCount}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('\n✅ Importación de todos los pacientes completada\n');

    // Mostrar lista de CIs sospechosas para revisión manual
    if (cisSospechosas.length > 0) {
      console.log('\n⚠️  LISTA COMPLETA DE CIs SOSPECHOSAS PARA REVISIÓN MANUAL:');
      console.log('='.repeat(80));
      cisSospechosas.forEach((item, index) => {
        console.log(`${index + 1}. ${item.nombre}`);
        console.log(`   CI Original: ${item.ciRaw}`);
        console.log(`   CI Corregida: ${item.ciFormatted}`);
        console.log(`   Razón: ${item.reason}\n`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importAllPatients().catch(console.error);
