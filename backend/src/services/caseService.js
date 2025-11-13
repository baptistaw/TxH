// src/services/caseService.js - Lógica de negocio para casos de trasplante
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

const getAllCases = async ({ page = 1, limit = 20, patientId, startDate, endDate }) => {
  const skip = (page - 1) * limit;
  const where = {
    ...(patientId && { patientId }),
    ...(startDate && endDate && {
      startAt: { gte: startDate, lte: endDate },
    }),
  };

  const [cases, total] = await Promise.all([
    prisma.transplantCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: 'desc' },
      include: { patient: { select: { id: true, name: true } } },
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
      patient: true,
      team: { include: { clinician: true } },
      postOp: true,
      mortality: true,
    },
  });

  if (!transplantCase) throw new NotFoundError('Caso');
  return transplantCase;
};

const createCase = async (data) => {
  return await prisma.transplantCase.create({ data });
};

const updateCase = async (id, data) => {
  return await prisma.transplantCase.update({ where: { id }, data });
};

const deleteCase = async (id) => {
  return await prisma.transplantCase.delete({ where: { id } });
};

module.exports = { getAllCases, getCaseById, createCase, updateCase, deleteCase };
