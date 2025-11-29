// scripts/validate-data-integrity.js
// Script para validar la integridad de los datos en la BD

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colores para el output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const issues = {
  critical: [],
  warning: [],
  info: [],
};

function logIssue(level, category, message, details = {}) {
  const issue = { category, message, details, timestamp: new Date() };
  issues[level].push(issue);

  const color = level === 'critical' ? colors.red : level === 'warning' ? colors.yellow : colors.cyan;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${category}: ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(`  ${colors.gray}${JSON.stringify(details)}${colors.reset}`);
  }
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

// Validadores específicos
async function validatePatients() {
  logSection('VALIDANDO PACIENTES');

  const patients = await prisma.patient.findMany();
  console.log(`Total de pacientes: ${patients.length}`);

  // Verificar duplicados por CI
  const ciCounts = {};
  patients.forEach(p => {
    ciCounts[p.id] = (ciCounts[p.id] || 0) + 1;
  });

  const duplicates = Object.entries(ciCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    duplicates.forEach(([ci, count]) => {
      logIssue('critical', 'PACIENTES', `CI duplicada: ${ci}`, { count });
    });
  } else {
    logSuccess('No hay CIs duplicadas');
  }

  // Verificar pacientes sin nombre
  const noName = patients.filter(p => !p.name || p.name.trim() === '');
  if (noName.length > 0) {
    logIssue('warning', 'PACIENTES', `${noName.length} pacientes sin nombre`, {
      ids: noName.map(p => p.id).slice(0, 5)
    });
  } else {
    logSuccess('Todos los pacientes tienen nombre');
  }

  // Verificar fechas de nacimiento inválidas
  const invalidDOB = patients.filter(p => {
    if (!p.dateOfBirth) return false;
    const dob = new Date(p.dateOfBirth);
    const now = new Date();
    const age = (now - dob) / (1000 * 60 * 60 * 24 * 365);
    return age < 0 || age > 120;
  });

  if (invalidDOB.length > 0) {
    logIssue('warning', 'PACIENTES', `${invalidDOB.length} pacientes con fecha de nacimiento inválida`, {
      examples: invalidDOB.slice(0, 3).map(p => ({ id: p.id, dob: p.dateOfBirth }))
    });
  } else {
    logSuccess('Todas las fechas de nacimiento son válidas');
  }
}

async function validateCases() {
  logSection('VALIDANDO CASOS DE TRASPLANTE');

  const cases = await prisma.transplantCase.findMany({
    include: {
      patient: true,
    }
  });
  console.log(`Total de casos: ${cases.length}`);

  // Verificar casos sin paciente
  const noPatient = cases.filter(c => !c.patient);
  if (noPatient.length > 0) {
    logIssue('critical', 'CASES', `${noPatient.length} casos sin paciente asociado`, {
      ids: noPatient.map(c => c.id)
    });
  } else {
    logSuccess('Todos los casos tienen paciente asociado');
  }

  // Verificar fechas inválidas
  const invalidDates = cases.filter(c => {
    if (!c.startAt) return false;
    const start = new Date(c.startAt);
    const now = new Date();
    return start > now || start < new Date('2000-01-01');
  });

  if (invalidDates.length > 0) {
    logIssue('warning', 'CASES', `${invalidDates.length} casos con fecha de inicio inválida`, {
      examples: invalidDates.slice(0, 3).map(c => ({ id: c.id, startAt: c.startAt }))
    });
  } else {
    logSuccess('Todas las fechas de inicio son válidas');
  }

  // Verificar duración coherente con fechas
  const invalidDuration = cases.filter(c => {
    if (!c.startAt || !c.endAt || !c.duration) return false;
    const start = new Date(c.startAt);
    const end = new Date(c.endAt);
    const calculatedDuration = Math.round((end - start) / (1000 * 60));
    const diff = Math.abs(calculatedDuration - c.duration);
    return diff > 5; // tolerancia de 5 minutos
  });

  if (invalidDuration.length > 0) {
    logIssue('warning', 'CASES', `${invalidDuration.length} casos con duración inconsistente`, {
      examples: invalidDuration.slice(0, 3).map(c => ({
        id: c.id,
        stored: c.duration,
        calculated: Math.round((new Date(c.endAt) - new Date(c.startAt)) / (1000 * 60))
      }))
    });
  } else {
    logSuccess('Duraciones coherentes con fechas de inicio/fin');
  }

  // Verificar casos con endAt anterior a startAt
  const wrongOrder = cases.filter(c => {
    if (!c.startAt || !c.endAt) return false;
    return new Date(c.endAt) < new Date(c.startAt);
  });

  if (wrongOrder.length > 0) {
    logIssue('critical', 'CASES', `${wrongOrder.length} casos con endAt < startAt`, {
      examples: wrongOrder.map(c => ({ id: c.id, startAt: c.startAt, endAt: c.endAt }))
    });
  } else {
    logSuccess('Orden de fechas correcto en todos los casos');
  }

  // Verificar casos sin tipo de trasplante
  const noType = cases.filter(c => !c.transplantType);
  if (noType.length > 0) {
    logIssue('info', 'CASES', `${noType.length} casos sin tipo de trasplante especificado`, {
      count: noType.length
    });
  } else {
    logSuccess('Todos los casos tienen tipo de trasplante');
  }

  // Verificar casos con duraciones extremas (< 1h o > 24h)
  const extremeDuration = cases.filter(c => {
    if (!c.duration) return false;
    return c.duration < 60 || c.duration > 1440;
  });

  if (extremeDuration.length > 0) {
    logIssue('warning', 'CASES', `${extremeDuration.length} casos con duración extrema`, {
      examples: extremeDuration.slice(0, 5).map(c => ({
        id: c.id,
        patient: c.patient?.name,
        duration: `${Math.floor(c.duration / 60)}h ${c.duration % 60}m`,
        startAt: c.startAt
      }))
    });
  } else {
    logSuccess('Todas las duraciones están en rangos razonables');
  }
}

