// src/controllers/patientController.js - Controladores de pacientes
const patientService = require('../services/patientService');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/patients
 * Listar todos los pacientes (filtrado por organización)
 */
const getAllPatients = asyncHandler(async (req, res) => {
  const { page, limit, q: search, transplanted, provider, sex, admissionDateFrom, admissionDateTo, myPatients } = req.query;
  const userId = req.user.id;
  const { organizationId } = req; // Multi-tenancy: inyectado por tenantMiddleware

  // Si myPatients=true, solo muestra pacientes donde el clínico está asignado
  const filterByClinicianId = myPatients === 'true' ? userId : undefined;

  const result = await patientService.getAllPatients({
    organizationId, // Multi-tenancy filter
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    search,
    transplanted: transplanted ? transplanted === 'true' : undefined,
    provider,
    sex,
    admissionDateFrom,
    admissionDateTo,
    clinicianId: filterByClinicianId,
  });

  res.json(result);
});

/**
 * GET /api/patients/:id
 * Obtener un paciente por CI (filtrado por organización)
 */
const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req; // Multi-tenancy

  const patient = await patientService.getPatientById(id, organizationId);

  res.json(patient);
});

/**
 * POST /api/patients
 * Crear nuevo paciente (asignado a la organización actual)
 */
const createPatient = asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy

  const patient = await patientService.createPatient(req.body, organizationId);

  res.status(201).json(patient);
});

/**
 * PUT /api/patients/:id
 * Actualizar paciente (verificando organización)
 */
const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req; // Multi-tenancy

  const patient = await patientService.updatePatient(id, req.body, organizationId);

  res.json(patient);
});

/**
 * DELETE /api/patients/:id
 * Eliminar paciente (verificando organización)
 */
const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req; // Multi-tenancy

  await patientService.deletePatient(id, organizationId);

  res.status(204).send();
});

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
