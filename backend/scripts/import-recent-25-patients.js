// scripts/import-recent-25-patients.js
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
  // Manejar el caso donde CI viene con timestamp (ej: "999999: 10/18/2019 08:38:00")
  const ciStr = String(ci);
  if (ciStr.includes(':')) {
    return ciStr.split(':')[0].trim().replace(/[-\.]/g, '');
  }
  return ciStr.replace(/[-\.]/g, '').trim();
}

async function importRecentPatients() {
  console.log('\n📊 IMPORTANDO 25 PACIENTES MÁS RECIENTES\n');

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

        return {
          ...p,
          ci: ci,
          fechaTx: fechaTx
        };
      })
      .filter(p => p.ci && p.ci.length >= 6) // Solo pacientes con CI válido
      .sort((a, b) => {
        // Ordenar por fecha descendente (más recientes primero)
        // Los que no tienen fecha van al final
        if (!a.fechaTx && !b.fechaTx) return 0;
        if (!a.fechaTx) return 1;
        if (!b.fechaTx) return -1;
        return new Date(b.fechaTx) - new Date(a.fechaTx);
      });

    // Tomar los últimos 25 que tengan fecha
    const pacientesConFechaValida = pacientesConFecha.filter(p => p.fechaTx);
    const pacientesAImportar = pacientesConFechaValida.slice(0, 25);

    console.log(`✓ Se importarán los ${pacientesAImportar.length} pacientes más recientes\n`);

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
        console.log(`\n[${i + 1}/${pacientesAImportar.length}] Importando paciente: ${pacienteRow.Nombre} (CI: ${ci})`);
        console.log(`  Fecha Tx: ${new Date(pacienteRow.fechaTx).toLocaleDateString('es-UY')}`);

        // 1. Crear paciente
        const birthDate = excelDateToJSDate(pacienteRow.FNac);

        const patient = await prisma.patient.upsert({
          where: { id: ci },
          update: {
            ciRaw: ci,
            name: pacienteRow.Nombre || 'Sin nombre',
            birthDate: birthDate,
            sex: pacienteRow.Sexo === 'M' ? 'M' : pacienteRow.Sexo === 'F' ? 'F' : 'O',
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
            height: pacienteRow.Talla ? parseFloat(pacienteRow.Talla) : null,
            weight: pacienteRow.Peso ? parseFloat(pacienteRow.Peso) : null,
            bloodGroup: pacienteRow.GrupoSang || null,
          }
        });

        console.log(`  ✓ Paciente creado/actualizado`);

        // 2. Buscar datos del trasplante para este paciente
        const trasplante = trasplanteData.find(t => cleanCI(t.CI) === ci);

        // 3. Crear caso de trasplante
        const surgeryDate = pacienteRow.fechaTx;
        const endDate = trasplante ? excelDateToJSDate(trasplante.FechaHoraFin) : null;

        // Calcular duración si no está en el Excel
        let duration = trasplante?.Duracion ? parseInt(trasplante.Duracion) : null;
        if (!duration && surgeryDate && endDate) {
          duration = Math.round((new Date(endDate) - new Date(surgeryDate)) / (1000 * 60)); // minutos
        }

        const transplantCase = await prisma.transplantCase.create({
          data: {
            patientId: ci,
            startAt: surgeryDate,
            endAt: endDate,
            duration: duration,
            provenance: trasplante?.Procedencia || null,
            isRetransplant: trasplante?.Retrasplante === 'SI' || trasplante?.Retrasplante === 'Sí',
            isHepatoRenal: trasplante?.HepatoRenal === 'SI' || trasplante?.HepatoRenal === 'Sí',
            optimalDonor: trasplante?.DonanteOptimo === 'SI' || trasplante?.DonanteOptimo === 'Sí',
            coldIschemiaTime: trasplante?.TIsqFria ? parseInt(trasplante.TIsqFria) : null,
            warmIschemiaTime: trasplante?.TisqCaliente ? parseInt(trasplante.TisqCaliente) : null,
          }
        });

        console.log(`  ✓ Caso de trasplante creado (ID: ${transplantCase.id})`);

        // TODO: Equipo clínico (requiere relación con tabla clinician)

        // 4. Crear evaluación preoperatoria
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
    console.log('\n✅ Importación de pacientes completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importRecentPatients().catch(console.error);
