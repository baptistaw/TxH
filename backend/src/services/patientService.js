// src/services/patientService.js - Lógica de negocio para pacientes
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

/**
 * Obtener todos los pacientes con paginación
 */
const getAllPatients = async ({ page = 1, limit = 20, search }) => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { id: { contains: search } },
          { name: { contains: search, mode: 'insensitive' } },
          { fnr: { contains: search } },
        ],
      }
    : {};

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
 * Obtener paciente por ID (CI)
 */
const getPatientById = async (id) => {
  const patient = await prisma.patient.findUnique({
    where: { id },
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
 * Crear nuevo paciente
 */
const createPatient = async (data) => {
  return await prisma.patient.create({
    data,
  });
};

/**
 * Actualizar paciente
 */
const updatePatient = async (id, data) => {
  const patient = await prisma.patient.findUnique({ where: { id } });

  if (!patient) {
    throw new NotFoundError('Paciente');
  }

  return await prisma.patient.update({
    where: { id },
    data,
  });
};

/**
 * Eliminar paciente (soft delete)
 */
const deletePatient = async (id) => {
  const patient = await prisma.patient.findUnique({ where: { id } });

  if (!patient) {
    throw new NotFoundError('Paciente');
  }

  // TODO: Implementar soft delete con campo deletedAt
  return await prisma.patient.delete({
    where: { id },
  });
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
