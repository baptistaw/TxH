// scripts/import-25-patients.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Mapeo de fases
const phaseMapping = {
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
  if (!excelDate || excelDate === 'undefined') return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Helper para limpiar CI
function cleanCI(ci) {
  if (!ci || ci === 'undefined') return null;
  return String(ci).replace(/[-\.]/g, '').trim();
}

async function importPatients() {
  console.log('\n📊 IMPORTANDO 25 PACIENTES HISTÓRICOS\n');

  try {
    const workbook = XLSX.readFile(excelPath);

    // Leer hojas
    const pacientesData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);
    const postopData = XLSX.utils.sheet_to_json(workbook.Sheets['PostOp']);

    // Obtener primeros 25 pacientes únicos
    const uniquePatients = [];
    const seenCIs = new Set();

    for (const paciente of pacientesData) {
      const ci = cleanCI(paciente.CI);
      if (ci && !seenCIs.has(ci) && ci.length >= 6) {
        seenCIs.add(ci);
        uniquePatients.push(paciente);
        if (uniquePatients.length >= 25) break;
      }
    }

    console.log(`✓ Se importarán ${uniquePatients.length} pacientes\n`);
    console.log('='.repeat(80));

    let imported = 0;
    let errors = 0;

    for (let i = 0; i < uniquePatients.length; i++) {
      const pacienteRow = uniquePatients[i];
      const ci = cleanCI(pacienteRow.CI);

      try {
        console.log(`\n[${i + 1}/${uniquePatients.length}] Importando paciente: ${pacienteRow.Nombre} (CI: ${ci})`);

        // 1. Crear/actualizar paciente
        const birthDate = excelDateToJSDate(pacienteRow.FNac);

        const patient = await prisma.patient.upsert({
          where: { id: ci },
          update: {
            ciRaw: ci,
            name: pacienteRow.Nombre || 'Sin nombre',
            birthDate: birthDate,
            sex: pacienteRow.Sexo === 'M' ? 'M' : pacienteRow.Sexo === 'F' ? 'F' : 'O',
            provider: pacienteRow.Prestador || null,
            height: pacienteRow.Talla ? parseFloat(pacienteRow.Talla) : null,
            weight: pacienteRow.Peso ? parseFloat(pacienteRow.Peso) : null,
            bloodGroup: pacienteRow.GrupoSang || null,
          },
          create: {
            id: ci,
            ciRaw: ci,
            name: pacienteRow.Nombre || 'Sin nombre',
            birthDate: birthDate,
            sex: pacienteRow.Sexo === 'M' ? 'M' : pacienteRow.Sexo === 'F' ? 'F' : 'O',
            provider: pacienteRow.Prestador || null,
            height: pacienteRow.Talla ? parseFloat(pacienteRow.Talla) : null,
            weight: pacienteRow.Peso ? parseFloat(pacienteRow.Peso) : null,
            bloodGroup: pacienteRow.GrupoSang || null,
          }
        });

        console.log(`  ✓ Paciente creado/actualizado`);

        // 2. Buscar datos del trasplante para este paciente
        const trasplante = trasplanteData.find(t => cleanCI(t.CI) === ci);

        // 3. Crear caso de trasplante
        const surgeryDate = trasplante && excelDateToJSDate(trasplante.FechaInicio);

        const transplantCase = await prisma.transplantCase.create({
          data: {
            patientId: ci,
            startAt: surgeryDate || null,
            isRetransplant: trasplante?.Retrasplante === 'SI' || trasplante?.Retrasplante === 'Sí',
            isHepatoRenal: trasplante?.HepatoRenal === 'SI' || trasplante?.HepatoRenal === 'Sí',
            optimalDonor: trasplante?.DonanteOptimo === 'SI' || trasplante?.DonanteOptimo === 'Sí',
            coldIschemiaTime: trasplante?.TiempoIsquemiaFria ? parseInt(trasplante.TiempoIsquemiaFria) : null,
            warmIschemiaTime: trasplante?.TiempoIsquemiaCaliente ? parseInt(trasplante.TiempoIsquemiaCaliente) : null,
          }
        });

        console.log(`  ✓ Caso de trasplante creado (ID: ${transplantCase.id})`);

        // 4. Crear evaluación preoperatoria
        const preop = preopData.find(p => cleanCI(p.CI) === ci);

        if (preop) {
          const evalDate = excelDateToJSDate(preop.Fecha) || surgeryDate || new Date();

          await prisma.preopEvaluation.create({
            data: {
              patientId: ci,  // FK a patients.id
              caseId: transplantCase.id,
              evaluationDate: evalDate,
              meld: preop.MELD ? parseInt(preop.MELD) : null,
              meldNa: preop.MELDe ? parseInt(preop.MELDe) : null,
              child: preop.Child || null,
              etiology1: preop.Etiologia1 || null,
              etiology2: preop.Etiologia2 || null,
              isFulminant: preop.Fulminante === 'SI' || preop.Fulminante === 'Sí',
            }
          });
          console.log(`  ✓ Evaluación preoperatoria creada`);
        }

        // 5. Crear outcome postoperatorio
        const postop = postopData.find(p => cleanCI(p.CI) === ci);

        if (postop) {
          const postopDate = excelDateToJSDate(postop.Fecha) || surgeryDate || new Date();

          await prisma.postOpOutcome.create({
            data: {
              caseId: transplantCase.id,
              evaluationDate: postopDate,
              wardDays: postop.DiasHosp ? parseInt(postop.DiasHosp) : null,
              acuteRenalFailure: postop.IRA === 'SI' || postop.IRA === 'Sí',
            }
          });
          console.log(`  ✓ Datos postoperatorios creados`);
        }

        // 6. Importar registros intraoperatorios de todas las fases
        let totalIntraopRecords = 0;

        for (const [sheetName, phase] of Object.entries(phaseMapping)) {
          const intraopSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          const patientIntraopRecords = intraopSheet.filter(r => cleanCI(r.CI) === ci);

          for (const record of patientIntraopRecords) {
            try {
              const timestamp = excelDateToJSDate(record.Fecha) || new Date();

              await prisma.intraopRecord.create({
                data: {
                  caseId: transplantCase.id,
                  phase: phase,
                  timestamp: timestamp,

                  // Hemodinamia
                  heartRate: record.FC ? parseInt(record.FC) : null,
                  pas: record.PAS ? parseInt(record.PAS) : null,
                  pad: record.PAD ? parseInt(record.PAD) : null,
                  pam: record.PAm ? parseInt(record.PAm) : null,
                  cvp: record.PVC ? parseInt(record.PVC) : null,
                  satO2: record.SatO2 ? parseInt(record.SatO2) : null,
                  temp: record.Temp ? parseFloat(record.Temp) : null,

                  // Ventilación
                  fio2: record.FIO2 ? parseFloat(record.FIO2) : null,
                  tidalVolume: record.VC ? parseInt(record.VC) : null,
                  peep: record.PEEP ? parseInt(record.PEEP) : null,
                  respiratoryRate: record.Fr ? parseInt(record.Fr) : null,
                }
              });

              totalIntraopRecords++;
            } catch (err) {
              // Silently skip individual record errors
            }
          }
        }

        if (totalIntraopRecords > 0) {
          console.log(`  ✓ ${totalIntraopRecords} registros intraoperatorios importados`);
        }

        imported++;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Pacientes importados exitosamente: ${imported}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('\n✅ Importación completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importPatients().catch(console.error);