async function validateProcedures() {
  logSection('VALIDANDO PROCEDIMIENTOS QUIRÚRGICOS');

  const procedures = await prisma.procedure.findMany({
    include: {
      patient: true,
    }
  });
  console.log(`Total de procedimientos: ${procedures.length}`);

  // Verificar procedimientos sin paciente
  const noPatient = procedures.filter(p => !p.patient);
  if (noPatient.length > 0) {
    logIssue('critical', 'PROCEDURES', `${noPatient.length} procedimientos sin paciente`, {
      ids: noPatient.map(p => p.id)
    });
  } else {
    logSuccess('Todos los procedimientos tienen paciente asociado');
  }

  // Verificar fechas
  const invalidDates = procedures.filter(p => {
    if (!p.startAt) return false;
    const start = new Date(p.startAt);
    const now = new Date();
    return start > now || start < new Date('2000-01-01');
  });

  if (invalidDates.length > 0) {
    logIssue('warning', 'PROCEDURES', `${invalidDates.length} procedimientos con fecha inválida`, {
      examples: invalidDates.slice(0, 3).map(p => ({ id: p.id, startAt: p.startAt }))
    });
  } else {
    logSuccess('Todas las fechas son válidas');
  }

  // Verificar procedimientos sin tipo
  const noType = procedures.filter(p => !p.procedureType);
  if (noType.length > 0) {
    logIssue('warning', 'PROCEDURES', `${noType.length} procedimientos sin tipo especificado`, {
      count: noType.length
    });
  } else {
    logSuccess('Todos los procedimientos tienen tipo');
  }

  // Verificar orden de fechas
  const wrongOrder = procedures.filter(p => {
    if (!p.startAt || !p.endAt) return false;
    return new Date(p.endAt) < new Date(p.startAt);
  });

  if (wrongOrder.length > 0) {
    logIssue('critical', 'PROCEDURES', `${wrongOrder.length} procedimientos con endAt < startAt`, {
      examples: wrongOrder.map(p => ({ id: p.id, startAt: p.startAt, endAt: p.endAt }))
    });
  } else {
    logSuccess('Orden de fechas correcto');
  }
}

