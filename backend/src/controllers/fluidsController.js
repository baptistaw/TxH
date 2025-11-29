// src/controllers/fluidsController.js

const fluidsService = require('../services/fluidsService');
const caseService = require('../services/caseService');
const logger = require('../lib/logger');

/**
 * Listar registros de fluidos
 * GET /api/fluids?caseId=xxx&phase=xxx
 */
async function getFluidRecords(req, res, next) {
  try {
    const { caseId, phase } = req.query;

    if (!caseId) {
      return res.status(400).json({
        error: 'caseId es requerido',
      });
    }

    const records = await fluidsService.getFluidRecords(caseId, { phase });

    res.json({
      data: records,
    });
  } catch (error) {
    logger.error('Error al obtener registros de fluidos', { error: error.message });
    next(error);
  }
}

/**
 * Obtener registro por ID
 * GET /api/fluids/:id
 */
async function getFluidById(req, res, next) {
  try {
    const { id } = req.params;

    const record = await fluidsService.getFluidById(id);

    res.json(record);
  } catch (error) {
    logger.error('Error al obtener registro de fluidos', { error: error.message });
    next(error);
  }
}

/**
 * Crear registro de fluidos
 * POST /api/fluids
 */
async function createFluid(req, res, next) {
  try {
    const data = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar permisos
    if (userRole !== 'ADMIN') {
      // Solo admin o anestesiólogos asignados al equipo pueden crear
      if (userRole !== 'ANESTESIOLOGO') {
        return res.status(403).json({
          error: 'No tienes permiso para crear registros de fluidos. Solo los anestesiólogos asignados pueden hacerlo.'
        });
      }

      // Verificar si el anestesiólogo está en el equipo
      const team = await caseService.getCaseTeam(data.caseId);
      const isInTeam = team.some(member => member.clinicianId === userId);

      if (!isInTeam) {
        return res.status(403).json({
          error: 'No tienes permiso para crear registros de fluidos en este caso. Solo los anestesiólogos asignados a este equipo pueden hacerlo.'
        });
      }
    }

    const record = await fluidsService.createFluid(data);

    logger.info('Registro de fluidos creado', { id: record.id, caseId: data.caseId });

    res.status(201).json(record);
  } catch (error) {
    logger.error('Error al crear registro de fluidos', { error: error.message });
    next(error);
  }
}

/**
 * Actualizar registro de fluidos
 * PUT /api/fluids/:id
 */
async function updateFluid(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Obtener el registro para obtener el caseId
    const existingRecord = await fluidsService.getFluidById(id);

    // Verificar permisos
    if (userRole !== 'ADMIN') {
      // Solo admin o anestesiólogos asignados al equipo pueden editar
      if (userRole !== 'ANESTESIOLOGO') {
        return res.status(403).json({
          error: 'No tienes permiso para editar registros de fluidos. Solo los anestesiólogos asignados pueden hacerlo.'
        });
      }

      // Verificar si el anestesiólogo está en el equipo
      const team = await caseService.getCaseTeam(existingRecord.caseId);
      const isInTeam = team.some(member => member.clinicianId === userId);

      if (!isInTeam) {
        return res.status(403).json({
          error: 'No tienes permiso para editar registros de fluidos en este caso. Solo los anestesiólogos asignados a este equipo pueden hacerlo.'
        });
      }
    }

    const updated = await fluidsService.updateFluid(id, data);

    logger.info('Registro de fluidos actualizado', { id });

    res.json(updated);
  } catch (error) {
    logger.error('Error al actualizar registro de fluidos', { error: error.message });
    next(error);
  }
}

/**
 * Eliminar registro de fluidos
 * DELETE /api/fluids/:id
 */
async function deleteFluid(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Obtener el registro para obtener el caseId
    const existingRecord = await fluidsService.getFluidById(id);

    // Verificar permisos
    if (userRole !== 'ADMIN') {
      // Solo admin o anestesiólogos asignados al equipo pueden eliminar
      if (userRole !== 'ANESTESIOLOGO') {
        return res.status(403).json({
          error: 'No tienes permiso para eliminar registros de fluidos. Solo los anestesiólogos asignados pueden hacerlo.'
        });
      }

      // Verificar si el anestesiólogo está en el equipo
      const team = await caseService.getCaseTeam(existingRecord.caseId);
      const isInTeam = team.some(member => member.clinicianId === userId);

      if (!isInTeam) {
        return res.status(403).json({
          error: 'No tienes permiso para eliminar registros de fluidos en este caso. Solo los anestesiólogos asignados a este equipo pueden hacerlo.'
        });
      }
    }

    const result = await fluidsService.deleteFluid(id);

    logger.info('Registro de fluidos eliminado', { id });

    res.json(result);
  } catch (error) {
    logger.error('Error al eliminar registro de fluidos', { error: error.message });
    next(error);
  }
}

/**
 * Obtener totales de fluidos por fase
 * GET /api/fluids/totals/:caseId/:phase
 */
async function getFluidTotals(req, res, next) {
  try {
    const { caseId, phase } = req.params;

    const totals = await fluidsService.getFluidTotalsByPhase(caseId, phase);

    if (!totals) {
      return res.status(404).json({
        error: 'No hay registros de fluidos para esta fase',
      });
    }

    res.json(totals);
  } catch (error) {
    logger.error('Error al obtener totales de fluidos', { error: error.message });
    next(error);
  }
}

module.exports = {
  getFluidRecords,
  getFluidById,
  createFluid,
  updateFluid,
  deleteFluid,
  getFluidTotals,
};
