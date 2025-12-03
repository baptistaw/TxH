// src/routes/intraop.js

const express = require('express');
const router = express.Router();
const intraopController = require('../controllers/intraopController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

// Schemas de validación
const intraopPhases = [
  'ESTADO_BASAL',
  'INDUCCION',
  'DISECCION',
  'ANHEPATICA',
  'PRE_REPERFUSION',
  'POST_REPERFUSION',
  'VIA_BILIAR',
  'CIERRE',
  'SALIDA_BQ',
];

const createIntraopSchema = z.object({
  caseId: z.string().cuid(),
  phase: z.enum(intraopPhases),
  timestamp: z.string().datetime().or(z.date()),

  // Ventilación
  ventMode: z.string().max(30).optional().nullable(), // Catálogo dinámico: VentilationMode
  fio2: z.number().min(0).max(1).optional().nullable(), // 0-1 (ej: 0.5 = 50%)
  tidalVolume: z.number().int().min(200).max(1500).optional().nullable(),
  respRate: z.number().int().min(4).max(60).optional().nullable(),
  peep: z.number().int().min(0).max(30).optional().nullable(),
  peakPressure: z.number().int().min(0).max(100).optional().nullable(),

  // Hemodinamia básica
  heartRate: z.number().int().min(20).max(250).optional().nullable(),
  satO2: z.number().int().min(0).max(100).optional().nullable(),
  pas: z.number().int().min(40).max(300).optional().nullable(),
  pad: z.number().int().min(20).max(200).optional().nullable(),
  pam: z.number().int().min(30).max(200).optional().nullable(),
  cvp: z.number().int().min(-5).max(40).optional().nullable(),
  etCO2: z.number().int().min(10).max(100).optional().nullable(),
  temp: z.number().min(30).max(42).optional().nullable(),

  // Hemodinamia avanzada (Swan-Ganz)
  paps: z.number().int().min(10).max(150).optional().nullable(),
  papd: z.number().int().min(5).max(100).optional().nullable(),
  papm: z.number().int().min(10).max(120).optional().nullable(),
  pcwp: z.number().int().min(0).max(50).optional().nullable(),
  cardiacOutput: z.number().min(1).max(15).optional().nullable(),

  // Monitoreo avanzado
  bis: z.number().int().min(0).max(100).optional().nullable(),
  icp: z.number().int().min(0).max(100).optional().nullable(),
  svO2: z.number().int().min(0).max(100).optional().nullable(),

  // Laboratorios - Hematología
  hb: z.number().min(0).max(25).optional().nullable(),
  hto: z.number().min(0).max(70).optional().nullable(),
  platelets: z.number().min(0).max(1000).optional().nullable(),

  // Laboratorios - Coagulación
  pt: z.number().min(0).max(300).optional().nullable(),
  inr: z.number().min(0).max(20).optional().nullable(),
  fibrinogen: z.number().min(0).max(1000).optional().nullable(),
  aptt: z.number().min(0).max(300).optional().nullable(),

  // Laboratorios - Electrolitos
  sodium: z.number().min(100).max(200).optional().nullable(),
  potassium: z.number().min(1).max(10).optional().nullable(),
  ionicCalcium: z.number().min(0.5).max(3).optional().nullable(),
  magnesium: z.number().min(0.5).max(5).optional().nullable(),
  chloride: z.number().min(50).max(150).optional().nullable(),
  phosphorus: z.number().min(0).max(15).optional().nullable(),

  // Laboratorios - Gases arteriales
  pH: z.number().min(6.8).max(8).optional().nullable(),
  paO2: z.number().min(20).max(600).optional().nullable(),
  paCO2: z.number().min(10).max(150).optional().nullable(),
  hco3: z.number().min(5).max(50).optional().nullable(),
  baseExcess: z.number().min(-30).max(30).optional().nullable(),

  // Laboratorios - Gases venosos
  pvpH: z.number().min(6.8).max(8).optional().nullable(),
  pvO2: z.number().min(10).max(200).optional().nullable(),
  pvCO2: z.number().min(20).max(200).optional().nullable(),

  // Laboratorios - Función renal
  azotemia: z.number().min(0).max(300).optional().nullable(),
  creatinine: z.number().min(0).max(25).optional().nullable(),

  // Laboratorios - Función hepática
  sgot: z.number().min(0).max(10000).optional().nullable(),
  sgpt: z.number().min(0).max(10000).optional().nullable(),
  totalBili: z.number().min(0).max(100).optional().nullable(),
  directBili: z.number().min(0).max(100).optional().nullable(),
  albumin: z.number().min(0).max(10).optional().nullable(),

  // Laboratorios - Metabólicos
  glucose: z.number().min(10).max(1000).optional().nullable(),
  lactate: z.number().min(0).max(30).optional().nullable(),
  proteins: z.number().min(0).max(15).optional().nullable(),

  // ETE (Ecocardiograma Transesofágico)
  eteRightVentricle: z.string().max(100).optional().nullable(),
  eteTapse: z.string().max(50).optional().nullable(),
  eteLeftVentricle: z.string().max(100).optional().nullable(),
  eteChamberDilation: z.string().max(100).optional().nullable(),
  etePsap: z.string().max(50).optional().nullable(),
  eteThrombus: z.string().max(50).optional().nullable(),
  etePericardial: z.string().max(100).optional().nullable(),
  eteVolumeStatus: z.string().max(100).optional().nullable(),
  eteObservations: z.string().max(1000).optional().nullable(),

  // ROTEM - Parámetros completos para algoritmo de decisión
  rotemCtExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCftExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfExtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCli30: z.number().int().min(0).max(100).optional().nullable(),
  rotemCli60: z.number().int().min(0).max(100).optional().nullable(),
  rotemMl: z.number().int().min(0).max(100).optional().nullable(),
  rotemCtFibtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfFibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCtIntem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCtHeptem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Aptem: z.number().int().min(0).max(120).optional().nullable(),

  // Fármacos (registro binario)
  inhalAgent: z.string().max(30).optional().nullable(), // Catálogo dinámico
  opioidBolus: z.boolean().optional(),
  opioidInfusion: z.boolean().optional(),
  hypnoticBolus: z.boolean().optional(),
  hypnoticInfusion: z.boolean().optional(),
  relaxantBolus: z.boolean().optional(),
  relaxantInfusion: z.boolean().optional(),
  lidocaineBolus: z.boolean().optional(),
  lidocaineInfusion: z.boolean().optional(),
  adrenalineBolus: z.boolean().optional(),
  adrenalineInfusion: z.boolean().optional(),
  dobutamine: z.boolean().optional(),
  dopamine: z.boolean().optional(),
  noradrenaline: z.boolean().optional(),
  phenylephrine: z.boolean().optional(),
  insulinBolus: z.boolean().optional(),
  insulinInfusion: z.boolean().optional(),
  furosemide: z.boolean().optional(),
  tranexamicBolus: z.boolean().optional(),
  tranexamicInfusion: z.boolean().optional(),
  calciumGluconBolus: z.boolean().optional(),
  calciumGluconInfusion: z.boolean().optional(),
  sodiumBicarb: z.boolean().optional(),
  antibiotics: z.boolean().optional(),
});

const updateIntraopSchema = z.object({
  phase: z.enum(intraopPhases).optional(),
  timestamp: z.string().datetime().or(z.date()).optional(),

  // Ventilación
  ventMode: z.string().max(30).optional().nullable(), // Catálogo dinámico: VentilationMode
  fio2: z.number().min(0).max(1).optional().nullable(),
  tidalVolume: z.number().int().min(200).max(1500).optional().nullable(),
  respRate: z.number().int().min(4).max(60).optional().nullable(),
  peep: z.number().int().min(0).max(30).optional().nullable(),
  peakPressure: z.number().int().min(0).max(100).optional().nullable(),

  // Hemodinamia básica
  heartRate: z.number().int().min(20).max(250).optional().nullable(),
  satO2: z.number().int().min(0).max(100).optional().nullable(),
  pas: z.number().int().min(40).max(300).optional().nullable(),
  pad: z.number().int().min(20).max(200).optional().nullable(),
  pam: z.number().int().min(30).max(200).optional().nullable(),
  cvp: z.number().int().min(-5).max(40).optional().nullable(),
  etCO2: z.number().int().min(10).max(100).optional().nullable(),
  temp: z.number().min(30).max(42).optional().nullable(),

  // Hemodinamia avanzada (Swan-Ganz)
  paps: z.number().int().min(10).max(150).optional().nullable(),
  papd: z.number().int().min(5).max(100).optional().nullable(),
  papm: z.number().int().min(10).max(120).optional().nullable(),
  pcwp: z.number().int().min(0).max(50).optional().nullable(),
  cardiacOutput: z.number().min(1).max(15).optional().nullable(),

  // Monitoreo avanzado
  bis: z.number().int().min(0).max(100).optional().nullable(),
  icp: z.number().int().min(0).max(100).optional().nullable(),
  svO2: z.number().int().min(0).max(100).optional().nullable(),

  // Laboratorios - Hematología
  hb: z.number().min(0).max(25).optional().nullable(),
  hto: z.number().min(0).max(70).optional().nullable(),
  platelets: z.number().min(0).max(1000).optional().nullable(),

  // Laboratorios - Coagulación
  pt: z.number().min(0).max(300).optional().nullable(),
  inr: z.number().min(0).max(20).optional().nullable(),
  fibrinogen: z.number().min(0).max(1000).optional().nullable(),
  aptt: z.number().min(0).max(300).optional().nullable(),

  // Laboratorios - Electrolitos
  sodium: z.number().min(100).max(200).optional().nullable(),
  potassium: z.number().min(1).max(10).optional().nullable(),
  ionicCalcium: z.number().min(0.5).max(3).optional().nullable(),
  magnesium: z.number().min(0.5).max(5).optional().nullable(),
  chloride: z.number().min(50).max(150).optional().nullable(),
  phosphorus: z.number().min(0).max(15).optional().nullable(),

  // Laboratorios - Gases arteriales
  pH: z.number().min(6.8).max(8).optional().nullable(),
  paO2: z.number().min(20).max(600).optional().nullable(),
  paCO2: z.number().min(10).max(150).optional().nullable(),
  hco3: z.number().min(5).max(50).optional().nullable(),
  baseExcess: z.number().min(-30).max(30).optional().nullable(),

  // Laboratorios - Gases venosos
  pvpH: z.number().min(6.8).max(8).optional().nullable(),
  pvO2: z.number().min(10).max(200).optional().nullable(),
  pvCO2: z.number().min(20).max(200).optional().nullable(),

  // Laboratorios - Función renal
  azotemia: z.number().min(0).max(300).optional().nullable(),
  creatinine: z.number().min(0).max(25).optional().nullable(),

  // Laboratorios - Función hepática
  sgot: z.number().min(0).max(10000).optional().nullable(),
  sgpt: z.number().min(0).max(10000).optional().nullable(),
  totalBili: z.number().min(0).max(100).optional().nullable(),
  directBili: z.number().min(0).max(100).optional().nullable(),
  albumin: z.number().min(0).max(10).optional().nullable(),

  // Laboratorios - Metabólicos
  glucose: z.number().min(10).max(1000).optional().nullable(),
  lactate: z.number().min(0).max(30).optional().nullable(),
  proteins: z.number().min(0).max(15).optional().nullable(),

  // ETE (Ecocardiograma Transesofágico)
  eteRightVentricle: z.string().max(100).optional().nullable(),
  eteTapse: z.string().max(50).optional().nullable(),
  eteLeftVentricle: z.string().max(100).optional().nullable(),
  eteChamberDilation: z.string().max(100).optional().nullable(),
  etePsap: z.string().max(50).optional().nullable(),
  eteThrombus: z.string().max(50).optional().nullable(),
  etePericardial: z.string().max(100).optional().nullable(),
  eteVolumeStatus: z.string().max(100).optional().nullable(),
  eteObservations: z.string().max(1000).optional().nullable(),

  // ROTEM - Parámetros completos para algoritmo de decisión
  rotemCtExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCftExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfExtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCli30: z.number().int().min(0).max(100).optional().nullable(),
  rotemCli60: z.number().int().min(0).max(100).optional().nullable(),
  rotemMl: z.number().int().min(0).max(100).optional().nullable(),
  rotemCtFibtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfFibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCtIntem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCtHeptem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Aptem: z.number().int().min(0).max(120).optional().nullable(),

  // Fármacos (registro binario)
  inhalAgent: z.string().max(30).optional().nullable(), // Catálogo dinámico
  opioidBolus: z.boolean().optional(),
  opioidInfusion: z.boolean().optional(),
  hypnoticBolus: z.boolean().optional(),
  hypnoticInfusion: z.boolean().optional(),
  relaxantBolus: z.boolean().optional(),
  relaxantInfusion: z.boolean().optional(),
  lidocaineBolus: z.boolean().optional(),
  lidocaineInfusion: z.boolean().optional(),
  adrenalineBolus: z.boolean().optional(),
  adrenalineInfusion: z.boolean().optional(),
  dobutamine: z.boolean().optional(),
  dopamine: z.boolean().optional(),
  noradrenaline: z.boolean().optional(),
  phenylephrine: z.boolean().optional(),
  insulinBolus: z.boolean().optional(),
  insulinInfusion: z.boolean().optional(),
  furosemide: z.boolean().optional(),
  tranexamicBolus: z.boolean().optional(),
  tranexamicInfusion: z.boolean().optional(),
  calciumGluconBolus: z.boolean().optional(),
  calciumGluconInfusion: z.boolean().optional(),
  sodiumBicarb: z.boolean().optional(),
  antibiotics: z.boolean().optional(),
});

const duplicateSchema = z.object({
  caseId: z.string().cuid(),
  phase: z.enum(intraopPhases),
});

// Rutas
router.get(
  '/',
  authenticate,
  intraopController.getIntraopRecords
);

router.get(
  '/stats/:caseId/:phase',
  authenticate,
  intraopController.getPhaseStats
);

router.get(
  '/:id',
  authenticate,
  intraopController.getIntraopById
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(createIntraopSchema),
  intraopController.createIntraop
);

router.post(
  '/duplicate',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(duplicateSchema),
  intraopController.duplicateLastRecord
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(updateIntraopSchema),
  intraopController.updateIntraop
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  intraopController.deleteIntraop
);

module.exports = router;