async function validatePreopEvaluations() {
  logSection('VALIDANDO EVALUACIONES PREOPERATORIAS');

  const evals = await prisma.preopEvaluation.findMany({
    include: {
      patient: true,
      case: true,
    }
  });
  console.log(`Total de evaluaciones: ${evals.length}`);

  // Verificar evaluaciones sin paciente
  const noPatient = evals.filter(e => !e.patient);
  if (noPatient.length > 0) {
    logIssue('critical', 'PREOP', `${noPatient.length} evaluaciones sin paciente`, {
      ids: noPatient.map(e => e.id)
    });
  } else {
    logSuccess('Todas las evaluaciones tienen paciente');
  }

  // Verificar evaluaciones con caso pero el caso no existe
  const invalidCase = evals.filter(e => e.caseId && !e.case);
  if (invalidCase.length > 0) {
    logIssue('critical', 'PREOP', `${invalidCase.length} evaluaciones con caso inválido`, {
      examples: invalidCase.slice(0, 5).map(e => ({ id: e.id, caseId: e.caseId }))
    });
  } else {
    logSuccess('Todas las relaciones con casos son válidas');
  }

  // Verificar scores MELD fuera de rango
  const invalidMELD = evals.filter(e => {
    if (e.meldScore === null || e.meldScore === undefined) return false;
    return e.meldScore < 6 || e.meldScore > 40;
  });

  if (invalidMELD.length > 0) {
    logIssue('warning', 'PREOP', `${invalidMELD.length} evaluaciones con MELD fuera de rango`, {
      examples: invalidMELD.slice(0, 5).map(e => ({
        id: e.id,
        patient: e.patient?.name,
        meld: e.meldScore
      }))
    });
  } else {
    logSuccess('Todos los scores MELD están en rango válido');
  }

  // Verificar scores Child-Pugh fuera de rango
  const invalidChild = evals.filter(e => {
    if (e.childPughScore === null || e.childPughScore === undefined) return false;
    return e.childPughScore < 5 || e.childPughScore > 15;
  });

  if (invalidChild.length > 0) {
    logIssue('warning', 'PREOP', `${invalidChild.length} evaluaciones con Child-Pugh fuera de rango`, {
      examples: invalidChild.slice(0, 5).map(e => ({
        id: e.id,
        score: e.childPughScore
      }))
    });
  } else {
    logSuccess('Todos los scores Child-Pugh están en rango válido');
  }
}

async function validateIntraopRecords() {
  logSection('VALIDANDO REGISTROS INTRAOPERATORIOS (TRASPLANTES)');

  const records = await prisma.intraopRecord.findMany({
    include: {
      case: true,
    }
  });
  console.log(`Total de registros intraop: ${records.length}`);

  // Verificar registros sin caso
  const noCase = records.filter(r => !r.case);
  if (noCase.length > 0) {
    logIssue('critical', 'INTRAOP', `${noCase.length} registros sin caso asociado`, {
      ids: noCase.slice(0, 10).map(r => r.id)
    });
  } else {
    logSuccess('Todos los registros tienen caso asociado');
  }

  // Verificar timestamps fuera del rango del caso
  const outsideCase = records.filter(r => {
    if (!r.case || !r.timestamp || !r.case.startAt) return false;
    const ts = new Date(r.timestamp);
    const start = new Date(r.case.startAt);
    const end = r.case.endAt ? new Date(r.case.endAt) : new Date();
    return ts < start || ts > end;
  });

  if (outsideCase.length > 0) {
    logIssue('warning', 'INTRAOP', `${outsideCase.length} registros con timestamp fuera del caso`, {
      examples: outsideCase.slice(0, 3).map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        caseStart: r.case?.startAt
      }))
    });
  } else {
    logSuccess('Todos los timestamps están dentro del rango del caso');
  }

  // Verificar valores vitales fuera de rango
  const invalidVitals = records.filter(r => {
    return (
      (r.heartRate && (r.heartRate < 20 || r.heartRate > 250)) ||
      (r.pas && (r.pas < 40 || r.pas > 300)) ||
      (r.pad && (r.pad < 20 || r.pad > 200)) ||
      (r.satO2 && (r.satO2 < 50 || r.satO2 > 100)) ||
      (r.temp && (r.temp < 28 || r.temp > 43))
    );
  });

  if (invalidVitals.length > 0) {
    logIssue('warning', 'INTRAOP', `${invalidVitals.length} registros con signos vitales fuera de rango`, {
      examples: invalidVitals.slice(0, 3).map(r => ({
        id: r.id,
        hr: r.heartRate,
        pas: r.pas,
        sat: r.satO2,
        temp: r.temp
      }))
    });
  } else {
    logSuccess('Todos los signos vitales están en rangos fisiológicos');
  }
}

async function validateProcedureIntraopRecords() {
  logSection('VALIDANDO REGISTROS INTRAOPERATORIOS (PROCEDIMIENTOS)');

  const records = await prisma.procedureIntraopRecord.findMany({
    include: {
      procedure: true,
    }
  });
  console.log(`Total de registros: ${records.length}`);

  // Verificar registros sin procedimiento
  const noProcedure = records.filter(r => !r.procedure);
  if (noProcedure.length > 0) {
    logIssue('critical', 'PROC_INTRAOP', `${noProcedure.length} registros sin procedimiento`, {
      ids: noProcedure.map(r => r.id)
    });
  } else {
    logSuccess('Todos los registros tienen procedimiento asociado');
  }

  // Verificar valores vitales
  const invalidVitals = records.filter(r => {
    return (
      (r.heartRate && (r.heartRate < 20 || r.heartRate > 250)) ||
      (r.pas && (r.pas < 40 || r.pas > 300)) ||
      (r.satO2 && (r.satO2 < 50 || r.satO2 > 100))
    );
  });

  if (invalidVitals.length > 0) {
    logIssue('warning', 'PROC_INTRAOP', `${invalidVitals.length} registros con vitales fuera de rango`, {
      count: invalidVitals.length
    });
  } else {
    logSuccess('Todos los signos vitales están en rangos válidos');
  }
}

