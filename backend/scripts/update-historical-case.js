// scripts/update-historical-case.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateHistoricalCase() {
  const caseId = 'cmhyzhydc0003arfam04fx2br';
  const patientCI = '23456789';

  console.log('\n📝 ACTUALIZANDO CASO CON DATOS HISTÓRICOS REALES\n');

  try {
    // 1. Verificar que el paciente existe
    const patient = await prisma.patient.findUnique({
      where: { ciRaw: patientCI }
    });

    if (!patient) {
      console.log('❌ Paciente no encontrado. CI:', patientCI);
      return;
    }

    console.log('✓ Paciente encontrado:', patient.name);
    console.log('  CI:', patient.ciRaw);
    console.log('  Fecha nacimiento:', patient.birthDate);

    // 2. Actualizar datos del caso (TransplantCase)
    console.log('\n📊 Actualizando datos del caso...\n');

    const updatedCase = await prisma.transplantCase.update({
      where: { id: caseId },
      data: {
        surgeryDate: new Date('2024-06-20'),
        isRetransplant: true,
        hepatoRenalSyndrome: true,
        optimalDonor: false,
        coldIschemiaTime: 420, // minutos
        warmIschemiaTime: 60,  // minutos

        // Datos preop (si no existen, se pueden agregar después)
        // Estos van en PreopEvaluation, no en TransplantCase
      }
    });

    console.log('✓ Caso actualizado:');
    console.log('  ID:', updatedCase.id);
    console.log('  Fecha cirugía:', updatedCase.surgeryDate);
    console.log('  Retrasplante:', updatedCase.isRetransplant);
    console.log('  Hepato-Renal:', updatedCase.hepatoRenalSyndrome);
    console.log('  Isquemia fría:', updatedCase.coldIschemiaTime, 'min');
    console.log('  Isquemia caliente:', updatedCase.warmIschemiaTime, 'min');

    // 3. Crear o actualizar evaluación preoperatoria
    console.log('\n📋 Actualizando evaluación preoperatoria...\n');

    // Buscar si existe evaluación preop
    const existingPreop = await prisma.preopEvaluation.findFirst({
      where: {
        patientId: patientCI,
        caseId: caseId
      }
    });

    let preopData;
    if (existingPreop) {
      preopData = await prisma.preopEvaluation.update({
        where: { id: existingPreop.id },
        data: {
          meld: 32,
          meldNa: 35,
          childPugh: 'C',
          diagnosis: 'Cirrosis biliar primaria',
        }
      });
      console.log('✓ Evaluación preoperatoria actualizada');
    } else {
      preopData = await prisma.preopEvaluation.create({
        data: {
          patientId: patientCI,
          caseId: caseId,
          meld: 32,
          meldNa: 35,
          childPugh: 'C',
          diagnosis: 'Cirrosis biliar primaria',
        }
      });
      console.log('✓ Evaluación preoperatoria creada');
    }

    console.log('  MELD:', preopData.meld);
    console.log('  MELD-Na:', preopData.meldNa);
    console.log('  Child-Pugh:', preopData.childPugh);
    console.log('  Diagnóstico:', preopData.diagnosis);

    // 4. Crear o actualizar outcome postoperatorio
    console.log('\n🏥 Actualizando datos postoperatorios...\n');

    const existingOutcome = await prisma.postOpOutcome.findFirst({
      where: { caseId: caseId }
    });

    let outcomeData;
    if (existingOutcome) {
      outcomeData = await prisma.postOpOutcome.update({
        where: { id: existingOutcome.id },
        data: {
          icuDays: 7,
          hospitalDays: 14,
          renalFailure: true,
        }
      });
      console.log('✓ Datos postoperatorios actualizados');
    } else {
      outcomeData = await prisma.postOpOutcome.create({
        data: {
          caseId: caseId,
          icuDays: 7,
          hospitalDays: 14,
          renalFailure: true,
        }
      });
      console.log('✓ Datos postoperatorios creados');
    }

    console.log('  Días UCI:', outcomeData.icuDays);
    console.log('  Días hospitalización:', outcomeData.hospitalDays);
    console.log('  Insuficiencia renal:', outcomeData.renalFailure ? 'Sí' : 'No');

    // 5. Eliminar asignaciones de equipo ficticio
    console.log('\n🗑️  Eliminando equipo clínico ficticio...\n');

    const deletedTeam = await prisma.teamAssignment.deleteMany({
      where: { caseId: caseId }
    });

    console.log(`✓ Eliminadas ${deletedTeam.count} asignaciones de equipo ficticio`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ CASO ACTUALIZADO CON DATOS HISTÓRICOS REALES');
    console.log('='.repeat(80));
    console.log('\nEl caso ahora contiene:');
    console.log('  ✓ Datos del paciente reales');
    console.log('  ✓ Datos del caso (fechas, tiempos de isquemia)');
    console.log('  ✓ Evaluación preoperatoria (MELD, Child-Pugh)');
    console.log('  ✓ Datos postoperatorios (días UCI/hosp)');
    console.log('  ✓ 27 registros intraoperatorios importados');
    console.log('  ✗ Equipo clínico ficticio eliminado\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

updateHistoricalCase().catch(console.error);
