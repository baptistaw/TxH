// scripts/import-complete-data.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Helper para convertir fecha de Excel a Date
function excelDateToJSDate(excelDate) {
  if (!excelDate || excelDate === 'undefined' || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Helper para limpiar CI
function cleanCI(ci) {
  if (!ci || ci === 'undefined') return null;
  const ciStr = String(ci);
  if (ciStr.includes(':')) {
    return ciStr.split(':')[0].trim().replace(/[-\.]/g, '');
  }
  return ciStr.replace(/[-\.]/g, '').trim();
}

// Helper para parsear clínico del formato "CP: Nombre"
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

async function importCompleteData() {
  console.log('\n📊 IMPORTACIÓN COMPLETA DE DATOS HISTÓRICOS\n');

  try {
    const workbook = XLSX.readFile(excelPath);

    // Leer hojas
    const pacientesData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);
    const postopData = XLSX.utils.sheet_to_json(workbook.Sheets['PostOp']);

    // Ordenar pacientes por fecha de trasplante (más recientes primero)
    const pacientesConFecha = pacientesData
      .map(p => {
        const ci = cleanCI(p.CI);
        const trasplante = trasplanteData.find(t => cleanCI(t.CI) === ci);
        const fechaTx = trasplante ? excelDateToJSDate(trasplante.FechaHoraInicio) : null;

        return { ...p, ci: ci, fechaTx: fechaTx };
      })
      .filter(p => p.ci && p.ci.length >= 6)
      .sort((a, b) => {
        if (!a.fechaTx && !b.fechaTx) return 0;
        if (!a.fechaTx) return 1;
        if (!b.fechaTx) return -1;
        return new Date(b.fechaTx) - new Date(a.fechaTx);
      });

    // Tomar los últimos 25 que tengan fecha
    const pacientesConFechaValida = pacientesConFecha.filter(p => p.fechaTx);
    const pacientesAImportar = pacientesConFechaValida.slice(0, 25);

    console.log(`✓ Se importarán los ${pacientesAImportar.length} pacientes más recientes\\n`);

    if (pacientesAImportar.length > 0) {
      console.log('Rango de fechas:');
      console.log(`  Más reciente: ${new Date(pacientesAImportar[0].fechaTx).toLocaleDateString('es-UY')}`);
      console.log(`  Más antiguo: ${new Date(pacientesAImportar[pacientesAImportar.length - 1].fechaTx).toLocaleDateString('es-UY')}`);
    }
    console.log('='.repeat(80));

    let imported = 0;
    let errors = 0;

    for (let i = 0; i < pacientesAImportar.length; i++) {
      const pacienteRow = pacientesAImportar[i];
      const ci = pacienteRow.ci;

      try {
        console.log(`\\n[${i + 1}/${pacientesAImportar.length}] Importando paciente: ${pacienteRow.Nombre} (CI: ${ci})`);
        console.log(`  Fecha Tx: ${new Date(pacienteRow.fechaTx).toLocaleDateString('es-UY')}`);

        // 1. Crear paciente con TODOS los campos
        const birthDate = excelDateToJSDate(pacienteRow.FNac);
        const admissionDate = excelDateToJSDate(pacienteRow.FechaIngresoProg);

        const patient = await prisma.patient.upsert({
          where: { id: ci },
          update: {
            ciRaw: ci,
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
            ciRaw: ci,
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

        console.log(`  ✓ Paciente creado/actualizado`);

        // 2. Buscar datos del trasplante para este paciente
        const trasplante = trasplanteData.find(t => cleanCI(t.CI) === ci);

        // 3. Crear caso de trasplante (temporal sin fechas)
        const icuTransferDate = trasplante ? excelDateToJSDate(trasplante.FechaTrasladoCTI) : null;

        const transplantCase = await prisma.transplantCase.create({
          data: {
            patientId: ci,
            startAt: pacienteRow.fechaTx, // Temporal, se actualizará después
            endAt: null, // Se actualizará después con registro de CIERRE
            duration: null, // Se calculará después
            provenance: trasplante?.Procedencia || null,
            isRetransplant: trasplante?.Retrasplante === 'SI' || trasplante?.Retrasplante === 'Sí',
            isHepatoRenal: trasplante?.HepatoRenal === 'SI' || trasplante?.HepatoRenal === 'Sí',
            optimalDonor: trasplante?.DonanteOptimo === 'SI' || trasplante?.DonanteOptimo === 'Sí',
            coldIschemiaTime: trasplante?.TIsqFria ? parseInt(trasplante.TIsqFria) : null,
            warmIschemiaTime: trasplante?.TisqCaliente ? parseInt(trasplante.TisqCaliente) : null,
            icuTransferDate: icuTransferDate,
            observations: trasplante?.Observaciones || null,
          }
        });

        console.log(`  ✓ Caso de trasplante creado (ID: ${transplantCase.id})`);

        // 4. Crear equipo clínico (TeamAssignment)
        if (trasplante) {
          const teamMembers = [
            { field: 'Anestesista 1', role: 'ANEST1' },
            { field: 'Anestesista 2', role: 'ANEST2' },
            { field: 'Cirujano 1', role: 'CIRUJANO1' },
            { field: 'Cirujano 2', role: 'CIRUJANO2' },
            { field: 'Intensivista', role: 'INTENSIVISTA' },
            { field: 'Hepatólogo', role: 'HEPATOLOGO' },
            { field: 'NurseCoordinadora', role: 'NURSE_COORD' }
          ];

          let teamCount = 0;
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
                teamCount++;
              } catch (err) {
                // Ignorar errores de clínicos no encontrados o duplicados
              }
            }
          }
          if (teamCount > 0) {
            console.log(`  ✓ Equipo clínico asignado (${teamCount} miembros)`);
          }
        }

        // 5. Crear líneas y monitoreo (LinesAndMonitoring)
        if (trasplante) {
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
            console.log(`  ✓ Líneas y monitoreo registrados`);
          } catch (err) {
            // Puede fallar si ya existe
          }
        }

        // 6. Crear evaluación preoperatoria
        const preop = preopData.find(p => cleanCI(p.CI) === ci);

        if (preop) {
          const evalDate = excelDateToJSDate(preop.Fecha) || surgeryDate || new Date();

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

              // Examen físico
              mpt: preop.MPT || null,
              mouthOpening: preop.AperturaBucal || null,
              physicalExamObs: preop.ExFisicoObs || null,

              // Comorbilidades cardiovasculares
              coronaryDisease: preop.EnfCoronaria === 'SI' || preop.EnfCoronaria === 'Sí',
              hypertension: preop.HTA === 'SI' || preop.HTA === 'Sí',
              valvulopathy: [preop.Valvulopatia, preop.Valvulopatia2, preop.Valvulopatia3].filter(Boolean).join(', ') || null,
              arrhythmia: preop.ArritmiaMarcapaso === 'SI' || preop.ArritmiaMarcapaso === 'Sí',
              dilatedCardio: preop.CardiopDilatada === 'SI' || preop.CardiopDilatada === 'Sí',
              hypertensiveCardio: preop.CardiopHTA === 'SI' || preop.CardiopHTA === 'Sí',

              // Comorbilidades respiratorias
              smokerCOPD: preop['Fumador/EPOC'] === 'SI' || preop['Fumador/EPOC'] === 'Sí',
              asthma: preop.ASMA === 'SI' || preop.ASMA === 'Sí',

              // Otras comorbilidades
              renalFailure: preop.IRenal === 'SI' || preop.IRenal === 'Sí',
              singleKidney: preop.Monorreno === 'SI' || preop.Monorreno === 'Sí',
              diabetes: preop.Diabetes === 'SI' || preop.Diabetes === 'Sí',
              thyroidDysfunction: preop.DisfTiroidea === 'SI' || preop.DisfTiroidea === 'Sí',
              previousAbdSurgery: preop.CirugiaAbdominal === 'SI' || preop.CirugiaAbdominal === 'Sí',
              abdSurgeryDetail: preop.CirAbdominalDetalle || null,
              refluxUlcer: preop.RGEUlcus === 'SI' || preop.RGEUlcus === 'Sí',
              allergies: preop.Alergias || null,
              pregnancy: preop.Puerperio === 'SI' || preop.Puerperio === 'Sí',

              // Complicaciones de la cirrosis
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

              // Estado funcional
              mechanicalVent: preop.ARM === 'SI' || preop.ARM === 'Sí',
              habitualMeds: preop.MedicacionHabitual || null,

              // Decisión de lista
              inList: preop.IngresaLista === 'SI' || preop.IngresaLista === 'Sí',
              reasonNotInList: preop.CausaNoIngreso || null,
              problems: preop.Problemas || null,
            }
          });
          console.log(`  ✓ Evaluación preoperatoria creada`);
        }

        // 7. Crear outcome postoperatorio
        const postop = postopData.find(p => cleanCI(p.CI) === ci);

        if (postop) {
          const postopDate = excelDateToJSDate(postop.Fecha) || surgeryDate || new Date();
          const dischargeDate = excelDateToJSDate(postop.FechaAltaTx);

          await prisma.postOpOutcome.create({
            data: {
              caseId: transplantCase.id,
              evaluationDate: postopDate,

              // Extubación
              extubatedInOR: postop['Extubado BQ'] === 'SI' || postop['Extubado BQ'] === 'Sí',
              mechVentHours: postop.ARMhs ? parseInt(postop.ARMhs) : null,
              mechVentDays: postop.ARMdias ? parseInt(postop.ARMdias) : null,
              reintubation24h: postop.FallaExtubacion24hs === 'SI' || postop.FallaExtubacion24hs === 'Sí',

              // Reoperación
              reoperation: postop.Reintervencion === 'SI' || postop.Reintervencion === 'Sí',
              reoperationCause: postop.Causa || null,

              // Complicaciones mayores
              primaryGraftFailure: postop.FallaInjerto === 'SI' || postop.FallaInjerto === 'Sí',
              acuteRenalFailure: postop.IRA === 'SI' || postop.IRA === 'Sí',
              pulmonaryEdema: postop.EPA === 'SI' || postop.EPA === 'Sí',
              neurotoxicity: postop.Neurotoxicidad === 'SI' || postop.Neurotoxicidad === 'Sí',
              rejection: postop.Rechazo === 'SI' || postop.Rechazo === 'Sí',

              // Scores
              apacheInitial: postop.APACHEIni ? parseInt(postop.APACHEIni) : null,

              // Complicaciones específicas
              biliaryComplications: postop.ComplicBiliares === 'SI' || postop.ComplicBiliares === 'Sí',
              vascularComplications: postop.ComplicVasculares === 'SI' || postop.ComplicVasculares === 'Sí',
              surgicalBleeding: postop.SangradoQ === 'SI' || postop.SangradoQ === 'Sí',
              otherComplications: postop.OtrasCompl || null,

              // Estancia
              icuDays: postop.DiasCTI ? parseInt(postop.DiasCTI) : null,
              wardDays: postop.DiasIntSala ? parseInt(postop.DiasIntSala) : null,
              dischargeDate: dischargeDate,
            }
          });
          console.log(`  ✓ Datos postoperatorios creados`);
        }

        imported++;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log('\\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Pacientes importados exitosamente: ${imported}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('\\n✅ Importación de datos completa\\n');

  } catch (error) {
    console.error('\\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importCompleteData().catch(console.error);
