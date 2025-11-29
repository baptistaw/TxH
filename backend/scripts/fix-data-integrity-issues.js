// scripts/fix-data-integrity-issues.js
// Script para corregir automáticamente problemas de integridad de datos

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Colores para el output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const fixes = {
  casesFixed: [],
  proceduresFixed: [],
  intraopRecordsFixed: [],
  errors: [],
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
}

// Crear backup de los datos antes de modificar
async function createBackup() {
  logSection('CREANDO BACKUP DE DATOS');

  try {
    const timestamp = Date.now();
    const backupData = {
      timestamp: new Date().toISOString(),
      cases: await prisma.transplantCase.findMany(),
      procedures: await prisma.procedure.findMany(),
    };

    const backupPath = `./backup-before-fix-${timestamp}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    log(colors.green, `✓ Backup creado: ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(colors.red, `✗ Error creando backup: ${error.message}`);
    throw error;
  }
}

// Corregir casos de trasplante con fechas invertidas
async function fixTransplantCases() {
  logSection('CORRIGIENDO CASOS DE TRASPLANTE CON FECHAS INVERTIDAS');

  try {
    // Buscar casos con endAt < startAt
    const cases = await prisma.transplantCase.findMany();
    const casesWithWrongDates = cases.filter(c => {
      if (!c.startAt || !c.endAt) return false;
      return new Date(c.endAt) < new Date(c.startAt);
    });

    log(colors.yellow, `Casos con fechas invertidas encontrados: ${casesWithWrongDates.length}`);

    for (const caseItem of casesWithWrongDates) {
      try {
        const originalStart = new Date(caseItem.startAt);
        const originalEnd = new Date(caseItem.endAt);

        // Intercambiar fechas
        const newStart = originalEnd;
        const newEnd = originalStart;

        // Calcular nueva duración
        const newDuration = Math.round((newEnd - newStart) / (1000 * 60));

        // Actualizar caso
        await prisma.transplantCase.update({
          where: { id: caseItem.id },
          data: {
            startAt: newStart,
            endAt: newEnd,
            duration: newDuration,
          },
        });

        fixes.casesFixed.push({
          id: caseItem.id,
          patientId: caseItem.patientId,
          original: {
            startAt: originalStart.toISOString(),
            endAt: originalEnd.toISOString(),
            duration: caseItem.duration,
          },
          fixed: {
            startAt: newStart.toISOString(),
            endAt: newEnd.toISOString(),
            duration: newDuration,
          },
        });

        log(colors.green, `✓ Caso ${caseItem.id} corregido`);
        console.log(`  Original: ${originalStart.toISOString()} → ${originalEnd.toISOString()}`);
        console.log(`  Corregido: ${newStart.toISOString()} → ${newEnd.toISOString()}`);
        console.log(`  Duración: ${caseItem.duration}min → ${newDuration}min (${Math.floor(newDuration/60)}h ${newDuration%60}m)`);

      } catch (error) {
        log(colors.red, `✗ Error corrigiendo caso ${caseItem.id}: ${error.message}`);
        fixes.errors.push({
          type: 'case',
          id: caseItem.id,
          error: error.message,
        });
      }
    }

    log(colors.green, `\n✓ Total de casos corregidos: ${fixes.casesFixed.length}`);
  } catch (error) {
    log(colors.red, `✗ Error en fixTransplantCases: ${error.message}`);
    throw error;
  }
}

