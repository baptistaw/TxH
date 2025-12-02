// src/services/patientService.js - Lógica de negocio para pacientes
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');
const auditService = require('./auditService');

/**
 * Obtener todos los pacientes con paginación
 * @param {string} organizationId - ID de la organización (requerido para multi-tenancy)
 */
const getAllPatients = async ({
  organizationId,
  page = 1,
  limit = 20,
  search,
  transplanted,
  provider,
  sex,
  admissionDateFrom,
  admissionDateTo,
  clinicianId
}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const skip = (page - 1) * limit;

  // Construir objeto where con filtros
  // IMPORTANTE: Incluir registros de la organización actual O registros históricos sin org
  // Esto permite migración gradual de datos históricos

  // Base filters que siempre aplican
  const baseFilters = {
    deletedAt: null, // Solo registros activos (soft delete)
    ...(transplanted !== undefined && { transplanted }),
    ...(provider && { provider }),
    ...(sex && { sex }),
    ...((admissionDateFrom || admissionDateTo) && {
      admissionDate: {
        ...(admissionDateFrom && { gte: new Date(admissionDateFrom) }),
        ...(admissionDateTo && { lte: new Date(admissionDateTo) }),
      },
    }),
  };

  // Construir array de condiciones AND
  const andConditions = [baseFilters];

  // Multi-tenancy: solo datos de la organización actual
  andConditions.push({ organizationId });

  // Búsqueda por texto
  if (search) {
    andConditions.push({
      OR: [
        { id: { contains: search } },
        { name: { contains: search, mode: 'insensitive' } },
        { fnr: { contains: search } },
      ],
    });
  }

  // Filtrar por clínico
  if (clinicianId) {
    andConditions.push({
      OR: [
        {
          cases: {
            some: {
              team: {
                some: { clinicianId },
              },
            },
          },
        },
        {
          preops: {
            some: { clinicianId },
          },
        },
      ],
    });
  }

  const where = { AND: andConditions };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { cases: true },
        },
        cases: {
          orderBy: { startAt: 'desc' },
          take: 1,
          select: {
            startAt: true,
          },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data: patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtener paciente por ID (CI) con filtro de organización
 * @param {string} id - CI del paciente
 * @param {string} organizationId - ID de la organización
 */
const getPatientById = async (id, organizationId) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      organizationId, // Multi-tenancy: solo datos de la organización actual
      deletedAt: null, // Solo registros activos
    },
    include: {
      cases: {
        orderBy: { startAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { cases: true, preops: true },
      },
    },
  });

  if (!patient) {
    throw new NotFoundError('Paciente');
  }

  return patient;
};

/**
 * Crear nuevo paciente con organizationId
 * @param {object} data - Datos del paciente
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría {userId, userEmail, req}
 */
const createPatient = async (data, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const patient = await prisma.patient.create({
    data: {
      ...data,
      organizationId, // Multi-tenancy
    },
  });

  // Audit log
  await auditService.logCreate({
    organizationId,
    tableName: 'patients',
    recordId: patient.id,
    newValues: patient,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return patient;
};

/**
 * Actualizar paciente (verificando organización)
 * @param {string} id - CI del paciente
 * @param {object} data - Datos a actualizar
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría {userId, userEmail, req}
 */
const updatePatient = async (id, data, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Buscar paciente verificando que pertenece a la organización
  const oldPatient = await prisma.patient.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!oldPatient) {
    throw new NotFoundError('Paciente');
  }

  const updatedPatient = await prisma.patient.update({
    where: { id },
    data,
  });

  // Audit log
  await auditService.logUpdate({
    organizationId,
    tableName: 'patients',
    recordId: id,
    oldValues: oldPatient,
    newValues: updatedPatient,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return updatedPatient;
};

/**
 * Eliminar paciente (soft delete - verificando organización)
 * @param {string} id - CI del paciente
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría {userId, userEmail, req}
 */
const deletePatient = async (id, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Buscar paciente verificando que pertenece a la organización
  const patient = await prisma.patient.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!patient) {
    throw new NotFoundError('Paciente');
  }

  // Soft delete - marcar con deletedAt en lugar de eliminar
  const deletedPatient = await prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Audit log
  await auditService.logSoftDelete({
    organizationId,
    tableName: 'patients',
    recordId: id,
    oldValues: patient,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return deletedPatient;
};

/**
 * Restaurar paciente eliminado (revertir soft delete)
 * @param {string} id - CI del paciente
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría {userId, userEmail, req}
 */
const restorePatient = async (id, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Buscar paciente eliminado
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: { not: null }, // Solo pacientes eliminados
    },
  });

  if (!patient) {
    throw new NotFoundError('Paciente eliminado');
  }

  // Restaurar - quitar deletedAt
  const restoredPatient = await prisma.patient.update({
    where: { id },
    data: { deletedAt: null },
  });

  // Audit log
  await auditService.logRestore({
    organizationId,
    tableName: 'patients',
    recordId: id,
    oldValues: patient,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return restoredPatient;
};

/**
 * Obtener pacientes eliminados (para recuperación)
 * @param {string} organizationId - ID de la organización
 */
const getDeletedPatients = async (organizationId, { page = 1, limit = 20 } = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    deletedAt: { not: null }, // Solo eliminados
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' }, // Más recientes primero
      select: {
        id: true,
        name: true,
        fnr: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data: patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  restorePatient,
  getDeletedPatients,
};
