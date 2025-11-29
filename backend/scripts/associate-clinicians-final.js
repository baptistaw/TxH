// scripts/associate-clinicians-final.js
// Asociar clínicos con procedimientos y evaluaciones preop

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function extractCP(anestesistaField) {
  if (!anestesistaField) return null;

  // Formato: "70203: William Baptista" o "70203"
  const match = anestesistaField.toString().match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

async function associateClinicians() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║     ASOCIACIÓN DE CLÍNICOS CON PROCEDIMIENTOS Y EVALUACIONES     ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Leer datos del Excel
    console.log(`${colors.cyan}\n1. Leyendo Excel...${colors.reset}\n`);

    const workbook = XLSX.readFile(excelPath);
    const procedSheet = workbook.Sheets['Porcedimientos'];
    const procedData = XLSX.utils.sheet_to_json(procedSheet);

    console.log(`   Procedimientos encontrados: ${procedData.length}\n`);

    // 2. Obtener todos los procedimientos de la BD
    console.log(`${colors.cyan}2. Obteniendo procedimientos de la BD...${colors.reset}\n`);

    const procedures = await prisma.procedure.findMany({
      orderBy: { startAt: 'asc' }
    });

    console.log(`   Procedimientos en BD: ${procedures.length}\n`);

    // 3. Crear mapeo de procedimientos por CI + fecha
    console.log(`${colors.cyan}3. Asociando procedimientos con anestesiólogos...${colors.reset}\n`);

    let associated = 0;
    let notFound = 0;
    let noAnesthetist = 0;

    for (const excelProc of procedData) {
      const ci = excelProc.CI?.toString();
      const anestCP = extractCP(excelProc.Anestesista1);

      if (!anestCP) {
        noAnesthetist++;
        continue;
      }

      // Buscar el procedimiento en BD por paciente CI
      const dbProc = await prisma.procedure.findFirst({
        where: { patientId: ci }
      });

      if (dbProc) {
        // Actualizar con el clínico
        await prisma.procedure.update({
          where: { id: dbProc.id },
          data: { clinicianId: anestCP }
        });

        console.log(`${colors.green}   ✓ CI ${ci} → Anestesiólogo ${anestCP}${colors.reset}`);
        associated++;
      } else {
        notFound++;
      }
    }

    console.log(`\n${colors.green}   Procedimientos asociados: ${associated}${colors.reset}`);
    console.log(`${colors.yellow}   Sin anestesiólogo en Excel: ${noAnesthetist}${colors.reset}`);
    console.log(`${colors.yellow}   No encontrados en BD: ${notFound}${colors.reset}`);

    // 4. Asociar evaluaciones preop con el anestesiólogo principal del caso
    console.log(`\n${colors.cyan}4. Asociando evaluaciones preop...${colors.reset}\n`);

    const preopEvals = await prisma.preopEvaluation.findMany({
      where: {
        caseId: { not: null }
      },
      include: {
        case: {
          include: {
            team: {
              where: { role: 'ANEST1' },
              include: { clinician: true }
            }
          }
        }
      }
    });

    let preopAssociated = 0;
    for (const preop of preopEvals) {
      if (preop.case?.team[0]?.clinicianId) {
        await prisma.preopEvaluation.update({
          where: { id: preop.id },
          data: { clinicianId: preop.case.team[0].clinicianId }
        });
        preopAssociated++;
      }
    }

    console.log(`${colors.green}   ✓ Evaluaciones preop asociadas: ${preopAssociated}${colors.reset}`);

    // 5. Resumen por clínico
    console.log(`\n${colors.cyan}5. Generando resumen por clínico...${colors.reset}\n`);

    const clinicians = await prisma.clinician.findMany({
      where: {
        userRole: { not: 'ADMIN' }
      },
      include: {
        teamAssignments: true,
        procedures: true,
        preopEvaluations: true
      },
      orderBy: { name: 'asc' }
    });

    console.log('══════════════════════════════════════════════════════════════');
    console.log('  RESUMEN POR CLÍNICO');
    console.log('══════════════════════════════════════════════════════════════\n');

    clinicians.forEach(c => {
      const casesCount = c.teamAssignments.length;
      const proceduresCount = c.procedures.length;
      const preopCount = c.preopEvaluations.length;
      const total = casesCount + proceduresCount + preopCount;

      if (total > 0) {
        const roleLabel = c.userRole === 'ANESTESIOLOGO' ? '[EDITOR]' : '[VIEWER]';
        console.log(`${c.name} ${roleLabel}`);
        console.log(`  Trasplantes:      ${casesCount}`);
        console.log(`  Procedimientos:   ${proceduresCount}`);
        console.log(`  Eval. Preop:      ${preopCount}`);
        console.log(`  TOTAL:            ${total}\n`);
      }
    });

    console.log('══════════════════════════════════════════════════════════════');
    console.log(`${colors.green}\n✓ Asociación completada exitosamente${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}\n✗ Error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

associateClinicians();
