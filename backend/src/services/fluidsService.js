// src/services/fluidsService.js - Servicio para gestión de fluidos y hemoderivados

const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

/**
 * Calcular balance neto de fluidos
 * Balance = (Cristaloides + Coloides + Hemoderivados) - (Pérdidas)
 */
function calculateBalance(data) {
  // Reposición
  const crystalloids = (data.plasmalyte || 0) + (data.ringer || 0) + (data.saline || 0) + (data.dextrose || 0);
  const colloids = (data.colloids || 0) + (data.albumin || 0);

  // Hemoderivados en ml (asumiendo 250ml por unidad de GR y plasma)
  const bloodProducts =
    ((data.redBloodCells || 0) * 250) +
    ((data.plasma || 0) * 250) +
    ((data.platelets || 0) * 250) +
    (data.cryoprecip || 0) +
    (data.cellSaver || 0) +
    ((data.fibrinogen || 0) * 50) + // 1g de fibrinógeno en 50ml aprox
    ((data.pcc || 0) * 20) + // CCP aprox 20ml por 1000 unidades
    ((data.factorVII || 0) * 2); // Factor VII aprox 2ml por mg

  const totalInput = crystalloids + colloids + bloodProducts;

  // Pérdidas
  const totalLoss =
    (data.insensibleLoss || 0) +
    (data.ascites || 0) +
    (data.suction || 0) +
    (data.gauze || 0) +
    (data.urine || 0);

  return totalInput - totalLoss;
}

/**
 * Listar registros de fluidos de un caso
 */
