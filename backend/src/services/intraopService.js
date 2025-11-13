// src/services/intraopService.js - Servicio para registros intraoperatorios

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError } = require('../middlewares/errorHandler');

/**
 * Calcular PAm (Presión Arterial Media) automáticamente
 * PAm = (PAS + 2*PAD) / 3
 */
function calculateMAP(sys, dia) {
  if (!sys || !dia) return null;
  return Math.round((sys + 2 * dia) / 3);
}

/**
 * Aplicar cálculos automáticos a los datos
 */
function applyCalculations(data) {
  const result = { ...data };

  // Calcular PAm si no está presente pero hay PAS y PAD
  if (!result.map && result.sys && result.dia) {
    result.map = calculateMAP(result.sys, result.dia);
  }

  return result;
}

/**
 * Listar registros intraoperatorios de un caso
 */
async function getIntraopRecords(caseId, filters = {}) {
  const { phase } = filters;

  const where = { caseId };
  if (phase) {
    where.phase = phase;
  }

  const records = await prisma.intraopRecord.findMany({
    where,
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
    include: {
      fluids: true,
      drugs: true,
      monitoring: true,
    },
  });

  return records;
}

/**
 * Obtener registro por ID
 */
async function getIntraopById(id) {
  const record = await prisma.intraopRecord.findUnique({
    where: { id },
    include: {
      case: {
        include: {
          patient: true,
        },
      },
      fluids: true,
      drugs: true,
      monitoring: true,
    },
  });

  if (!record) {
    throw new NotFoundError('Registro intraoperatorio no encontrado');
  }

  return record;
}

/**
 * Crear registro intraoperatorio
 */
async function createIntraop(data) {
  // Verificar que el caso existe
  const caseExists = await prisma.transplantCase.findUnique({
    where: { id: data.caseId },
  });

  if (!caseExists) {
    throw new NotFoundError('Caso no encontrado');
  }

  // Aplicar cálculos automáticos
  const calculatedData = applyCalculations(data);

  // Crear registro
  const record = await prisma.intraopRecord.create({
    data: {
      caseId: calculatedData.caseId,
      phase: calculatedData.phase,
      timestamp: calculatedData.timestamp,
      heartRate: calculatedData.heartRate,
      sys: calculatedData.sys,
      dia: calculatedData.dia,
      map: calculatedData.map,
      cvp: calculatedData.cvp,
      peep: calculatedData.peep,
      fio2: calculatedData.fio2,
      vt: calculatedData.vt,
    },
    include: {
      fluids: true,
      drugs: true,
      monitoring: true,
    },
  });

  return record;
}

/**
 * Actualizar registro intraoperatorio
 */
async function updateIntraop(id, data) {
  // Verificar que existe
  const exists = await prisma.intraopRecord.findUnique({
    where: { id },
  });

  if (!exists) {
    throw new NotFoundError('Registro no encontrado');
  }

  // Aplicar cálculos automáticos
  const calculatedData = applyCalculations(data);

  // Actualizar
  const updated = await prisma.intraopRecord.update({
    where: { id },
    data: {
      phase: calculatedData.phase,
      timestamp: calculatedData.timestamp,
      heartRate: calculatedData.heartRate,
      sys: calculatedData.sys,
      dia: calculatedData.dia,
      map: calculatedData.map,
      cvp: calculatedData.cvp,
      peep: calculatedData.peep,
      fio2: calculatedData.fio2,
      vt: calculatedData.vt,
    },
    include: {
      fluids: true,
      drugs: true,
      monitoring: true,
    },
  });

  return updated;
}

/**
 * Eliminar registro intraoperatorio
 */
async function deleteIntraop(id) {
  // Verificar que existe
  const exists = await prisma.intraopRecord.findUnique({
    where: { id },
  });

  if (!exists) {
    throw new NotFoundError('Registro no encontrado');
  }

  // Eliminar (cascade eliminará fluids, drugs, monitoring)
  await prisma.intraopRecord.delete({
    where: { id },
  });

  return { message: 'Registro eliminado exitosamente' };
}

/**
 * Duplicar última fila de una fase
 */
async function duplicateLastRecord(caseId, phase) {
  // Buscar último registro de la fase
  const lastRecord = await prisma.intraopRecord.findFirst({
    where: { caseId, phase },
    orderBy: { timestamp: 'desc' },
  });

  if (!lastRecord) {
    throw new NotFoundError('No hay registros previos para duplicar');
  }

  // Crear nuevo registro basado en el último
  const newTimestamp = new Date();

  const newRecord = await prisma.intraopRecord.create({
    data: {
      caseId: lastRecord.caseId,
      phase: lastRecord.phase,
      timestamp: newTimestamp,
      heartRate: lastRecord.heartRate,
      sys: lastRecord.sys,
      dia: lastRecord.dia,
      map: lastRecord.map,
      cvp: lastRecord.cvp,
      peep: lastRecord.peep,
      fio2: lastRecord.fio2,
      vt: lastRecord.vt,
    },
    include: {
      fluids: true,
      drugs: true,
      monitoring: true,
    },
  });

  return newRecord;
}

/**
 * Obtener estadísticas de una fase
 */
async function getPhaseStats(caseId, phase) {
  const records = await prisma.intraopRecord.findMany({
    where: { caseId, phase },
  });

  if (records.length === 0) {
    return null;
  }

  // Calcular promedios
  const stats = {
    count: records.length,
    avgHeartRate: null,
    avgMAP: null,
    avgCVP: null,
  };

  const validHR = records.filter((r) => r.heartRate).map((r) => r.heartRate);
  const validMAP = records.filter((r) => r.map).map((r) => r.map);
  const validCVP = records.filter((r) => r.cvp).map((r) => r.cvp);

  if (validHR.length > 0) {
    stats.avgHeartRate = Math.round(
      validHR.reduce((a, b) => a + b, 0) / validHR.length
    );
  }

  if (validMAP.length > 0) {
    stats.avgMAP = Math.round(
      validMAP.reduce((a, b) => a + b, 0) / validMAP.length
    );
  }

  if (validCVP.length > 0) {
    stats.avgCVP = Math.round(
      validCVP.reduce((a, b) => a + b, 0) / validCVP.length
    );
  }

  return stats;
}

module.exports = {
  getIntraopRecords,
  getIntraopById,
  createIntraop,
  updateIntraop,
  deleteIntraop,
  duplicateLastRecord,
  getPhaseStats,
  calculateMAP,
};
