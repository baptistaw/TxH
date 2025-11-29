// scripts/verify-clinician-filters.js
// Verificar que los filtros por clínico funcionen correctamente

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function verifyFilters() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║          VERIFICACIÓN DE FILTROS POR CLÍNICO                     ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Obtener algunos clínicos de prueba
    const testClinicians = await prisma.clinician.findMany({
      where: {
        userRole: { not: 'ADMIN' }
      },
      include: {
        teamAssignments: true,
        procedures: true,
        preopEvaluations: true
      },
      take: 5,
      orderBy: { name: 'asc' }
    });

    console.log(`\n${colors.cyan}1. Verificando filtros de trasplantes...${colors.reset}\n`);

    for (const clinician of testClinicians) {
      const casesCount = clinician.teamAssignments.length;

      // Simular query como lo haría el controller
      const filteredCases = await prisma.transplantCase.findMany({
        where: {
          team: {
            some: { clinicianId: clinician.id }
          }
        },
        include: {
          patient: { select: { id: true, name: true } },
          team: { include: { clinician: { select: { id: true, name: true } } } }
        }
      });

      const match = filteredCases.length === casesCount;
      const status = match ? `${colors.green}✓` : `${colors.red}✗`;
      console.log(`${status} ${clinician.name}: ${filteredCases.length} casos (esperados: ${casesCount})${colors.reset}`);

      if (!match) {
        console.log(`${colors.yellow}   ⚠ No coincide el conteo${colors.reset}`);
      }
    }

    console.log(`\n${colors.cyan}2. Verificando filtros de procedimientos...${colors.reset}\n`);

    for (const clinician of testClinicians) {
      const proceduresCount = clinician.procedures.length;

      // Simular query como lo haría el controller
      const filteredProcs = await prisma.procedure.findMany({
        where: {
          clinicianId: clinician.id
        },
        include: {
          patient: { select: { id: true, name: true } },
          clinician: { select: { id: true, name: true } }
        }
      });

      const match = filteredProcs.length === proceduresCount;
      const status = match ? `${colors.green}✓` : `${colors.red}✗`;
      console.log(`${status} ${clinician.name}: ${filteredProcs.length} procedimientos (esperados: ${proceduresCount})${colors.reset}`);

      if (!match) {
        console.log(`${colors.yellow}   ⚠ No coincide el conteo${colors.reset}`);
      }
    }

    console.log(`\n${colors.cyan}3. Verificando filtros de evaluaciones preop...${colors.reset}\n`);

    for (const clinician of testClinicians) {
      const preopCount = clinician.preopEvaluations.length;

      // Simular query como lo haría el controller
      const filteredPreops = await prisma.preopEvaluation.findMany({
        where: {
          clinicianId: clinician.id
        },
        include: {
          patient: { select: { id: true, name: true } },
          clinician: { select: { id: true, name: true } }
        }
      });

      const match = filteredPreops.length === preopCount;
      const status = match ? `${colors.green}✓` : `${colors.red}✗`;
      console.log(`${status} ${clinician.name}: ${filteredPreops.length} evaluaciones (esperadas: ${preopCount})${colors.reset}`);

      if (!match) {
        console.log(`${colors.yellow}   ⚠ No coincide el conteo${colors.reset}`);
      }
    }

    // Resumen por editor
    console.log(`\n${colors.cyan}4. Resumen de acceso por EDITORES...${colors.reset}\n`);

    const editors = await prisma.clinician.findMany({
      where: { userRole: 'ANESTESIOLOGO' },
      include: {
        teamAssignments: { include: { case: { select: { startAt: true } } } },
        procedures: { select: { startAt: true } },
        preopEvaluations: { select: { evaluationDate: true } }
      },
      orderBy: { name: 'asc' }
    });

    editors.forEach(editor => {
      const total = editor.teamAssignments.length + editor.procedures.length + editor.preopEvaluations.length;
      console.log(`${colors.green}${editor.name} (${editor.email})${colors.reset}`);
      console.log(`  Trasplantes:    ${editor.teamAssignments.length}`);
      console.log(`  Procedimientos: ${editor.procedures.length}`);
      console.log(`  Evaluaciones:   ${editor.preopEvaluations.length}`);
      console.log(`  TOTAL:          ${total}\n`);
    });

    // Verificar admin
    console.log(`${colors.cyan}5. Verificando acceso ADMIN (debe ver todo)...${colors.reset}\n`);

    const totalCases = await prisma.transplantCase.count();
    const totalProcs = await prisma.procedure.count();
    const totalPreops = await prisma.preopEvaluation.count();

    console.log(`${colors.green}Admin puede ver:${colors.reset}`);
    console.log(`  Trasplantes:    ${totalCases}`);
    console.log(`  Procedimientos: ${totalProcs}`);
    console.log(`  Evaluaciones:   ${totalPreops}`);
    console.log(`  TOTAL:          ${totalCases + totalProcs + totalPreops}\n`);

    console.log(`${colors.green}✓ Verificación completada${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFilters();