async function getFluidRecords(caseId, filters = {}) {
  const { phase } = filters;

  const where = { caseId };
  if (phase) {
    where.phase = phase;
  }

  const records = await prisma.fluidsAndBlood.findMany({
    where,
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  return records;
}

/**
 * Obtener registro por ID
 */
async function getFluidById(id) {
  const record = await prisma.fluidsAndBlood.findUnique({
    where: { id },
    include: {
      case: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!record) {
    throw new NotFoundError('Registro de fluidos no encontrado');
  }

  return record;
}

/**
 * Crear registro de fluidos
 */
async function createFluid(data) {
  // Verificar que el caso existe
  const caseExists = await prisma.transplantCase.findUnique({
    where: { id: data.caseId },
  });

  if (!caseExists) {
    throw new NotFoundError('Caso no encontrado');
  }

  // Calcular balance automáticamente
  const balance = calculateBalance(data);

  // Crear registro
  const record = await prisma.fluidsAndBlood.create({
    data: {
      caseId: data.caseId,
      phase: data.phase,
      timestamp: data.timestamp,
      plasmalyte: data.plasmalyte || 0,
      ringer: data.ringer || 0,
      saline: data.saline || 0,
      dextrose: data.dextrose || 0,
      colloids: data.colloids || 0,
      albumin: data.albumin || 0,
      redBloodCells: data.redBloodCells || 0,
      plasma: data.plasma || 0,
      platelets: data.platelets || 0,
      cryoprecip: data.cryoprecip || 0,
      cellSaver: data.cellSaver || 0,
      fibrinogen: data.fibrinogen || 0,
      pcc: data.pcc || 0,
      factorVII: data.factorVII || 0,
      otherFluids: data.otherFluids,
      insensibleLoss: data.insensibleLoss || 0,
      ascites: data.ascites || 0,
      suction: data.suction || 0,
      gauze: data.gauze || 0,
      urine: data.urine || 0,
      balance: balance,
    },
  });

  return record;
}

/**
 * Actualizar registro de fluidos
 */
async function updateFluid(id, data) {
  // Verificar que existe
  const exists = await prisma.fluidsAndBlood.findUnique({
    where: { id },
  });

  if (!exists) {
    throw new NotFoundError('Registro no encontrado');
  }

  // Calcular balance automáticamente
  const balance = calculateBalance(data);

  // Actualizar
  const updated = await prisma.fluidsAndBlood.update({
    where: { id },
    data: {
      phase: data.phase,
      timestamp: data.timestamp,
      plasmalyte: data.plasmalyte !== undefined ? data.plasmalyte : exists.plasmalyte,
      ringer: data.ringer !== undefined ? data.ringer : exists.ringer,
      saline: data.saline !== undefined ? data.saline : exists.saline,
      dextrose: data.dextrose !== undefined ? data.dextrose : exists.dextrose,
      colloids: data.colloids !== undefined ? data.colloids : exists.colloids,
      albumin: data.albumin !== undefined ? data.albumin : exists.albumin,
      redBloodCells: data.redBloodCells !== undefined ? data.redBloodCells : exists.redBloodCells,
      plasma: data.plasma !== undefined ? data.plasma : exists.plasma,
      platelets: data.platelets !== undefined ? data.platelets : exists.platelets,
      cryoprecip: data.cryoprecip !== undefined ? data.cryoprecip : exists.cryoprecip,
      cellSaver: data.cellSaver !== undefined ? data.cellSaver : exists.cellSaver,
      fibrinogen: data.fibrinogen !== undefined ? data.fibrinogen : exists.fibrinogen,
      pcc: data.pcc !== undefined ? data.pcc : exists.pcc,
      factorVII: data.factorVII !== undefined ? data.factorVII : exists.factorVII,
      otherFluids: data.otherFluids !== undefined ? data.otherFluids : exists.otherFluids,
      insensibleLoss: data.insensibleLoss !== undefined ? data.insensibleLoss : exists.insensibleLoss,
      ascites: data.ascites !== undefined ? data.ascites : exists.ascites,
      suction: data.suction !== undefined ? data.suction : exists.suction,
      gauze: data.gauze !== undefined ? data.gauze : exists.gauze,
      urine: data.urine !== undefined ? data.urine : exists.urine,
      balance: balance,
    },
  });

  return updated;
}

/**
 * Eliminar registro de fluidos
 */
async function deleteFluid(id) {
  // Verificar que existe
  const exists = await prisma.fluidsAndBlood.findUnique({
    where: { id },
  });

  if (!exists) {
    throw new NotFoundError('Registro no encontrado');
  }

  // Eliminar
  await prisma.fluidsAndBlood.delete({
    where: { id },
  });

  return { message: 'Registro eliminado exitosamente' };
}

/**
 * Obtener totales por fase
 */
async function getFluidTotalsByPhase(caseId, phase) {
  const records = await prisma.fluidsAndBlood.findMany({
    where: { caseId, phase },
  });

  if (records.length === 0) {
    return null;
  }

  // Sumar todos los valores
  const totals = records.reduce(
    (acc, record) => {
      // Cristaloides
      acc.plasmalyte += record.plasmalyte;
      acc.ringer += record.ringer;
      acc.saline += record.saline;
      acc.dextrose += record.dextrose;

      // Coloides
      acc.colloids += record.colloids;
      acc.albumin += record.albumin;

      // Hemoderivados
      acc.redBloodCells += record.redBloodCells;
      acc.plasma += record.plasma;
      acc.platelets += record.platelets;
      acc.cryoprecip += record.cryoprecip;
      acc.cellSaver += record.cellSaver;
      acc.fibrinogen += record.fibrinogen;
      acc.pcc += record.pcc;
      acc.factorVII += record.factorVII;

      // Pérdidas
      acc.insensibleLoss += record.insensibleLoss;
      acc.ascites += record.ascites;
      acc.suction += record.suction;
      acc.gauze += record.gauze;
      acc.urine += record.urine;

      // Balance
      acc.balance += record.balance || 0;

      return acc;
    },
    {
      plasmalyte: 0,
      ringer: 0,
      saline: 0,
      dextrose: 0,
      colloids: 0,
      albumin: 0,
      redBloodCells: 0,
      plasma: 0,
      platelets: 0,
      cryoprecip: 0,
      cellSaver: 0,
      fibrinogen: 0,
      pcc: 0,
      factorVII: 0,
      insensibleLoss: 0,
      ascites: 0,
      suction: 0,
      gauze: 0,
      urine: 0,
      balance: 0,
    }
  );

  return totals;
}

module.exports = {
  getFluidRecords,
  getFluidById,
  createFluid,
  updateFluid,
  deleteFluid,
  getFluidTotalsByPhase,
  calculateBalance,
};
