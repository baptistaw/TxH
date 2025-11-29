// src/services/linesMonitoringService.js - Lógica de negocio para líneas y monitoreo
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

const getLinesMonitoring = async (caseId) => {
  const linesMonitoring = await prisma.linesAndMonitoring.findUnique({
    where: { caseId },
    include: {
      vascularLines: true,
    },
  });

  return linesMonitoring;
};

const createLinesMonitoring = async (caseId, data) => {
  // Verificar que el caso existe
  const caseExists = await prisma.transplantCase.findUnique({
    where: { id: caseId },
  });

  if (!caseExists) {
    throw new NotFoundError('Caso');
  }

  // Verificar si ya existe un registro de líneas para este caso
  const existing = await prisma.linesAndMonitoring.findUnique({
    where: { caseId },
  });

  if (existing) {
    throw new Error('Ya existe un registro de líneas y monitoreo para este caso');
  }

  const linesMonitoring = await prisma.linesAndMonitoring.create({
    data: {
      caseId,
      ...data,
    },
    include: {
      vascularLines: true,
    },
  });

  return linesMonitoring;
};

const updateLinesMonitoring = async (caseId, data) => {
  // Verificar que existe el registro
  const existing = await prisma.linesAndMonitoring.findUnique({
    where: { caseId },
  });

  if (!existing) {
    // Si no existe, crear uno nuevo
    return createLinesMonitoring(caseId, data);
  }

  // Actualizar
  const linesMonitoring = await prisma.linesAndMonitoring.update({
    where: { caseId },
    data,
    include: {
      vascularLines: true,
    },
  });

  return linesMonitoring;
};

const deleteLinesMonitoring = async (caseId) => {
  await prisma.linesAndMonitoring.delete({
    where: { caseId },
  });
};

module.exports = {
  getLinesMonitoring,
  createLinesMonitoring,
  updateLinesMonitoring,
  deleteLinesMonitoring,
};
