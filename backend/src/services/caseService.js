// src/services/caseService.js - Lógica de negocio para casos de trasplante
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

const getAllCases = async ({
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
  const skip = (page - 1) * limit;
  const where = {
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

const getCaseById = async (id) => {
  const transplantCase = await prisma.transplantCase.findUnique({
    where: { id },
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

const createCase = async (data) => {
  // Crear el caso de trasplante y actualizar el flag del paciente en una transacción
  const [transplantCase] = await prisma.$transaction([
    prisma.transplantCase.create({ data }),
    prisma.patient.update({
      where: { id: data.patientId },
      data: { transplanted: true },
    }),
  ]);
  return transplantCase;
};

const updateCase = async (id, data) => {
  return await prisma.transplantCase.update({ where: { id }, data });
};

const deleteCase = async (id) => {
  // Obtener el caso para conocer el patientId antes de eliminar
  const caseToDelete = await prisma.transplantCase.findUnique({
    where: { id },
    select: { patientId: true },
  });

  if (!caseToDelete) {
    throw new NotFoundError('Caso');
  }

  // Eliminar el caso
  const deleted = await prisma.transplantCase.delete({ where: { id } });

  // Verificar si el paciente tiene otros casos
  const remainingCases = await prisma.transplantCase.count({
    where: { patientId: caseToDelete.patientId },
  });

  // Si no tiene más casos, actualizar el flag
  if (remainingCases === 0) {
    await prisma.patient.update({
      where: { id: caseToDelete.patientId },
      data: { transplanted: false },
    });
  }

  return deleted;
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
  getCaseTeam,
  getCasePreop,
  getCaseIntraop,
  getCaseFluids,
  addTeamMember,
  removeTeamMember,
};
