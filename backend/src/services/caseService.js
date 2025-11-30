// src/services/caseService.js - Lógica de negocio para casos de trasplante
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');
const auditService = require('./auditService');

/**
 * Obtener todos los casos con paginación y filtros
 * @param {string} organizationId - ID de la organización (requerido)
 */
const getAllCases = async ({
  organizationId,
  page = 1,
  limit = 20,
  search,
  patientId,
  startDate,
  endDate,
  transplantDateFrom,
  transplantDateTo,
  etiology,
  sex,
  isRetransplant,
  isHepatoRenal,
  optimalDonor,
  clinicianId,
  dataSource
}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const skip = (page - 1) * limit;
  const where = {
    organizationId, // Multi-tenancy filter
    deletedAt: null, // Solo registros activos (soft delete)
    ...(search && {
      OR: [
        { id: { contains: search } },
        { patientId: { contains: search } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(patientId && { patientId }),
    ...((startDate || endDate) && {
      startAt: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    }),
    ...((transplantDateFrom || transplantDateTo) && {
      transplantDate: {
        ...(transplantDateFrom && { gte: transplantDateFrom }),
        ...(transplantDateTo && { lte: transplantDateTo }),
      },
    }),
    ...(etiology && {
      preopEvaluations: {
        some: {
          OR: [
            { etiology1: { contains: etiology, mode: 'insensitive' } },
            { etiology2: { contains: etiology, mode: 'insensitive' } },
          ],
        },
      },
    }),
    ...(sex && { patient: { sex } }),
    ...(isRetransplant !== undefined && { isRetransplant }),
    ...(isHepatoRenal !== undefined && { isHepatoRenal }),
    ...(optimalDonor !== undefined && { optimalDonor }),
    ...(dataSource && { dataSource }),
    // Filtrar por clínico si no es admin
    ...(clinicianId && {
      team: {
        some: { clinicianId },
      },
    }),
  };

  const [cases, total] = await Promise.all([
    prisma.transplantCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, sex: true, birthDate: true } },
        team: { include: { clinician: { select: { id: true, name: true, specialty: true } } } },
      },
    }),
    prisma.transplantCase.count({ where }),
  ]);

  return {
    data: cases,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Obtener caso por ID con filtro de organización
 */
const getCaseById = async (id, organizationId) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const transplantCase = await prisma.transplantCase.findFirst({
    where: {
      id,
      organizationId, // Multi-tenancy filter
      deletedAt: null, // Solo registros activos
    },
    include: {
      patient: {
        include: {
          mortality: true,
        },
      },
      team: { include: { clinician: true } },
      linesMonitoring: {
        include: {
          vascularLines: true,
        },
      },
      postOp: true,
    },
  });

  if (!transplantCase) throw new NotFoundError('Caso');
  return transplantCase;
};

/**
 * Crear caso con organizationId
 * @param {object} data - Datos del caso
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría {userId, userEmail, req}
 */
