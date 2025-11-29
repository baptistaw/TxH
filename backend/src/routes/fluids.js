// src/routes/fluids.js

const express = require('express');
const router = express.Router();
const fluidsController = require('../controllers/fluidsController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

// Schemas de validación
const intraopPhases = [
  'INDUCCION',
  'DISECCION',
  'ANHEPATICA',
  'PRE_REPERFUSION',
  'POST_REPERFUSION',
  'FIN_VIA_BILIAR',
  'CIERRE',
];

const createFluidSchema = z.object({
  caseId: z.string().cuid(),
  phase: z.enum(intraopPhases),
  timestamp: z.string().datetime().or(z.date()),

  // Cristaloides (ml)
  plasmalyte: z.number().int().min(0).optional().nullable(),
  ringer: z.number().int().min(0).optional().nullable(),
  saline: z.number().int().min(0).optional().nullable(),
  dextrose: z.number().int().min(0).optional().nullable(),

  // Coloides (ml)
  colloids: z.number().int().min(0).optional().nullable(),
  albumin: z.number().int().min(0).optional().nullable(),

  // Hemoderivados
  redBloodCells: z.number().int().min(0).optional().nullable(), // Unidades
  plasma: z.number().int().min(0).optional().nullable(), // Unidades
  platelets: z.number().int().min(0).optional().nullable(), // Concentrados
  cryoprecip: z.number().int().min(0).optional().nullable(), // ml
  cellSaver: z.number().int().min(0).optional().nullable(), // ml
  fibrinogen: z.number().int().min(0).optional().nullable(), // gramos
  pcc: z.number().int().min(0).optional().nullable(), // Concentrado Complejo Protrombínico (unidades)
  factorVII: z.number().int().min(0).optional().nullable(), // Factor VII (miligramos)

  otherFluids: z.string().optional().nullable(),

  // Pérdidas (ml)
  insensibleLoss: z.number().int().min(0).optional().nullable(),
  ascites: z.number().int().min(0).optional().nullable(),
  suction: z.number().int().min(0).optional().nullable(),
  gauze: z.number().int().min(0).optional().nullable(),
  urine: z.number().int().min(0).optional().nullable(),
});

const updateFluidSchema = z.object({
  phase: z.enum(intraopPhases).optional(),
  timestamp: z.string().datetime().or(z.date()).optional(),

  // Cristaloides (ml)
  plasmalyte: z.number().int().min(0).optional().nullable(),
  ringer: z.number().int().min(0).optional().nullable(),
  saline: z.number().int().min(0).optional().nullable(),
  dextrose: z.number().int().min(0).optional().nullable(),

  // Coloides (ml)
  colloids: z.number().int().min(0).optional().nullable(),
  albumin: z.number().int().min(0).optional().nullable(),

  // Hemoderivados
  redBloodCells: z.number().int().min(0).optional().nullable(),
  plasma: z.number().int().min(0).optional().nullable(),
  platelets: z.number().int().min(0).optional().nullable(),
  cryoprecip: z.number().int().min(0).optional().nullable(),
  cellSaver: z.number().int().min(0).optional().nullable(),
  fibrinogen: z.number().int().min(0).optional().nullable(),
  pcc: z.number().int().min(0).optional().nullable(),
  factorVII: z.number().int().min(0).optional().nullable(),

  otherFluids: z.string().optional().nullable(),

  // Pérdidas (ml)
  insensibleLoss: z.number().int().min(0).optional().nullable(),
  ascites: z.number().int().min(0).optional().nullable(),
  suction: z.number().int().min(0).optional().nullable(),
  gauze: z.number().int().min(0).optional().nullable(),
  urine: z.number().int().min(0).optional().nullable(),
});

// Rutas
router.get(
  '/',
  authenticate,
  fluidsController.getFluidRecords
);

router.get(
  '/totals/:caseId/:phase',
  authenticate,
  fluidsController.getFluidTotals
);

router.get(
  '/:id',
  authenticate,
  fluidsController.getFluidById
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(createFluidSchema),
  fluidsController.createFluid
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(updateFluidSchema),
  fluidsController.updateFluid
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  fluidsController.deleteFluid
);

module.exports = router;