// Corregir procedimientos con fechas invertidas
async function fixProcedures() {
  logSection('CORRIGIENDO PROCEDIMIENTOS CON FECHAS INVERTIDAS');

  try {
    const procedures = await prisma.procedure.findMany();
    const proceduresWithWrongDates = procedures.filter(p => {
      if (!p.startAt || !p.endAt) return false;
      return new Date(p.endAt) < new Date(p.startAt);
    });

    log(colors.yellow, `Procedimientos con fechas invertidas encontrados: ${proceduresWithWrongDates.length}`);

    for (const proc of proceduresWithWrongDates) {
      try {
        const originalStart = new Date(proc.startAt);
        const originalEnd = new Date(proc.endAt);

        // Intercambiar fechas
        const newStart = originalEnd;
        const newEnd = originalStart;

        // Calcular nueva duración
        const newDuration = Math.round((newEnd - newStart) / (1000 * 60));

        // Actualizar procedimiento
        await prisma.procedure.update({
          where: { id: proc.id },
          data: {
            startAt: newStart,
            endAt: newEnd,
            duration: newDuration,
          },
        });

        fixes.proceduresFixed.push({
          id: proc.id,
          patientId: proc.patientId,
          original: {
            startAt: originalStart.toISOString(),
            endAt: originalEnd.toISOString(),
            duration: proc.duration,
          },
          fixed: {
            startAt: newStart.toISOString(),
            endAt: newEnd.toISOString(),
            duration: newDuration,
          },
        });

        log(colors.green, `✓ Procedimiento ${proc.id} corregido`);
        console.log(`  Original: ${originalStart.toISOString()} → ${originalEnd.toISOString()}`);
        console.log(`  Corregido: ${newStart.toISOString()} → ${newEnd.toISOString()}`);
        console.log(`  Duración: ${proc.duration}min → ${newDuration}min`);

      } catch (error) {
        log(colors.red, `✗ Error corrigiendo procedimiento ${proc.id}: ${error.message}`);
        fixes.errors.push({
          type: 'procedure',
          id: proc.id,
          error: error.message,
        });
      }
    }

    log(colors.green, `\n✓ Total de procedimientos corregidos: ${fixes.proceduresFixed.length}`);
  } catch (error) {
    log(colors.red, `✗ Error en fixProcedures: ${error.message}`);
    throw error;
  }
}

// Corregir registros intraoperatorios con timestamps fuera del caso
async function fixIntraopRecords() {
  logSection('CORRIGIENDO REGISTROS INTRAOPERATORIOS FUERA DE RANGO');

  try {
    const records = await prisma.intraopRecord.findMany({
      include: {
        case: true,
      },
    });

    // Filtrar registros fuera del rango
    const recordsOutsideCase = records.filter(r => {
      if (!r.case || !r.timestamp || !r.case.startAt) return false;
      const ts = new Date(r.timestamp);
      const start = new Date(r.case.startAt);
      const end = r.case.endAt ? new Date(r.case.endAt) : new Date();
      return ts < start || ts > end;
    });

    log(colors.yellow, `Registros intraop fuera de rango encontrados: ${recordsOutsideCase.length}`);

    let adjustedCount = 0;
    for (const record of recordsOutsideCase) {
      try {
        const ts = new Date(record.timestamp);
        const caseStart = new Date(record.case.startAt);
        const caseEnd = record.case.endAt ? new Date(record.case.endAt) : new Date();

        // Si está antes del inicio, ajustar al inicio del caso
        if (ts < caseStart) {
          await prisma.intraopRecord.update({
            where: { id: record.id },
            data: { timestamp: caseStart },
          });

          fixes.intraopRecordsFixed.push({
            id: record.id,
            caseId: record.caseId,
            original: ts.toISOString(),
            fixed: caseStart.toISOString(),
            reason: 'timestamp antes del inicio del caso',
          });

          adjustedCount++;
          log(colors.green, `✓ Registro ${record.id} ajustado al inicio del caso`);
        }
        // Si está después del fin, ajustar al fin del caso
        else if (ts > caseEnd) {
          await prisma.intraopRecord.update({
            where: { id: record.id },
            data: { timestamp: caseEnd },
          });

          fixes.intraopRecordsFixed.push({
            id: record.id,
            caseId: record.caseId,
            original: ts.toISOString(),
            fixed: caseEnd.toISOString(),
            reason: 'timestamp después del fin del caso',
          });

          adjustedCount++;
          log(colors.green, `✓ Registro ${record.id} ajustado al fin del caso`);
        }

      } catch (error) {
        log(colors.red, `✗ Error corrigiendo registro ${record.id}: ${error.message}`);
        fixes.errors.push({
          type: 'intraopRecord',
          id: record.id,
          error: error.message,
        });
      }
    }

    log(colors.green, `\n✓ Total de registros intraop ajustados: ${adjustedCount}`);
  } catch (error) {
    log(colors.red, `✗ Error en fixIntraopRecords: ${error.message}`);
    throw error;
  }
}

