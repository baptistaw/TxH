// src/controllers/patientController.js - Controladores de pacientes
const patientService = require('../services/patientService');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/patients
 * Listar todos los pacientes
 */
const getAllPatients = asyncHandler(async (req, res) => {
  const { page, limit, q: search, transplanted, provider, sex, admissionDateFrom, admissionDateTo, myPatients } = req.query;
  const userId = req.user.id;

  // Si myPatients=true, solo muestra pacientes donde el clínico está asignado
  const filterByClinicianId = myPatients === 'true' ? userId : undefined;

  const result = await patientService.getAllPatients({
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
 * Obtener un paciente por CI
 */
const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await patientService.getPatientById(id);

  res.json(patient);
});

/**
 * POST /api/patients
 * Crear nuevo paciente
 */
const createPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);

  res.status(201).json(patient);
});

/**
 * PUT /api/patients/:id
 * Actualizar paciente
 */
const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await patientService.updatePatient(id, req.body);

  res.json(patient);
});

/**
 * DELETE /api/patients/:id
 * Eliminar paciente
 */
const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await patientService.deletePatient(id);

  res.status(204).send();
});

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
