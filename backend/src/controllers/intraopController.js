// src/controllers/intraopController.js

const intraopService = require('../services/intraopService');
const { asyncHandler } = require('../middlewares/errorHandler');

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
  const record = await intraopService.createIntraop(req.body);

  res.status(201).json(record);
});

/**
 * PUT /api/intraop/:id
 * Actualizar registro
 */
const updateIntraop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const record = await intraopService.updateIntraop(id, req.body);

  res.json(record);
});

/**
 * DELETE /api/intraop/:id
 * Eliminar registro
 */
const deleteIntraop = asyncHandler(async (req, res) => {
  const { id } = req.params;
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
