// src/routes/patients.js - Rutas de pacientes
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');
const { z } = require('zod');

// Schema de validación para crear paciente
const createPatientSchema = z.object({
  id: schemas.ci,
  ciRaw: z.string().optional(),
  name: z.string().min(1),
  fnr: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  sex: z.enum(['M', 'F', 'O']).optional(),
  provider: z.enum(['ASSE', 'FEMI', 'CASMU', 'MP', 'OTRA']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bloodGroup: z.string().max(5).optional(),
  admissionDate: z.coerce.date().optional(),
  transplanted: z.boolean().optional(),
  observations: z.string().optional(),
});

// Schema de validación para actualizar paciente
const updatePatientSchema = createPatientSchema.partial().omit({ id: true });

// Schema de query params
const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
});

/**
 * GET /api/patients
 * Listar pacientes (requiere autenticación)
 */
router.get(
  '/',
  authenticate,
  validate(querySchema, 'query'),
  patientController.getAllPatients
);

/**
 * GET /api/patients/:id
 * Obtener paciente por CI (requiere autenticación)
 */
router.get('/:id', authenticate, patientController.getPatientById);

/**
 * POST /api/patients
 * Crear paciente (solo admin y anestesiólogo)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(createPatientSchema),
  patientController.createPatient
);

/**
 * PUT /api/patients/:id
 * Actualizar paciente (solo admin y anestesiólogo)
 */
router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(updatePatientSchema),
  patientController.updatePatient
);

/**
 * DELETE /api/patients/:id
 * Eliminar paciente (solo admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  patientController.deletePatient
);

module.exports = router;
