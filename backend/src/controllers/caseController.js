// src/controllers/caseController.js - Controladores de casos
const caseService = require('../services/caseService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getAllCases = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    q: search,
    patientId,
    startDate,
    endDate,
    transplantDateFrom,
    transplantDateTo,
    etiology,
    sex,
    isRetransplant,
    isHepatoRenal,
    optimalDonor,
    myPatients,
    clinicianId,
    dataSource
  } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { organizationId } = req; // Multi-tenancy

  // Nuevo sistema de permisos:
  // - Admin ve todos los casos siempre
  // - Anestesista ve todos los casos por defecto
  // - Si myPatients=true, solo muestra casos donde está asignado
  // - Si se especifica clinicianId como filtro, se aplica ese filtro
  const filterByClinicianId = myPatients === 'true' ? userId : (clinicianId ? parseInt(clinicianId) : undefined);

  const result = await caseService.getAllCases({
    organizationId, // Multi-tenancy filter
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    search,
    patientId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    transplantDateFrom: transplantDateFrom ? new Date(transplantDateFrom) : undefined,
    transplantDateTo: transplantDateTo ? new Date(transplantDateTo) : undefined,
    etiology,
    sex,
    isRetransplant: isRetransplant ? isRetransplant === 'true' : undefined,
    isHepatoRenal: isHepatoRenal ? isHepatoRenal === 'true' : undefined,
    optimalDonor: optimalDonor ? optimalDonor === 'true' : undefined,
    clinicianId: filterByClinicianId,
    dataSource,
  });
  res.json(result);
});

const getCaseById = asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy
  const transplantCase = await caseService.getCaseById(req.params.id, organizationId);
  res.json(transplantCase);
});

const createCase = asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy
  const transplantCase = await caseService.createCase(req.body, organizationId);
  res.status(201).json(transplantCase);
});

const updateCase = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const caseId = req.params.id;
  const { organizationId } = req; // Multi-tenancy

  console.log('🔐 PERMISSION CHECK - updateCase');
  console.log(`   User ID: ${userId}`);
  console.log(`   User Role: ${userRole}`);
  console.log(`   Case ID: ${caseId}`);

  // Verificar permisos
  if (userRole !== 'ADMIN') {
    console.log('   ℹ️  User is NOT ADMIN - checking role and team membership...');

    // Solo admin o anestesiólogos asignados al equipo pueden editar
    if (userRole !== 'ANESTESIOLOGO') {
      console.log('   ❌ PERMISSION DENIED - user is not ANESTESIOLOGO or ADMIN');
      return res.status(403).json({
        error: 'No tienes permiso para editar este caso. Solo los anestesiólogos asignados pueden editarlo.'
      });
    }

    // Verificar si el anestesiólogo está en el equipo
    const team = await caseService.getCaseTeam(caseId);
    console.log(`   Team members: ${JSON.stringify(team.map(m => ({ id: m.clinicianId, role: m.role })))}`);

    const isInTeam = team.some(member => member.clinicianId === userId);
    console.log(`   Is user in team? ${isInTeam}`);

    if (!isInTeam) {
      console.log('   ❌ PERMISSION DENIED - anestesiólogo not in team');
      return res.status(403).json({
        error: 'No tienes permiso para editar este caso. Solo los anestesiólogos asignados a este equipo pueden editarlo.'
      });
    }

    console.log('   ✅ Permission granted - user is ANESTESIOLOGO and in team');
  } else {
    console.log('   ✅ Permission granted - user is ADMIN');
  }

  const transplantCase = await caseService.updateCase(caseId, req.body, organizationId);
  res.json(transplantCase);
});

const deleteCase = asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy
  await caseService.deleteCase(req.params.id, organizationId);
  res.status(204).send();
});

const getCaseTeam = asyncHandler(async (req, res) => {
  const team = await caseService.getCaseTeam(req.params.id);
  res.json(team);
});

const getCasePreop = asyncHandler(async (req, res) => {
  const preop = await caseService.getCasePreop(req.params.id);
  res.json(preop);
});

const addTeamMember = asyncHandler(async (req, res) => {
  const { id: caseId } = req.params;
  const { clinicianId, role } = req.body;

  const teamMember = await caseService.addTeamMember(caseId, {
    clinicianId: parseInt(clinicianId),
    role,
  });

  res.status(201).json(teamMember);
});

const removeTeamMember = asyncHandler(async (req, res) => {
  const { teamAssignmentId } = req.params;

  await caseService.removeTeamMember(teamAssignmentId);

  res.status(204).send();
});

const getCaseIntraop = asyncHandler(async (req, res) => {
  const intraopRecords = await caseService.getCaseIntraop(req.params.id);
  res.json(intraopRecords);
});

const getCaseFluids = asyncHandler(async (req, res) => {
  const fluidsRecords = await caseService.getCaseFluids(req.params.id);
  res.json(fluidsRecords);
});

module.exports = {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  getCaseTeam,
  getCasePreop,
  getCaseIntraop,
  getCaseFluids,
  addTeamMember,
  removeTeamMember,
};
