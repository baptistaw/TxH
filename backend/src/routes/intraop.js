// src/routes/intraop.js

const express = require('express');
const router = express.Router();
const intraopController = require('../controllers/intraopController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

// Schemas de validación
const intraopPhases = [
  'INDUCCION',
  'DISECCION',
  'ANHEPATICA_INICIAL',
  'PRE_REPERFUSION',
  'POST_REPERFUSION_INICIAL',
  'FIN_VIA_BILIAR',
  'CIERRE',
];

const createIntraopSchema = z.object({
  caseId: z.string().cuid(),
  phase: z.enum(intraopPhases),
  timestamp: z.string().datetime().or(z.date()),
  heartRate: z.number().int().min(20).max(250).optional().nullable(),
  sys: z.number().int().min(40).max(300).optional().nullable(),
  dia: z.number().int().min(20).max(200).optional().nullable(),
  map: z.number().int().min(30).max(200).optional().nullable(),
  cvp: z.number().int().min(-5).max(40).optional().nullable(),
  peep: z.number().int().min(0).max(30).optional().nullable(),
  fio2: z.number().int().min(21).max(100).optional().nullable(),
  vt: z.number().int().min(200).max(1500).optional().nullable(),
});

const updateIntraopSchema = z.object({
  phase: z.enum(intraopPhases).optional(),
  timestamp: z.string().datetime().or(z.date()).optional(),
  heartRate: z.number().int().min(20).max(250).optional().nullable(),
  sys: z.number().int().min(40).max(300).optional().nullable(),
  dia: z.number().int().min(20).max(200).optional().nullable(),
  map: z.number().int().min(30).max(200).optional().nullable(),
  cvp: z.number().int().min(-5).max(40).optional().nullable(),
  peep: z.number().int().min(0).max(30).optional().nullable(),
  fio2: z.number().int().min(21).max(100).optional().nullable(),
  vt: z.number().int().min(200).max(1500).optional().nullable(),
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
