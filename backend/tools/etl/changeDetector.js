// tools/etl/changeDetector.js - Detecta cambios en Excel vs BD
const { parseDate } = require('./helpers');

/**
 * Detectar cambios en pacientes
 * Compara fila de Excel con registro en BD
 */
function hasPatientChanged(excelRow, dbRecord) {
  if (!dbRecord) return true; // Nuevo registro

  // Comparar updatedAt si existe en Excel
  const excelUpdated = parseDate(excelRow.lastUpdated || excelRow.Fecha);
  if (excelUpdated && dbRecord.updatedAt) {
    return excelUpdated > dbRecord.updatedAt;
  }

  // Comparar campos clave (si no hay timestamps)
  const excelName = String(excelRow.Nombre || '').trim();
  const dbName = String(dbRecord.name || '').trim();

  return excelName !== dbName;
}

/**
 * Detectar cambios en casos de trasplante
 */
function hasCaseChanged(excelRow, dbRecord) {
  if (!dbRecord) return true;

  const excelUpdated = parseDate(excelRow.lastUpdated);
  if (excelUpdated && dbRecord.updatedAt) {
    return excelUpdated > dbRecord.updatedAt;
  }

  // Comparar campos críticos
  const excelEnd = parseDate(excelRow.FechaHoraFin);
  const dbEnd = dbRecord.endAt;

  if (excelEnd && dbEnd) {
    return excelEnd.getTime() !== dbEnd.getTime();
  }

  return excelEnd !== dbEnd;
}

/**
 * Detectar cambios en evaluaciones preoperatorias
 */
function hasPreopChanged(excelRow, dbRecord) {
  if (!dbRecord) return true;

  const excelUpdated = parseDate(excelRow.lastUpdated);
  if (excelUpdated && dbRecord.updatedAt) {
    return excelUpdated > dbRecord.updatedAt;
  }

  // Comparar scores (MELD puede cambiar)
  return excelRow.MELD !== dbRecord.meld;
}

/**
 * Detectar cambios en registros intraoperatorios
 */
function hasIntraopChanged(excelRow, dbRecord) {
  if (!dbRecord) return true;

  const excelTimestamp = parseDate(excelRow.Fecha);
  if (!excelTimestamp || !dbRecord.timestamp) {
    return true; // Si no hay timestamp, considerar cambio
  }

  // Los intraop rara vez cambian una vez creados
  // Solo actualizar si hay diferencia en timestamp
  return excelTimestamp.getTime() !== dbRecord.timestamp.getTime();
}

/**
 * Detectar cambios en resultados postoperatorios
 */
function hasPostopChanged(excelRow, dbRecord) {
  if (!dbRecord) return true;

  const excelUpdated = parseDate(excelRow.lastUpdated);
  if (excelUpdated && dbRecord.updatedAt) {
    return excelUpdated > dbRecord.updatedAt;
  }

  // Comparar campos que pueden actualizarse
  return (
    excelRow.Extubado !== dbRecord.extubatedInOR ||
    excelRow.DiasIntSala !== dbRecord.wardDays
  );
}

/**
 * Construir clave única para tracking de cambios
 */
function buildRecordKey(sheet, row) {
  switch (sheet) {
    case 'DatosPaciente':
      return `patient:${row.CI}`;

    case 'DatosTrasplante':
      return `case:${row.CI}:${row.FechaHoraInicio}`;

    case 'Preoperatorio':
      return `preop:${row.CI}:${row.Fecha}`;

    case 'IntraopInducc':
    case 'IntraopDisec':
    case 'IntraopAnhep':
    case 'IntraopPreReperf':
    case 'IntraopPostRepef':
    case 'IntropFinVB':
    case 'IntraopCierre':
      return `intraop:${row.CI}:${row.FechaT}:${row.Fecha}:${sheet}`;

    case 'PostOp':
      return `postop:${row.CI}:${row.Fecha}`;

    case 'Mortalidad':
      return `mortality:${row.CI}`;

    default:
      return null;
  }
}

/**
 * Obtener registro de BD por clave
 */
async function getRecordByKey(prisma, sheet, row) {
  const { normalizeCI, parseDate } = require('./helpers');

  try {
    const ci = normalizeCI(row.CI);
    if (!ci) return null;

    switch (sheet) {
      case 'DatosPaciente':
        return await prisma.patient.findUnique({ where: { id: ci } });

      case 'DatosTrasplante': {
        const startAt = parseDate(row.FechaHoraInicio);
        if (!startAt) return null;

        return await prisma.transplantCase.findFirst({
          where: { patientId: ci, startAt },
        });
      }

      case 'Preoperatorio': {
        const evalDate = parseDate(row.Fecha);
        if (!evalDate) return null;

        return await prisma.preopEvaluation.findFirst({
          where: { patientId: ci, evaluationDate: evalDate },
        });
      }

      case 'PostOp': {
        // PostOp es único por caso, buscar por CI más reciente
        const transplantCase = await prisma.transplantCase.findFirst({
          where: { patientId: ci },
          orderBy: { startAt: 'desc' },
        });

        if (!transplantCase) return null;

        return await prisma.postOpOutcome.findUnique({
          where: { caseId: transplantCase.id },
        });
      }

      case 'Mortalidad': {
        const transplantCase = await prisma.transplantCase.findFirst({
          where: { patientId: ci },
          orderBy: { startAt: 'desc' },
        });

        if (!transplantCase) return null;

        return await prisma.mortality.findUnique({
          where: { caseId: transplantCase.id },
        });
      }

      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Determinar si una fila necesita actualización
 */
async function needsUpdate(prisma, sheet, excelRow) {
  const dbRecord = await getRecordByKey(prisma, sheet, excelRow);

  if (!dbRecord) {
    return { needsUpdate: true, isNew: true };
  }

  let hasChanged = false;

  switch (sheet) {
    case 'DatosPaciente':
      hasChanged = hasPatientChanged(excelRow, dbRecord);
      break;
    case 'DatosTrasplante':
      hasChanged = hasCaseChanged(excelRow, dbRecord);
      break;
    case 'Preoperatorio':
      hasChanged = hasPreopChanged(excelRow, dbRecord);
      break;
    case 'PostOp':
      hasChanged = hasPostopChanged(excelRow, dbRecord);
      break;
    default:
      hasChanged = true; // Por defecto, actualizar
  }

  return { needsUpdate: hasChanged, isNew: false, existing: dbRecord };
}

module.exports = {
  hasPatientChanged,
  hasCaseChanged,
  hasPreopChanged,
  hasIntraopChanged,
  hasPostopChanged,
  buildRecordKey,
  getRecordByKey,
  needsUpdate,
};
