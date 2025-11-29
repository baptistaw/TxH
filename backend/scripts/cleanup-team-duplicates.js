// scripts/cleanup-team-duplicates.js
// Encuentra y limpia duplicados/inconsistencias en asignaciones de equipo

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo esperado de especialidad -> roles válidos
const VALID_SPECIALTY_ROLES = {
  ANESTESIOLOGO: ['ANEST1', 'ANEST2'],
  CIRUJANO: ['CIRUJANO1', 'CIRUJANO2'],
  INTENSIVISTA: ['INTENSIVISTA'],
  HEPATOLOGO: ['HEPATOLOGO'],
  COORDINADORA: ['NURSE_COORD'],
  OTRO: [] // OTRO puede tener cualquier rol
};

async function findDuplicates() {
  console.log('\n📋 Buscando duplicados y inconsistencias en equipo clínico...\n');

  // Encontrar clínicos con múltiples roles en el mismo caso
  const assignments = await prisma.teamAssignment.findMany({
    include: {
      clinician: true,
      case: {
        include: {
          patient: true
        }
      }
    },
    orderBy: [
      { caseId: 'asc' },
      { clinicianId: 'asc' }
    ]
  });

  // Agrupar por caso + clínico
  const groupedByCaseAndClinician = {};
  assignments.forEach(assignment => {
    const key = `${assignment.caseId}|${assignment.clinicianId}`;
    if (!groupedByCaseAndClinician[key]) {
      groupedByCaseAndClinician[key] = [];
    }
    groupedByCaseAndClinician[key].push(assignment);
  });

  // Encontrar duplicados (mismo clínico con múltiples roles en el mismo caso)
  const duplicates = [];
  const inconsistencies = [];

  Object.entries(groupedByCaseAndClinician).forEach(([key, assignments]) => {
    if (assignments.length > 1) {
      duplicates.push({
        caseId: assignments[0].caseId,
        clinicianId: assignments[0].clinicianId,
        clinician: assignments[0].clinician,
        patient: assignments[0].case.patient,
        assignments: assignments
      });
    }

    // Verificar si el rol corresponde a la especialidad
    assignments.forEach(assignment => {
      const specialty = assignment.clinician.specialty;
      const role = assignment.role;

      if (specialty && specialty !== 'OTRO') {
        const validRoles = VALID_SPECIALTY_ROLES[specialty] || [];
        if (validRoles.length > 0 && !validRoles.includes(role)) {
          inconsistencies.push({
            ...assignment,
            reason: `${specialty} no debería tener rol ${role}`
          });
        }
      }
    });
  });

  return { duplicates, inconsistencies };
}

async function displayResults(duplicates, inconsistencies) {
  console.log('═'.repeat(80));
  console.log('🔍 RESULTADOS DE ANÁLISIS');
  console.log('═'.repeat(80));

  if (duplicates.length === 0 && inconsistencies.length === 0) {
    console.log('\n✅ No se encontraron problemas en las asignaciones de equipo.\n');
    return;
  }

  // Mostrar duplicados
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Clínicos con MÚLTIPLES ROLES en el mismo caso: ${duplicates.length}\n`);
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.clinician.name} (ID: ${dup.clinicianId}, Especialidad: ${dup.clinician.specialty})`);
      console.log(`   Paciente: ${dup.patient.name} (CI: ${dup.patient.id})`);
      console.log(`   Roles asignados:`);
      dup.assignments.forEach(a => {
        console.log(`     - ${a.role} (Assignment ID: ${a.id})`);
      });
      console.log('');
    });
  }

  // Mostrar inconsistencias
  if (inconsistencies.length > 0) {
    console.log(`\n❌ Asignaciones INCONSISTENTES (rol no corresponde a especialidad): ${inconsistencies.length}\n`);
    inconsistencies.forEach((inc, index) => {
      console.log(`${index + 1}. ${inc.clinician.name} - Especialidad: ${inc.clinician.specialty}, Rol asignado: ${inc.role}`);
      console.log(`   Caso: ${inc.case.patient.name} (CI: ${inc.case.patient.id})`);
      console.log(`   Razón: ${inc.reason}`);
      console.log(`   Assignment ID: ${inc.id}`);
      console.log('');
    });
  }
}

async function cleanup(inconsistencies) {
  console.log('═'.repeat(80));
  console.log('🧹 LIMPIEZA DE ASIGNACIONES INCONSISTENTES');
  console.log('═'.repeat(80));

  if (inconsistencies.length === 0) {
    console.log('\n✅ No hay asignaciones inconsistentes para limpiar.\n');
    return;
  }

  console.log(`\n⚠️  Se eliminarán ${inconsistencies.length} asignaciones inconsistentes...\n`);

  let deleted = 0;
  for (const inc of inconsistencies) {
    try {
      await prisma.teamAssignment.delete({
        where: { id: inc.id }
      });
      console.log(`✓ Eliminado: ${inc.clinician.name} como ${inc.role} (ID: ${inc.id})`);
      deleted++;
    } catch (error) {
      console.error(`✗ Error eliminando ${inc.id}:`, error.message);
    }
  }

  console.log(`\n✅ Limpieza completada: ${deleted}/${inconsistencies.length} registros eliminados.\n`);
}

async function main() {
  try {
    const { duplicates, inconsistencies } = await findDuplicates();

    await displayResults(duplicates, inconsistencies);

    // Verificar si hay inconsistencias para limpiar
    if (inconsistencies.length > 0) {
      // En un entorno no interactivo, simplemente reportamos
      console.log('═'.repeat(80));
      console.log('💡 PARA LIMPIAR LAS INCONSISTENCIAS:');
      console.log('═'.repeat(80));
      console.log('\nEjecuta el siguiente comando para eliminar las asignaciones inconsistentes:');
      console.log('\n  node scripts/cleanup-team-duplicates.js --clean\n');
    }

    // Si se pasó el flag --clean, ejecutar limpieza
    if (process.argv.includes('--clean')) {
      await cleanup(inconsistencies);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