const createCase = async (data, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Crear el caso de trasplante y actualizar el flag del paciente en una transacción
  const [transplantCase] = await prisma.$transaction([
    prisma.transplantCase.create({
      data: {
        ...data,
        organizationId, // Multi-tenancy
      },
    }),
    prisma.patient.update({
      where: { id: data.patientId },
      data: { transplanted: true },
    }),
  ]);

  // Audit log
  await auditService.logCreate({
    organizationId,
    tableName: 'transplant_cases',
    recordId: transplantCase.id,
    newValues: transplantCase,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return transplantCase;
};

/**
 * Actualizar caso verificando organización
 * @param {string} id - ID del caso
 * @param {object} data - Datos a actualizar
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría
 */
const updateCase = async (id, data, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Verificar que el caso pertenece a la organización
  const oldCase = await prisma.transplantCase.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!oldCase) {
    throw new NotFoundError('Caso');
  }

  const updatedCase = await prisma.transplantCase.update({ where: { id }, data });

  // Audit log
  await auditService.logUpdate({
    organizationId,
    tableName: 'transplant_cases',
    recordId: id,
    oldValues: oldCase,
    newValues: updatedCase,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return updatedCase;
};

/**
 * Eliminar caso verificando organización (soft delete)
 * @param {string} id - ID del caso
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría
 */
const deleteCase = async (id, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Obtener el caso verificando organización
  const caseToDelete = await prisma.transplantCase.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!caseToDelete) {
    throw new NotFoundError('Caso');
  }

  // Soft delete - marcar con deletedAt
  const deleted = await prisma.transplantCase.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Verificar si el paciente tiene otros casos activos
  const remainingCases = await prisma.transplantCase.count({
    where: {
      patientId: caseToDelete.patientId,
      deletedAt: null,
    },
  });

  // Si no tiene más casos activos, actualizar el flag
  if (remainingCases === 0) {
    await prisma.patient.update({
      where: { id: caseToDelete.patientId },
      data: { transplanted: false },
    });
  }

  // Audit log
  await auditService.logSoftDelete({
    organizationId,
    tableName: 'transplant_cases',
    recordId: id,
    oldValues: caseToDelete,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return deleted;
};

/**
 * Restaurar caso eliminado (revertir soft delete)
 * @param {string} id - ID del caso
 * @param {string} organizationId - ID de la organización
 * @param {object} [auditContext] - Contexto para auditoría
 */
const restoreCase = async (id, organizationId, auditContext = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  // Buscar caso eliminado
  const deletedCase = await prisma.transplantCase.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: { not: null },
    },
  });

  if (!deletedCase) {
    throw new NotFoundError('Caso eliminado');
  }

  // Restaurar - quitar deletedAt
  const restoredCase = await prisma.transplantCase.update({
    where: { id },
    data: { deletedAt: null },
  });

  // Actualizar flag del paciente
  await prisma.patient.update({
    where: { id: deletedCase.patientId },
    data: { transplanted: true },
  });

  // Audit log
  await auditService.logRestore({
    organizationId,
    tableName: 'transplant_cases',
    recordId: id,
    oldValues: deletedCase,
    userId: auditContext.userId,
    userEmail: auditContext.userEmail,
    req: auditContext.req,
  });

  return restoredCase;
};

/**
 * Obtener casos eliminados (para recuperación)
 */
const getDeletedCases = async (organizationId, { page = 1, limit = 20 } = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required for multi-tenancy');
  }

  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    deletedAt: { not: null },
  };

  const [cases, total] = await Promise.all([
    prisma.transplantCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true } },
      },
    }),
    prisma.transplantCase.count({ where }),
  ]);

  return {
    data: cases,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getCaseTeam = async (caseId) => {
  const teamAssignments = await prisma.teamAssignment.findMany({
    where: { caseId },
    include: {
      clinician: {
        select: {
          id: true,
          name: true,
          specialty: true,
          email: true,
        },
      },
    },
    orderBy: { role: 'asc' },
  });

  return teamAssignments;
};

const getCasePreop = async (caseId) => {
  const preopEvaluation = await prisma.preopEvaluation.findFirst({
    where: { caseId },
    orderBy: { evaluationDate: 'desc' },
  });

  if (!preopEvaluation) {
    throw new NotFoundError('Evaluación preoperatoria');
  }

  return preopEvaluation;
};

const addTeamMember = async (caseId, data) => {
  // Verificar que el caso existe
  const caseExists = await prisma.transplantCase.findUnique({
    where: { id: caseId },
  });

  if (!caseExists) {
    throw new NotFoundError('Caso');
  }

  // Verificar que el clínico existe
  const clinicianExists = await prisma.clinician.findUnique({
    where: { id: data.clinicianId },
  });

  if (!clinicianExists) {
    throw new NotFoundError('Clínico');
  }

  // Crear la asignación del equipo
  const teamMember = await prisma.teamAssignment.create({
    data: {
      caseId,
      clinicianId: data.clinicianId,
      role: data.role,
    },
    include: {
      clinician: {
        select: {
          id: true,
          name: true,
          specialty: true,
          email: true,
        },
      },
    },
  });

  return teamMember;
};

const removeTeamMember = async (teamAssignmentId) => {
  await prisma.teamAssignment.delete({
    where: { id: teamAssignmentId },
  });
};

const getCaseIntraop = async (caseId) => {
  const intraopRecords = await prisma.intraopRecord.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  return intraopRecords;
};

const getCaseFluids = async (caseId) => {
  const fluidsRecords = await prisma.fluidsAndBlood.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  return fluidsRecords;
};

module.exports = {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  restoreCase,
  getDeletedCases,
  getCaseTeam,
  getCasePreop,
  getCaseIntraop,
  getCaseFluids,
  addTeamMember,
  removeTeamMember,
};
