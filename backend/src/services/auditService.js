// src/services/auditService.js - Servicio de auditoría
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Compara dos objetos y retorna los cambios
 * @param {Object} oldObj - Objeto anterior
 * @param {Object} newObj - Objeto nuevo
 * @returns {Object} - Objeto con los cambios {field: {old, new}}
 */
function getChanges(oldObj, newObj) {
  const changes = {};

  // Campos a ignorar en la comparación
  const ignoreFields = ['updatedAt', 'createdAt', 'password'];

  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);

  for (const key of allKeys) {
    if (ignoreFields.includes(key)) continue;

    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    // Comparar valores (convertir a string para comparación simple)
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes[key] = {
        old: oldVal,
        new: newVal,
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Sanitiza un objeto para guardar en el log (remueve campos sensibles)
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} - Objeto sanitizado
 */
function sanitizeForLog(obj) {
  if (!obj) return null;

  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret'];
  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Crea un registro de auditoría
 * @param {Object} params - Parámetros del log
 * @param {string} params.organizationId - ID de la organización
 * @param {string} params.tableName - Nombre de la tabla
 * @param {string} params.recordId - ID del registro
 * @param {string} params.action - Acción (CREATE, UPDATE, DELETE, SOFT_DELETE, RESTORE)
 * @param {number} [params.userId] - ID del usuario que realizó la acción
 * @param {string} [params.userEmail] - Email del usuario
 * @param {Object} [params.oldValues] - Valores anteriores
 * @param {Object} [params.newValues] - Valores nuevos
 * @param {Object} [params.req] - Request de Express (para extraer IP y User-Agent)
 */
async function createAuditLog({
  organizationId,
  tableName,
  recordId,
  action,
  userId,
  userEmail,
  oldValues,
  newValues,
  req,
}) {
  try {
    // Calcular cambios
    const changes = getChanges(oldValues, newValues);

    // Extraer metadatos de la request
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get?.('User-Agent') || null;
    const requestId = req?.id || null;

    await prisma.auditLog.create({
      data: {
        organizationId,
        tableName,
        recordId: String(recordId),
        action,
        userId,
        userEmail,
        oldValues: sanitizeForLog(oldValues),
        newValues: sanitizeForLog(newValues),
        changes,
        ipAddress,
        userAgent,
        requestId,
      },
    });

    logger.debug('Audit log created', {
      tableName,
      recordId,
      action,
      userId,
    });
  } catch (error) {
    // No fallar si el audit log falla, solo loguear el error
    logger.error('Failed to create audit log', {
      error: error.message,
      tableName,
      recordId,
      action,
    });
  }
}

/**
 * Registra una creación
 */
async function logCreate({ organizationId, tableName, recordId, newValues, userId, userEmail, req }) {
  await createAuditLog({
    organizationId,
    tableName,
    recordId,
    action: 'CREATE',
    userId,
    userEmail,
    newValues,
    req,
  });
}

/**
 * Registra una actualización
 */
async function logUpdate({
  organizationId,
  tableName,
  recordId,
  oldValues,
  newValues,
  userId,
  userEmail,
  req,
}) {
  await createAuditLog({
    organizationId,
    tableName,
    recordId,
    action: 'UPDATE',
    userId,
    userEmail,
    oldValues,
    newValues,
    req,
  });
}

/**
 * Registra una eliminación (hard delete)
 */
async function logDelete({ organizationId, tableName, recordId, oldValues, userId, userEmail, req }) {
  await createAuditLog({
    organizationId,
    tableName,
    recordId,
    action: 'DELETE',
    userId,
    userEmail,
    oldValues,
    req,
  });
}

/**
 * Registra un soft delete
 */
async function logSoftDelete({
  organizationId,
  tableName,
  recordId,
  oldValues,
  userId,
  userEmail,
  req,
}) {
  await createAuditLog({
    organizationId,
    tableName,
    recordId,
    action: 'SOFT_DELETE',
    userId,
    userEmail,
    oldValues,
    newValues: { ...oldValues, deletedAt: new Date() },
    req,
  });
}

/**
 * Registra una restauración de soft delete
 */
async function logRestore({ organizationId, tableName, recordId, oldValues, userId, userEmail, req }) {
  await createAuditLog({
    organizationId,
    tableName,
    recordId,
    action: 'RESTORE',
    userId,
    userEmail,
    oldValues,
    newValues: { ...oldValues, deletedAt: null },
    req,
  });
}

/**
 * Obtiene el historial de auditoría de un registro
 * @param {Object} params
 * @param {string} params.organizationId - ID de la organización
 * @param {string} params.tableName - Nombre de la tabla
 * @param {string} params.recordId - ID del registro
 * @param {number} [params.limit=50] - Límite de resultados
 */
async function getAuditHistory({ organizationId, tableName, recordId, limit = 50 }) {
  return prisma.auditLog.findMany({
    where: {
      organizationId,
      tableName,
      recordId: String(recordId),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Obtiene el historial de cambios de un usuario
 * @param {Object} params
 * @param {string} params.organizationId - ID de la organización
 * @param {number} params.userId - ID del usuario
 * @param {number} [params.limit=100] - Límite de resultados
 */
async function getUserAuditHistory({ organizationId, userId, limit = 100 }) {
  return prisma.auditLog.findMany({
    where: {
      organizationId,
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Busca en el log de auditoría
 * @param {Object} params
 * @param {string} params.organizationId - ID de la organización
 * @param {string} [params.tableName] - Filtrar por tabla
 * @param {string} [params.action] - Filtrar por acción
 * @param {number} [params.userId] - Filtrar por usuario
 * @param {Date} [params.startDate] - Fecha inicio
 * @param {Date} [params.endDate] - Fecha fin
 * @param {number} [params.page=1] - Página
 * @param {number} [params.pageSize=50] - Tamaño de página
 */
async function searchAuditLogs({
  organizationId,
  tableName,
  action,
  userId,
  startDate,
  endDate,
  page = 1,
  pageSize = 50,
}) {
  const where = {
    organizationId,
  };

  if (tableName) where.tableName = tableName;
  if (action) where.action = action;
  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

module.exports = {
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
  logSoftDelete,
  logRestore,
  getAuditHistory,
  getUserAuditHistory,
  searchAuditLogs,
  getChanges,
};