// Corregir valores vitales fuera de rango
async function fixVitalSigns() {
  logSection('CORRIGIENDO SIGNOS VITALES FUERA DE RANGO');

  try {
    const records = await prisma.intraopRecord.findMany();

    let fixedCount = 0;
    for (const record of records) {
      const updates = {};

      // Corregir heart rate sospechoso (probablemente falta un dígito)
      if (record.heartRate && record.heartRate < 20 && record.heartRate >= 10) {
        // 12 → 120
        updates.heartRate = record.heartRate * 10;
        log(colors.yellow, `  Ajustando HR ${record.heartRate} → ${updates.heartRate} en registro ${record.id}`);
      }

      // Si hay actualizaciones, aplicarlas
      if (Object.keys(updates).length > 0) {
        await prisma.intraopRecord.update({
          where: { id: record.id },
          data: updates,
        });
        fixedCount++;
      }
    }

    log(colors.green, `\n✓ Total de registros con signos vitales corregidos: ${fixedCount}`);
  } catch (error) {
    log(colors.red, `✗ Error en fixVitalSigns: ${error.message}`);
    throw error;
  }
}

// Generar reporte de correcciones
async function generateReport() {
  logSection('GENERANDO REPORTE DE CORRECCIONES');

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      casesFixed: fixes.casesFixed.length,
      proceduresFixed: fixes.proceduresFixed.length,
      intraopRecordsFixed: fixes.intraopRecordsFixed.length,
      errors: fixes.errors.length,
    },
    details: fixes,
  };

  const reportPath = `./data-integrity-fixes-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(colors.cyan, '\nEstadísticas de correcciones:');
  console.log(`  ${colors.green}Casos corregidos:${colors.reset} ${report.summary.casesFixed}`);
  console.log(`  ${colors.green}Procedimientos corregidos:${colors.reset} ${report.summary.proceduresFixed}`);
  console.log(`  ${colors.green}Registros intraop ajustados:${colors.reset} ${report.summary.intraopRecordsFixed}`);
  console.log(`  ${colors.red}Errores:${colors.reset} ${report.summary.errors}`);

  log(colors.blue, `\nReporte completo guardado en: ${reportPath}`);

  return report;
}

// Función principal
async function main() {
  console.log(`${colors.magenta}
╔══════════════════════════════════════════════════════════════════╗
║           CORRECCIÓN AUTOMÁTICA DE PROBLEMAS DE INTEGRIDAD       ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Crear backup
    const backupPath = await createBackup();

    // 2. Confirmar con el usuario
    console.log(`\n${colors.yellow}⚠ ADVERTENCIA: Este script modificará datos en la base de datos.${colors.reset}`);
    console.log(`${colors.green}✓ Backup creado en: ${backupPath}${colors.reset}`);
    console.log(`\nPresiona Ctrl+C para cancelar o espera 5 segundos para continuar...`);

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Ejecutar correcciones
    await fixTransplantCases();
    await fixProcedures();
    await fixIntraopRecords();
    await fixVitalSigns();

    // 4. Generar reporte
    const report = await generateReport();

    // 5. Resumen final
    logSection('RESUMEN FINAL');

    if (report.summary.errors === 0) {
      log(colors.green, '✓ ¡Todas las correcciones se aplicaron exitosamente!');
    } else {
      log(colors.yellow, `⚠ Se completó con ${report.summary.errors} errores. Revisa el reporte para más detalles.`);
    }

    const totalFixed = report.summary.casesFixed +
                       report.summary.proceduresFixed +
                       report.summary.intraopRecordsFixed;

    log(colors.cyan, `\nTotal de registros corregidos: ${totalFixed}`);
    log(colors.blue, '\nSe recomienda ejecutar el script de validación nuevamente para verificar.');

  } catch (error) {
    log(colors.red, `\n✗ Error crítico durante la ejecución: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main();
