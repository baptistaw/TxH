// src/services/intraopService.js - Servicio para registros intraoperatorios

const prisma = require('../lib/prisma');
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
  if (!result.pam && result.pas && result.pad) {
    result.pam = calculateMAP(result.pas, result.pad);
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

  // Crear registro con todos los campos
  const record = await prisma.intraopRecord.create({
    data: {
      caseId: calculatedData.caseId,
      phase: calculatedData.phase,
      timestamp: calculatedData.timestamp,

      // Ventilación
      ventMode: calculatedData.ventMode,
      fio2: calculatedData.fio2,
      tidalVolume: calculatedData.tidalVolume,
      respRate: calculatedData.respRate,
      peep: calculatedData.peep,
      peakPressure: calculatedData.peakPressure,

      // Hemodinamia básica
      heartRate: calculatedData.heartRate,
      satO2: calculatedData.satO2,
      pas: calculatedData.pas,
      pad: calculatedData.pad,
      pam: calculatedData.pam,
      cvp: calculatedData.cvp,
      etCO2: calculatedData.etCO2,
      temp: calculatedData.temp,

      // Hemodinamia avanzada
      paps: calculatedData.paps,
      papd: calculatedData.papd,
      papm: calculatedData.papm,
      pcwp: calculatedData.pcwp,
      cardiacOutput: calculatedData.cardiacOutput,

      // Monitoreo avanzado
      bis: calculatedData.bis,
      icp: calculatedData.icp,
      svO2: calculatedData.svO2,

      // Laboratorios - Hematología
      hb: calculatedData.hb,
      hto: calculatedData.hto,
      platelets: calculatedData.platelets,

      // Laboratorios - Coagulación
      pt: calculatedData.pt,
      inr: calculatedData.inr,
      fibrinogen: calculatedData.fibrinogen,
      aptt: calculatedData.aptt,

      // Laboratorios - Electrolitos
      sodium: calculatedData.sodium,
      potassium: calculatedData.potassium,
      ionicCalcium: calculatedData.ionicCalcium,
      magnesium: calculatedData.magnesium,
      chloride: calculatedData.chloride,
      phosphorus: calculatedData.phosphorus,

      // Laboratorios - Gases arteriales
      pH: calculatedData.pH,
      paO2: calculatedData.paO2,
      paCO2: calculatedData.paCO2,
      hco3: calculatedData.hco3,
      baseExcess: calculatedData.baseExcess,

      // Laboratorios - Gases venosos
      pvpH: calculatedData.pvpH,
      pvO2: calculatedData.pvO2,
      pvCO2: calculatedData.pvCO2,

      // Laboratorios - Función renal
      azotemia: calculatedData.azotemia,
      creatinine: calculatedData.creatinine,

      // Laboratorios - Función hepática
      sgot: calculatedData.sgot,
      sgpt: calculatedData.sgpt,
      totalBili: calculatedData.totalBili,
      directBili: calculatedData.directBili,
      albumin: calculatedData.albumin,

      // Laboratorios - Metabólicos
      glucose: calculatedData.glucose,
      lactate: calculatedData.lactate,
      proteins: calculatedData.proteins,

      // ETE (Ecocardiograma Transesofágico)
      eteRightVentricle: calculatedData.eteRightVentricle,
      eteTapse: calculatedData.eteTapse,
      eteLeftVentricle: calculatedData.eteLeftVentricle,
      eteChamberDilation: calculatedData.eteChamberDilation,
      etePsap: calculatedData.etePsap,
      eteThrombus: calculatedData.eteThrombus,
      etePericardial: calculatedData.etePericardial,
      eteVolumeStatus: calculatedData.eteVolumeStatus,
      eteObservations: calculatedData.eteObservations,

      // ROTEM
      rotemCtExtem: calculatedData.rotemCtExtem,
      rotemA5Extem: calculatedData.rotemA5Extem,
      rotemA5Fibtem: calculatedData.rotemA5Fibtem,
      rotemCli30: calculatedData.rotemCli30,
      rotemMcfExtem: calculatedData.rotemMcfExtem,
      rotemMcfFibtem: calculatedData.rotemMcfFibtem,
      rotemCtIntem: calculatedData.rotemCtIntem,
      rotemCtHeptem: calculatedData.rotemCtHeptem,

      // Fármacos
      inhalAgent: calculatedData.inhalAgent,
      opioidBolus: calculatedData.opioidBolus,
      opioidInfusion: calculatedData.opioidInfusion,
      hypnoticBolus: calculatedData.hypnoticBolus,
      hypnoticInfusion: calculatedData.hypnoticInfusion,
      relaxantBolus: calculatedData.relaxantBolus,
      relaxantInfusion: calculatedData.relaxantInfusion,
      lidocaineBolus: calculatedData.lidocaineBolus,
      lidocaineInfusion: calculatedData.lidocaineInfusion,
      adrenalineBolus: calculatedData.adrenalineBolus,
      adrenalineInfusion: calculatedData.adrenalineInfusion,
      dobutamine: calculatedData.dobutamine,
      dopamine: calculatedData.dopamine,
      noradrenaline: calculatedData.noradrenaline,
      phenylephrine: calculatedData.phenylephrine,
      insulinBolus: calculatedData.insulinBolus,
      insulinInfusion: calculatedData.insulinInfusion,
      furosemide: calculatedData.furosemide,
      tranexamicBolus: calculatedData.tranexamicBolus,
      tranexamicInfusion: calculatedData.tranexamicInfusion,
      calciumGluconBolus: calculatedData.calciumGluconBolus,
      calciumGluconInfusion: calculatedData.calciumGluconInfusion,
      sodiumBicarb: calculatedData.sodiumBicarb,
      antibiotics: calculatedData.antibiotics,
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

  // Actualizar con todos los campos
  const updated = await prisma.intraopRecord.update({
    where: { id },
    data: {
      phase: calculatedData.phase,
      timestamp: calculatedData.timestamp,

      // Ventilación
      ventMode: calculatedData.ventMode,
      fio2: calculatedData.fio2,
      tidalVolume: calculatedData.tidalVolume,
      respRate: calculatedData.respRate,
      peep: calculatedData.peep,
      peakPressure: calculatedData.peakPressure,

      // Hemodinamia básica
      heartRate: calculatedData.heartRate,
      satO2: calculatedData.satO2,
      pas: calculatedData.pas,
      pad: calculatedData.pad,
      pam: calculatedData.pam,
      cvp: calculatedData.cvp,
      etCO2: calculatedData.etCO2,
      temp: calculatedData.temp,

      // Hemodinamia avanzada
      paps: calculatedData.paps,
      papd: calculatedData.papd,
      papm: calculatedData.papm,
      pcwp: calculatedData.pcwp,
      cardiacOutput: calculatedData.cardiacOutput,

      // Monitoreo avanzado
      bis: calculatedData.bis,
      icp: calculatedData.icp,
      svO2: calculatedData.svO2,

      // Laboratorios - Hematología
      hb: calculatedData.hb,
      hto: calculatedData.hto,
      platelets: calculatedData.platelets,

      // Laboratorios - Coagulación
      pt: calculatedData.pt,
      inr: calculatedData.inr,
      fibrinogen: calculatedData.fibrinogen,
      aptt: calculatedData.aptt,

      // Laboratorios - Electrolitos
      sodium: calculatedData.sodium,
      potassium: calculatedData.potassium,
      ionicCalcium: calculatedData.ionicCalcium,
      magnesium: calculatedData.magnesium,
      chloride: calculatedData.chloride,
      phosphorus: calculatedData.phosphorus,

      // Laboratorios - Gases arteriales
      pH: calculatedData.pH,
      paO2: calculatedData.paO2,
      paCO2: calculatedData.paCO2,
      hco3: calculatedData.hco3,
      baseExcess: calculatedData.baseExcess,

      // Laboratorios - Gases venosos
      pvpH: calculatedData.pvpH,
      pvO2: calculatedData.pvO2,
      pvCO2: calculatedData.pvCO2,

      // Laboratorios - Función renal
      azotemia: calculatedData.azotemia,
      creatinine: calculatedData.creatinine,

      // Laboratorios - Función hepática
      sgot: calculatedData.sgot,
      sgpt: calculatedData.sgpt,
      totalBili: calculatedData.totalBili,
      directBili: calculatedData.directBili,
      albumin: calculatedData.albumin,

      // Laboratorios - Metabólicos
      glucose: calculatedData.glucose,
      lactate: calculatedData.lactate,
      proteins: calculatedData.proteins,

      // ETE (Ecocardiograma Transesofágico)
      eteRightVentricle: calculatedData.eteRightVentricle,
      eteTapse: calculatedData.eteTapse,
      eteLeftVentricle: calculatedData.eteLeftVentricle,
      eteChamberDilation: calculatedData.eteChamberDilation,
      etePsap: calculatedData.etePsap,
      eteThrombus: calculatedData.eteThrombus,
      etePericardial: calculatedData.etePericardial,
      eteVolumeStatus: calculatedData.eteVolumeStatus,
      eteObservations: calculatedData.eteObservations,

      // ROTEM
      rotemCtExtem: calculatedData.rotemCtExtem,
      rotemA5Extem: calculatedData.rotemA5Extem,
      rotemA5Fibtem: calculatedData.rotemA5Fibtem,
      rotemCli30: calculatedData.rotemCli30,
      rotemMcfExtem: calculatedData.rotemMcfExtem,
      rotemMcfFibtem: calculatedData.rotemMcfFibtem,
      rotemCtIntem: calculatedData.rotemCtIntem,
      rotemCtHeptem: calculatedData.rotemCtHeptem,

      // Fármacos
      inhalAgent: calculatedData.inhalAgent,
      opioidBolus: calculatedData.opioidBolus,
      opioidInfusion: calculatedData.opioidInfusion,
      hypnoticBolus: calculatedData.hypnoticBolus,
      hypnoticInfusion: calculatedData.hypnoticInfusion,
      relaxantBolus: calculatedData.relaxantBolus,
      relaxantInfusion: calculatedData.relaxantInfusion,
      lidocaineBolus: calculatedData.lidocaineBolus,
      lidocaineInfusion: calculatedData.lidocaineInfusion,
      adrenalineBolus: calculatedData.adrenalineBolus,
      adrenalineInfusion: calculatedData.adrenalineInfusion,
      dobutamine: calculatedData.dobutamine,
      dopamine: calculatedData.dopamine,
      noradrenaline: calculatedData.noradrenaline,
      phenylephrine: calculatedData.phenylephrine,
      insulinBolus: calculatedData.insulinBolus,
      insulinInfusion: calculatedData.insulinInfusion,
      furosemide: calculatedData.furosemide,
      tranexamicBolus: calculatedData.tranexamicBolus,
      tranexamicInfusion: calculatedData.tranexamicInfusion,
      calciumGluconBolus: calculatedData.calciumGluconBolus,
      calciumGluconInfusion: calculatedData.calciumGluconInfusion,
      sodiumBicarb: calculatedData.sodiumBicarb,
      antibiotics: calculatedData.antibiotics,
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

  // Crear nuevo registro basado en el último (con todos los campos)
  const newTimestamp = new Date();

  const newRecord = await prisma.intraopRecord.create({
    data: {
      caseId: lastRecord.caseId,
      phase: lastRecord.phase,
      timestamp: newTimestamp,

      // Ventilación
      ventMode: lastRecord.ventMode,
      fio2: lastRecord.fio2,
      tidalVolume: lastRecord.tidalVolume,
      respRate: lastRecord.respRate,
      peep: lastRecord.peep,
      peakPressure: lastRecord.peakPressure,

      // Hemodinamia básica
      heartRate: lastRecord.heartRate,
      satO2: lastRecord.satO2,
      pas: lastRecord.pas,
      pad: lastRecord.pad,
      pam: lastRecord.pam,
      cvp: lastRecord.cvp,
      etCO2: lastRecord.etCO2,
      temp: lastRecord.temp,

      // Hemodinamia avanzada
      paps: lastRecord.paps,
      papd: lastRecord.papd,
      papm: lastRecord.papm,
      pcwp: lastRecord.pcwp,
      cardiacOutput: lastRecord.cardiacOutput,

      // Monitoreo avanzado
      bis: lastRecord.bis,
      icp: lastRecord.icp,
      svO2: lastRecord.svO2,

      // Laboratorios - Hematología
      hb: lastRecord.hb,
      hto: lastRecord.hto,

      // Laboratorios - Electrolitos
      sodium: lastRecord.sodium,
      potassium: lastRecord.potassium,
      ionicCalcium: lastRecord.ionicCalcium,
      magnesium: lastRecord.magnesium,

      // Laboratorios - Gases arteriales
      pH: lastRecord.pH,
      paO2: lastRecord.paO2,
      paCO2: lastRecord.paCO2,

      // Laboratorios - Gases venosos
      pvpH: lastRecord.pvpH,
      pvO2: lastRecord.pvO2,
      pvCO2: lastRecord.pvCO2,

      // Laboratorios - Metabólicos
      glucose: lastRecord.glucose,
      lactate: lastRecord.lactate,
      proteins: lastRecord.proteins,
      creatinine: lastRecord.creatinine,

      // ETE (Ecocardiograma Transesofágico)
      eteRightVentricle: lastRecord.eteRightVentricle,
      eteTapse: lastRecord.eteTapse,
      eteLeftVentricle: lastRecord.eteLeftVentricle,
      eteChamberDilation: lastRecord.eteChamberDilation,
      etePsap: lastRecord.etePsap,
      eteThrombus: lastRecord.eteThrombus,
      etePericardial: lastRecord.etePericardial,
      eteVolumeStatus: lastRecord.eteVolumeStatus,
      eteObservations: lastRecord.eteObservations,

      // ROTEM
      rotemCtExtem: lastRecord.rotemCtExtem,
      rotemA5Extem: lastRecord.rotemA5Extem,
      rotemA5Fibtem: lastRecord.rotemA5Fibtem,
      rotemCli30: lastRecord.rotemCli30,
      rotemMcfExtem: lastRecord.rotemMcfExtem,
      rotemMcfFibtem: lastRecord.rotemMcfFibtem,
      rotemCtIntem: lastRecord.rotemCtIntem,
      rotemCtHeptem: lastRecord.rotemCtHeptem,

      // Fármacos
      inhalAgent: lastRecord.inhalAgent,
      opioidBolus: lastRecord.opioidBolus,
      opioidInfusion: lastRecord.opioidInfusion,
      hypnoticBolus: lastRecord.hypnoticBolus,
      hypnoticInfusion: lastRecord.hypnoticInfusion,
      relaxantBolus: lastRecord.relaxantBolus,
      relaxantInfusion: lastRecord.relaxantInfusion,
      lidocaineBolus: lastRecord.lidocaineBolus,
      lidocaineInfusion: lastRecord.lidocaineInfusion,
      adrenalineBolus: lastRecord.adrenalineBolus,
      adrenalineInfusion: lastRecord.adrenalineInfusion,
      dobutamine: lastRecord.dobutamine,
      dopamine: lastRecord.dopamine,
      noradrenaline: lastRecord.noradrenaline,
      phenylephrine: lastRecord.phenylephrine,
      insulinBolus: lastRecord.insulinBolus,
      insulinInfusion: lastRecord.insulinInfusion,
      furosemide: lastRecord.furosemide,
      tranexamicBolus: lastRecord.tranexamicBolus,
      tranexamicInfusion: lastRecord.tranexamicInfusion,
      calciumGluconBolus: lastRecord.calciumGluconBolus,
      calciumGluconInfusion: lastRecord.calciumGluconInfusion,
      sodiumBicarb: lastRecord.sodiumBicarb,
      antibiotics: lastRecord.antibiotics,
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
  const validMAP = records.filter((r) => r.pam).map((r) => r.pam);
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
