// src/controllers/intraopController.js

const intraopService = require('../services/intraopService');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const { ROLES } = require('../middlewares/auth');

/**
 * Helper: Verifica si el usuario tiene permiso para modificar un caso
 * @param {string} caseId - ID del caso
 * @param {number} userId - ID del usuario
 * @param {string} userRole - Rol del usuario
 * @returns {boolean} true si tiene permiso
 */
async function canModifyCase(caseId, userId, userRole) {
  // Admin puede modificar cualquier caso
  if (userRole === 'ADMIN') {
    return true;
  }

  // Solo anestesiólogos pueden modificar (aunque estén en el equipo)
  if (userRole !== 'ANESTESIOLOGO') {
    return false;
  }

  // Verificar si el anestesiólogo está asignado al equipo del caso
  const teamAssignment = await prisma.teamAssignment.findFirst({
    where: {
      caseId,
      clinicianId: userId,
    },
  });

  return !!teamAssignment;
}

/**
 * GET /api/intraop?caseId=xxx&phase=xxx
 * Listar registros intraoperatorios
 */
const getIntraopRecords = asyncHandler(async (req, res) => {
  const { caseId, phase } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'caseId es requerido' });
  }

  const records = await intraopService.getIntraopRecords(caseId, { phase });

  res.json({ data: records });
});

/**
 * GET /api/intraop/:id
 * Obtener registro por ID
 */
const getIntraopById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const record = await intraopService.getIntraopById(id);

  res.json(record);
});

/**
 * POST /api/intraop
 * Crear nuevo registro
 */
const createIntraop = asyncHandler(async (req, res) => {
  const { caseId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Verificar permisos para modificar el caso
  const hasPermission = await canModifyCase(caseId, userId, userRole);
  if (!hasPermission) {
    return res.status(403).json({
      error: 'No tienes permiso para agregar registros a este caso. Solo los miembros del equipo pueden hacerlo.'
    });
  }

  const record = await intraopService.createIntraop(req.body);

  res.status(201).json(record);
});

/**
 * PUT /api/intraop/:id
 * Actualizar registro
 */
const updateIntraop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Obtener el registro para saber a qué caso pertenece
  const existingRecord = await prisma.intraopRecord.findUnique({
    where: { id },
    select: { caseId: true },
  });

  if (!existingRecord) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  // Verificar permisos para modificar el caso
  const hasPermission = await canModifyCase(existingRecord.caseId, userId, userRole);
  if (!hasPermission) {
    return res.status(403).json({
      error: 'No tienes permiso para editar este registro. Solo los miembros del equipo pueden hacerlo.'
    });
  }

  const record = await intraopService.updateIntraop(id, req.body);

  res.json(record);
});

/**
 * DELETE /api/intraop/:id
 * Eliminar registro
 */
const deleteIntraop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Obtener el registro para saber a qué caso pertenece
  const existingRecord = await prisma.intraopRecord.findUnique({
    where: { id },
    select: { caseId: true },
  });

  if (!existingRecord) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  // Verificar permisos para modificar el caso
  const hasPermission = await canModifyCase(existingRecord.caseId, userId, userRole);
  if (!hasPermission) {
    return res.status(403).json({
      error: 'No tienes permiso para eliminar este registro. Solo los miembros del equipo pueden hacerlo.'
    });
  }

  const result = await intraopService.deleteIntraop(id);

  res.json(result);
});

/**
 * POST /api/intraop/duplicate
 * Duplicar última fila de una fase
 */
const duplicateLastRecord = asyncHandler(async (req, res) => {
  const { caseId, phase } = req.body;

  if (!caseId || !phase) {
    return res.status(400).json({ error: 'caseId y phase son requeridos' });
  }

  const record = await intraopService.duplicateLastRecord(caseId, phase);

  res.status(201).json(record);
});

/**
 * GET /api/intraop/stats/:caseId/:phase
 * Obtener estadísticas de una fase
 */
const getPhaseStats = asyncHandler(async (req, res) => {
  const { caseId, phase } = req.params;
  const stats = await intraopService.getPhaseStats(caseId, phase);

  if (!stats) {
    return res.json({ message: 'No hay datos para esta fase' });
  }

  res.json(stats);
});

module.exports = {
  getIntraopRecords,
  getIntraopById,
  createIntraop,
  updateIntraop,
  deleteIntraop,
  duplicateLastRecord,
  getPhaseStats,
};