async function validateTeam() {
  logSection('VALIDANDO EQUIPO CLÍNICO');

  const team = await prisma.clinician.findMany();
  console.log(`Total de clínicos: ${team.length}`);

  // Verificar duplicados por nombre
  const nameCounts = {};
  team.forEach(t => {
    const key = `${t.name}-${t.role}`;
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    logIssue('warning', 'TEAM', `${duplicates.length} posibles clínicos duplicados`, {
      examples: duplicates.slice(0, 5).map(([key, count]) => ({ key, count }))
    });
  } else {
    logSuccess('No hay duplicados obvios');
  }

  // Verificar clínicos sin nombre
  const noName = team.filter(t => !t.name || t.name.trim() === '');
  if (noName.length > 0) {
    logIssue('critical', 'TEAM', `${noName.length} clínicos sin nombre`, {
      ids: noName.map(t => t.id)
    });
  } else {
    logSuccess('Todos los clínicos tienen nombre');
  }
}

async function validateReferentialIntegrity() {
  logSection('VALIDANDO INTEGRIDAD REFERENCIAL');

  // Verificar casos huérfanos (patientId no existe)
  const orphanCases = await prisma.$queryRaw`
    SELECT c.id, c."patientId"
    FROM transplant_cases c
    LEFT JOIN patients p ON c."patientId" = p.id
    WHERE p.id IS NULL
  `;

  if (orphanCases.length > 0) {
    logIssue('critical', 'REFERENCES', `${orphanCases.length} casos con paciente inexistente`, {
      examples: orphanCases.slice(0, 5)
    });
  } else {
    logSuccess('Todos los casos tienen paciente válido');
  }

  // Verificar procedimientos huérfanos
  const orphanProcedures = await prisma.$queryRaw`
    SELECT pr.id, pr."patientId"
    FROM procedures pr
    LEFT JOIN patients p ON pr."patientId" = p.id
    WHERE p.id IS NULL
  `;

  if (orphanProcedures.length > 0) {
    logIssue('critical', 'REFERENCES', `${orphanProcedures.length} procedimientos con paciente inexistente`, {
      examples: orphanProcedures.slice(0, 5)
    });
  } else {
    logSuccess('Todos los procedimientos tienen paciente válido');
  }

  // Verificar evaluaciones preop huérfanas
  const orphanPreop = await prisma.$queryRaw`
    SELECT pe.id, pe."patientId"
    FROM preop_evaluations pe
    LEFT JOIN patients p ON pe."patientId" = p.id
    WHERE p.id IS NULL
  `;

  if (orphanPreop.length > 0) {
    logIssue('critical', 'REFERENCES', `${orphanPreop.length} evaluaciones con paciente inexistente`, {
      examples: orphanPreop.slice(0, 5)
    });
  } else {
    logSuccess('Todas las evaluaciones tienen paciente válido');
  }
}

async function generateSummaryReport() {
  logSection('RESUMEN DE VALIDACIÓN');

  console.log(`\n${colors.cyan}Estadísticas:${colors.reset}`);
  console.log(`  ${colors.red}Críticos:${colors.reset} ${issues.critical.length}`);
  console.log(`  ${colors.yellow}Advertencias:${colors.reset} ${issues.warning.length}`);
  console.log(`  ${colors.cyan}Informativos:${colors.reset} ${issues.info.length}`);

  if (issues.critical.length === 0 && issues.warning.length === 0) {
    console.log(`\n${colors.green}✓ ¡No se encontraron problemas de integridad!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Se encontraron problemas que requieren atención${colors.reset}`);
  }

  // Guardar reporte detallado en archivo
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      critical: issues.critical.length,
      warning: issues.warning.length,
      info: issues.info.length,
    },
    issues,
  };

  const fs = require('fs');
  const reportPath = `./data-integrity-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.blue}Reporte completo guardado en: ${reportPath}${colors.reset}`);
}

// Función principal
async function main() {
  console.log(`${colors.blue}
╔════════════════════════════════════════════════════════════╗
║         VALIDACIÓN DE INTEGRIDAD DE DATOS - BD             ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    await validatePatients();
    await validateCases();
    await validateProcedures();
    await validatePreopEvaluations();
    await validateIntraopRecords();
    await validateProcedureIntraopRecords();
    await validateTeam();
    await validateReferentialIntegrity();

    await generateSummaryReport();

  } catch (error) {
    console.error(`\n${colors.red}Error durante la validación:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main();
