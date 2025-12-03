// src/routes/patients.js - Rutas de pacientes
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { validate, schemas } = require('../middlewares/validate');
const { z } = require('zod');

// Schema de validación para crear paciente
// NOTA: provider y sex ahora son catálogos dinámicos, por lo que aceptamos cualquier string
const createPatientSchema = z.object({
  id: schemas.ci,
  ciRaw: z.string().optional(),
  name: z.string().min(1),
  fnr: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  sex: z.string().max(10).optional(), // Catálogo dinámico
  provider: z.string().max(50).optional(), // Catálogo dinámico
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
  // Filtros avanzados
  transplanted: z.enum(['true', 'false']).optional(),
  provider: z.string().max(50).optional(), // Catálogo dinámico
  sex: z.string().max(10).optional(), // Catálogo dinámico
  admissionDateFrom: z.string().optional(),
  admissionDateTo: z.string().optional(),
  myPatients: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/patients
 * Listar pacientes (requiere autenticación y organización)
 */
router.get(
  '/',
  authenticate,
  tenantMiddleware, // Multi-tenancy: inyecta organizationId
  validate(querySchema, 'query'),
  patientController.getAllPatients
);

/**
 * GET /api/patients/:id
 * Obtener paciente por CI (requiere autenticación y organización)
 */
router.get('/:id', authenticate, tenantMiddleware, patientController.getPatientById);

/**
 * POST /api/patients
 * Crear paciente (solo admin y anestesiólogo, asignado a la organización)
 */
router.post(
  '/',
  authenticate,
  tenantMiddleware, // Multi-tenancy
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(createPatientSchema),
  patientController.createPatient
);

/**
 * PUT /api/patients/:id
 * Actualizar paciente (solo admin y anestesiólogo, verificando organización)
 */
router.put(
  '/:id',
  authenticate,
  tenantMiddleware, // Multi-tenancy
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  validate(updatePatientSchema),
  patientController.updatePatient
);

/**
 * DELETE /api/patients/:id
 * Eliminar paciente (solo admin, verificando organización)
 */
router.delete(
  '/:id',
  authenticate,
  tenantMiddleware, // Multi-tenancy
  authorize(ROLES.ADMIN),
  patientController.deletePatient
);

module.exports = router;
