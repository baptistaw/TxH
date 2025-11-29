// src/controllers/linesMonitoringController.js - Controladores de líneas y monitoreo
const linesMonitoringService = require('../services/linesMonitoringService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getLinesMonitoring = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const linesMonitoring = await linesMonitoringService.getLinesMonitoring(caseId);

  if (!linesMonitoring) {
    return res.status(404).json({ message: 'No se encontró registro de líneas y monitoreo' });
  }

  res.json(linesMonitoring);
});

const createLinesMonitoring = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const linesMonitoring = await linesMonitoringService.createLinesMonitoring(caseId, req.body);
  res.status(201).json(linesMonitoring);
});

const updateLinesMonitoring = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const linesMonitoring = await linesMonitoringService.updateLinesMonitoring(caseId, req.body);
  res.json(linesMonitoring);
});

const deleteLinesMonitoring = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  await linesMonitoringService.deleteLinesMonitoring(caseId);
  res.status(204).send();
});

module.exports = {
  getLinesMonitoring,
  createLinesMonitoring,
  updateLinesMonitoring,
  deleteLinesMonitoring,
};
